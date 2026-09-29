import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authorizeApi } from "@/lib/auth";
import { ROLES_GESTIONAR_V2 } from "@/lib/gratuidadV2/permisos";
import { nivelDeCurso } from "@/lib/gratuidadV2/cursos";
import type { TituloCursoV2, TituloV2 } from "@/lib/types/gratuidadV2";

interface LibroV1 {
  titulo: string;
  isbn: string | null;
  editorial: string | null;
  asignatura: string | null;
  nivel: string | null;
  precio: number | null;
}

function normIsbn(isbn: string | null): string {
  return (isbn ?? "").replace(/[\s-]/g, "");
}

/** Same book = same ISBN, or same title when there is no ISBN. */
function clave(titulo: string, isbn: string | null): string {
  const i = normIsbn(isbn);
  return i ? `isbn:${i}` : `titulo:${titulo.trim().toLowerCase()}`;
}

/**
 * One-off copy of the active v1 catalogue (libros_catalogo) into gplv2_titulos.
 * Titles that already exist are skipped. The v1 level ("1º ESO") becomes a lot
 * with every group of that level ("1º ESO A", "1º ESO B"...).
 */
export async function POST() {
  const auth = await authorizeApi(ROLES_GESTIONAR_V2);
  if (!auth.ok) return auth.response;
  const supabase = await createClient();

  const [{ data: v1, error: e1 }, { data: existentes, error: e2 }, { data: cursos, error: e3 }] = await Promise.all([
    supabase.from("libros_catalogo").select("titulo, isbn, editorial, asignatura, nivel, precio").eq("activo", true),
    supabase.from("gplv2_titulos").select("titulo, isbn"),
    supabase.from("cursos").select("nombre").order("nombre"),
  ]);
  const err = e1 ?? e2 ?? e3;
  if (err) return NextResponse.json({ error: err.message }, { status: 500 });

  const yaExisten = new Set((existentes ?? []).map((t: { titulo: string; isbn: string | null }) => clave(t.titulo, t.isbn)));

  // Merge v1 rows of the same book (it may appear once per level)
  const nuevos = new Map<string, { libro: LibroV1; niveles: Set<string> }>();
  let omitidos = 0;
  for (const l of (v1 ?? []) as LibroV1[]) {
    const k = clave(l.titulo, l.isbn);
    if (yaExisten.has(k)) { omitidos++; continue; }
    const entry = nuevos.get(k) ?? { libro: l, niveles: new Set<string>() };
    if (l.nivel) entry.niveles.add(l.nivel);
    nuevos.set(k, entry);
  }

  if (nuevos.size === 0) {
    return NextResponse.json({ importados: 0, omitidos, titulos: [], lotes: [] });
  }

  const entries = [...nuevos.values()];
  const { data: insertados, error: eIns } = await supabase
    .from("gplv2_titulos")
    .insert(entries.map(({ libro }) => ({
      titulo: libro.titulo.trim(),
      isbn: normIsbn(libro.isbn) || null,
      editorial: libro.editorial?.trim() || null,
      asignatura: libro.asignatura?.trim() || null,
      precio: libro.precio,
    })))
    .select();
  if (eIns || !insertados) return NextResponse.json({ error: eIns?.message ?? "Error al importar" }, { status: 500 });

  // PostgREST returns inserted rows in the same order as the payload
  const nombresCursos = (cursos ?? []).map((c: { nombre: string }) => c.nombre);
  const lotes: { titulo_id: string; curso: string }[] = [];
  (insertados as TituloV2[]).forEach((t, i) => {
    const niveles = entries[i].niveles;
    for (const curso of nombresCursos) {
      if (niveles.has(nivelDeCurso(curso))) lotes.push({ titulo_id: t.id, curso });
    }
  });

  let lotesInsertados: TituloCursoV2[] = [];
  if (lotes.length > 0) {
    const { data, error: eLot } = await supabase.from("gplv2_titulo_cursos").insert(lotes).select();
    if (eLot) return NextResponse.json({ error: `Títulos importados, pero falló la asignación de lotes: ${eLot.message}` }, { status: 500 });
    lotesInsertados = (data ?? []) as TituloCursoV2[];
  }

  return NextResponse.json({
    importados: insertados.length,
    omitidos,
    titulos: insertados,
    lotes: lotesInsertados,
  });
}

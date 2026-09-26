import { createClient } from "@/lib/supabase/server";
import { CatalogoLibrosClient } from "./CatalogoLibrosClient";

export const metadata = { title: "Inventario de libros" };
import type { LibroCatalogo, PrestamoLibro } from "@/lib/types";
import { nowMadridParts } from "@/lib/dates";
import { requireRole } from "@/lib/auth";

export default async function CatalogoLibrosPage() {
  await requireRole(["Admin", "Directiva"], "/gratuidad-libros");
  const supabase = await createClient();

  const now = nowMadridParts();
  const fallbackYear = now.month >= 9 ? now.year : now.year - 1;
  const fallbackCurso = `${fallbackYear}-${fallbackYear + 1}`;

  const { data: cursoConfigData } = await supabase
    .from("config_intranet")
    .select("valor")
    .eq("clave", "curso_escolar_activo")
    .single();
  const cursoEscolarActual = (cursoConfigData as { valor?: string } | null)?.valor ?? fallbackCurso;

  const [{ data: libros }, { data: prestamosData }] = await Promise.all([
    supabase
      .from("libros_catalogo")
      .select("*")
      .order("nivel")
      .order("asignatura")
      .order("titulo"),

    supabase
      .from("prestamos_libros")
      .select("id, libro_id, alumno_id, alumno_nombre, alumno_grupo, num_ejemplar, fecha_prestamo, entregado_por, devuelto_por, curso_escolar, fecha_devolucion, estado_devolucion, observaciones, created_at")
      .eq("curso_escolar", cursoEscolarActual)
      .is("fecha_devolucion", null),
  ]);

  return (
    <CatalogoLibrosClient
      libros={(libros ?? []) as LibroCatalogo[]}
      prestamos={(prestamosData ?? []) as PrestamoLibro[]}
    />
  );
}

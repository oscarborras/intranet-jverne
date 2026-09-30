import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { ROLES_GESTIONAR_V2 } from "@/lib/gratuidadV2/permisos";
import { resumenLote } from "@/lib/gratuidadV2/cursos";
import type { PlantillaEtiqueta, TituloCursoV2 } from "@/lib/types/gratuidadV2";
import { EtiquetasClient, type TituloEtiqueta } from "./EtiquetasClient";

export const metadata = { title: "Etiquetas · Gratuidad v2" };

interface Props {
  searchParams: Promise<{ titulo?: string; desde?: string; hasta?: string; codigos?: string }>;
}

export default async function EtiquetasV2Page({ searchParams }: Props) {
  await requireRole(ROLES_GESTIONAR_V2, "/gratuidad-libros-v2");
  const params = await searchParams;
  const supabase = await createClient();

  const [{ data: plantillas }, { data: titulos }, { data: lotes }, { data: cursos }, { data: cursoEscolar }] = await Promise.all([
    supabase.from("gplv2_plantillas_etiquetas").select("*").eq("activo", true).order("tipo").order("nombre"),
    supabase.from("gplv2_titulos").select("id, titulo").order("titulo"),
    supabase.from("gplv2_titulo_cursos").select("*"),
    supabase.from("cursos").select("nombre").order("nombre"),
    supabase.rpc("gplv2_curso_escolar_actual"),
  ]);

  const nombresCursos = (cursos ?? []).map((c: { nombre: string }) => c.nombre);
  const lotesPorTitulo: Record<string, string[]> = {};
  for (const l of (lotes ?? []) as TituloCursoV2[]) (lotesPorTitulo[l.titulo_id] ??= []).push(l.curso);

  const titulosEtiqueta: TituloEtiqueta[] = ((titulos ?? []) as { id: string; titulo: string }[]).map((t) => ({
    id: t.id,
    titulo: t.titulo,
    curso: resumenLote(lotesPorTitulo[t.id] ?? [], nombresCursos),
    cursos: lotesPorTitulo[t.id] ?? [],
  }));

  return (
    <EtiquetasClient
      plantillas={(plantillas ?? []) as PlantillaEtiqueta[]}
      titulos={titulosEtiqueta}
      cursoEscolar={(cursoEscolar as string | null) ?? ""}
      inicial={{
        titulo: params.titulo ?? "",
        desde: params.desde ?? "",
        hasta: params.hasta ?? "",
        codigos: params.codigos ?? "",
      }}
    />
  );
}

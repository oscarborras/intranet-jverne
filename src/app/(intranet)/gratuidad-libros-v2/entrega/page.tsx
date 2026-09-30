import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { ROLES_OPERAR_V2 } from "@/lib/gratuidadV2/permisos";
import type { TituloCursoV2 } from "@/lib/types/gratuidadV2";
import { EntregaClient, type TituloLote } from "./EntregaClient";

export const metadata = { title: "Entrega · Gratuidad v2" };

interface Props {
  searchParams: Promise<{ grupo?: string; alumno?: string }>;
}

export default async function EntregaV2Page({ searchParams }: Props) {
  const { user } = await requireRole(ROLES_OPERAR_V2);
  const params = await searchParams;
  const supabase = await createClient();

  const [{ data: cursosGratuidad }, { data: titulos }, { data: lotes }, { data: cursoEscolar }, { data: profesor }] = await Promise.all([
    supabase.from("cursos").select("nombre").eq("gratuidad", true).order("nombre"),
    supabase.from("gplv2_titulos").select("id, titulo, asignatura, diversificacion, activo").order("titulo"),
    supabase.from("gplv2_titulo_cursos").select("*"),
    supabase.rpc("gplv2_curso_escolar_actual"),
    supabase.from("profesores").select("profesor").ilike("email", user.email ?? "").maybeSingle(),
  ]);

  let grupos = (cursosGratuidad ?? []).map((c: { nombre: string }) => c.nombre);
  if (grupos.length === 0) {
    const { data: todos } = await supabase.from("cursos").select("nombre").order("nombre");
    grupos = (todos ?? []).map((c: { nombre: string }) => c.nombre);
  }

  // Lot of each group: active titles assigned to it
  type TituloRow = Omit<TituloLote, "optativo"> & { activo: boolean };
  const todos = (titulos ?? []) as TituloRow[];
  // Every Diversificación title (also archived ones: a student may still hold a copy)
  const titulosDiversificacion = todos.filter((t) => t.diversificacion).map((t) => t.id);
  // Only active titles make up the lots
  const titulosById = new Map(
    todos.filter((t) => t.activo).map(({ activo: _activo, ...t }) => [t.id, t]),
  );
  const lotePorGrupo: Record<string, TituloLote[]> = {};
  for (const l of (lotes ?? []) as TituloCursoV2[]) {
    const t = titulosById.get(l.titulo_id);
    if (t) (lotePorGrupo[l.curso] ??= []).push({ ...t, optativo: l.optativo });
  }
  // Compulsory titles first, then optional ones, each alphabetically
  Object.values(lotePorGrupo).forEach((list) =>
    list.sort((a, b) => Number(a.optativo) - Number(b.optativo) || a.titulo.localeCompare(b.titulo, "es")));

  return (
    <EntregaClient
      grupos={grupos}
      lotePorGrupo={lotePorGrupo}
      titulosDiversificacion={titulosDiversificacion}
      cursoEscolar={(cursoEscolar as string | null) ?? ""}
      profesorNombre={(profesor as { profesor: string } | null)?.profesor ?? user.email ?? ""}
      inicial={{ grupo: params.grupo ?? "", alumno: params.alumno ?? "" }}
    />
  );
}

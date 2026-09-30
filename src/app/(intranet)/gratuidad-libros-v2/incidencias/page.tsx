import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { ROLES_GESTIONAR_V2 } from "@/lib/gratuidadV2/permisos";
import type { IncidenciaListadoV2 } from "./IncidenciasClient";
import { IncidenciasClient } from "./IncidenciasClient";

export const metadata = { title: "Incidencias · Gratuidad v2" };

export default async function IncidenciasV2Page() {
  await requireRole(ROLES_GESTIONAR_V2, "/gratuidad-libros-v2");
  const supabase = await createClient();

  const [{ data: incidencias }, { data: cursoEscolar }] = await Promise.all([
    supabase
      .from("gplv2_incidencias")
      .select("*, ejemplar:gplv2_ejemplares(codigo, titulo:gplv2_titulos(titulo))")
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase.rpc("gplv2_curso_escolar_actual"),
  ]);

  return (
    <IncidenciasClient
      incidencias={(incidencias ?? []) as unknown as IncidenciaListadoV2[]}
      cursoEscolar={(cursoEscolar as string | null) ?? ""}
    />
  );
}

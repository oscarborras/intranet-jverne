import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { ROLES_GESTIONAR_V2 } from "@/lib/gratuidadV2/permisos";
import type { CierreCursoV2, ResumenCierreV2 } from "@/lib/types/gratuidadV2";
import { CursoEscolarClient } from "./CursoEscolarClient";

export const metadata = { title: "Curso escolar · Gratuidad v2" };

export default async function CursoEscolarV2Page() {
  await requireRole(ROLES_GESTIONAR_V2, "/gratuidad-libros-v2");
  const supabase = await createClient();

  const [{ data: resumen }, { data: cierres }, { data: config }] = await Promise.all([
    supabase.rpc("gplv2_resumen_cierre"),
    supabase
      .from("gplv2_cierres_curso")
      .select("id, curso_escolar, nuevo_curso, cerrado_at, cerrado_por, incidencias_bajas, resumen, profesor:profesores(profesor)")
      .order("cerrado_at", { ascending: false }),
    supabase.from("config_intranet").select("valor").eq("clave", "gplv2_curso_escolar_activo").maybeSingle(),
  ]);

  return (
    <CursoEscolarClient
      resumen={resumen as ResumenCierreV2}
      cierres={(cierres ?? []) as unknown as (CierreCursoV2 & { profesor: { profesor: string } | null })[]}
      // No config key yet: the year still changes automatically on 1 September
      cursoFijado={Boolean((config as { valor: string } | null)?.valor)}
    />
  );
}

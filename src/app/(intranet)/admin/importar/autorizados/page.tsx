import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import type { AlumnoParaEmparejar } from "@/lib/import/autorizados";
import { ImportarAutorizadosClient } from "./ImportarAutorizadosClient";

export const metadata = { title: "Importar Autorizados" };

export default async function ImportarAutorizadosPage() {
  await requireRole(["Admin"]);

  const admin = createAdminClient();

  const alumnos: AlumnoParaEmparejar[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin
      .from("alumnos")
      .select("id, alumno, unidad, edad_matricula, estado_matricula")
      .order("alumno")
      .range(from, from + 999);
    if (error) break;
    const filas = (data ?? []) as AlumnoParaEmparejar[];
    alumnos.push(...filas);
    if (filas.length < 1000) break;
  }

  const [{ count: total }, { count: manuales }, { data: configRow }] = await Promise.all([
    admin.from("autorizados_recogida").select("id", { count: "exact", head: true }),
    admin.from("autorizados_recogida").select("id", { count: "exact", head: true }).eq("origen", "manual"),
    admin.from("config_intranet").select("valor").eq("clave", "ultima_importacion_autorizados").maybeSingle(),
  ]);

  return (
    <ImportarAutorizadosClient
      alumnos={alumnos}
      totalActual={total ?? 0}
      manualesActual={manuales ?? 0}
      ultimaImportacion={(configRow as { valor?: string } | null)?.valor || null}
    />
  );
}

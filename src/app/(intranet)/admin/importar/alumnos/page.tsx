import { createAdminClient } from "@/lib/supabase/admin";
import { ImportarAlumnosClient } from "./ImportarAlumnosClient";
import type { AlumnoDbRow } from "@/lib/import/alumnos";
import { requireRole } from "@/lib/auth";

export const metadata = { title: "Importar Alumnos" };

const COLUMNAS_ALUMNO = "id, alumno, nie, estado_matricula, unidad, primer_apellido, segundo_apellido, nombre, sexo, email_personal, tutor1_nombre, tutor1_primer_apellido, tutor1_segundo_apellido, tutor1_email, tutor1_telefono, tutor1_sexo, tutor2_nombre, tutor2_primer_apellido, tutor2_segundo_apellido, tutor2_email, tutor2_telefono, tutor2_sexo, edad_matricula, fecha_matricula";

export default async function ImportarAlumnosPage() {
  await requireRole(["Admin"]);

  const admin = createAdminClient();
  const [{ data: alumnosData }, { data: configRow }] = await Promise.all([
    admin.from("alumnos").select(COLUMNAS_ALUMNO).order("alumno"),
    admin
      .from("config_intranet")
      .select("valor")
      .eq("clave", "ultima_importacion_alumnos")
      .maybeSingle(),
  ]);

  return (
    <ImportarAlumnosClient
      alumnos={(alumnosData ?? []) as AlumnoDbRow[]}
      ultimaImportacion={(configRow as { valor?: string } | null)?.valor || null}
    />
  );
}

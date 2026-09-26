import { createAdminClient } from "@/lib/supabase/admin";
import { ConsultarAlumnosClient } from "./ConsultarAlumnosClient";
import type { AlumnoDbRow } from "@/lib/import/alumnos";
import { requireRole } from "@/lib/auth";

export const metadata = { title: "Listado de alumnos" };

const COLUMNAS_ALUMNO = "id, alumno, nie, estado_matricula, unidad, primer_apellido, segundo_apellido, nombre, sexo, email_personal, tutor1_nombre, tutor1_primer_apellido, tutor1_segundo_apellido, tutor1_email, tutor1_telefono, tutor1_sexo, tutor2_nombre, tutor2_primer_apellido, tutor2_segundo_apellido, tutor2_email, tutor2_telefono, tutor2_sexo, edad_matricula, fecha_matricula";

export default async function ConsultarAlumnosPage() {
  await requireRole(["Admin"]);

  const admin = createAdminClient();
  const { data } = await admin.from("alumnos").select(COLUMNAS_ALUMNO).order("alumno");

  return <ConsultarAlumnosClient alumnos={(data ?? []) as AlumnoDbRow[]} />;
}

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { ImportarAlumnosClient } from "./ImportarAlumnosClient";
import type { AlumnoDbRow } from "@/lib/import/alumnos";

export const metadata = { title: "Importar Alumnos" };

const COLUMNAS_ALUMNO = "id, alumno, nie, estado_matricula, unidad, primer_apellido, segundo_apellido, nombre, sexo, email_personal, tutor1_nombre, tutor1_primer_apellido, tutor1_segundo_apellido, tutor1_email, tutor1_telefono, tutor1_sexo, tutor2_nombre, tutor2_primer_apellido, tutor2_segundo_apellido, tutor2_email, tutor2_telefono, tutor2_sexo, edad_matricula, fecha_matricula";

export default async function ImportarAlumnosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rolesData } = await supabase
    .from("user_roles_intranet")
    .select("perfiles_intranet!inner(nombre)")
    .eq("user_id", user.id);

  const roleNames = (rolesData ?? []).map(
    (r) => (r.perfiles_intranet as unknown as { nombre: string }).nombre
  );
  if (!roleNames.includes("Admin")) redirect("/dashboard");

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

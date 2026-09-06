import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { ImportarProfesoresClient } from "./ImportarProfesoresClient";
import type { ProfesorDbRow } from "@/lib/import/profesores";

export const metadata = { title: "Importar Profesores" };

export default async function ImportarProfesoresPage() {
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
  const [{ data: profesoresData }, { data: configRow }] = await Promise.all([
    admin
      .from("profesores")
      .select("id, profesor, puesto, dni, email, fecha_alta, fecha_cese")
      .order("profesor"),
    admin
      .from("config_intranet")
      .select("valor")
      .eq("clave", "ultima_importacion_profesores")
      .maybeSingle(),
  ]);

  return (
    <ImportarProfesoresClient
      profesores={(profesoresData ?? []) as ProfesorDbRow[]}
      ultimaImportacion={(configRow as { valor?: string } | null)?.valor || null}
    />
  );
}

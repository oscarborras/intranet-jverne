import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { ConsultarProfesoresClient } from "./ConsultarProfesoresClient";
import type { ProfesorDbRow } from "@/lib/import/profesores";

export const metadata = { title: "Listado de profesores" };

export default async function ConsultarProfesoresPage() {
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
  const { data } = await admin
    .from("profesores")
    .select("id, profesor, puesto, dni, email, fecha_alta, fecha_cese")
    .order("profesor");

  return <ConsultarProfesoresClient profesores={(data ?? []) as ProfesorDbRow[]} />;
}

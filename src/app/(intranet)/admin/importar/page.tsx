import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ImportarClient } from "./ImportarClient";

export const metadata = { title: "Importar Datos" };

export default async function ImportarPage() {
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

  return <ImportarClient />;
}

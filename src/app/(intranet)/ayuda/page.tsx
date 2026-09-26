import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getModuleAccess } from "@/lib/modulos";
import { AyudaClient } from "./AyudaClient";

export default async function AyudaPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { roles, inactiveModuleSlugs } = await getModuleAccess(supabase, user.id);

  return <AyudaClient inactiveModuleSlugs={inactiveModuleSlugs} roleNames={roles.map((r) => r.nombre)} />;
}

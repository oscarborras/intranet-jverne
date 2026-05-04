import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminModulosClient } from "./AdminModulosClient";
import type { ModuloConfig } from "@/lib/types";

export default async function AdminModulosPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: rolesData } = await supabase
    .from("user_roles_intranet")
    .select("perfiles_intranet(nombre)")
    .eq("user_id", user!.id);

  const roleNames = (rolesData ?? [])
    .map((r) => (r.perfiles_intranet as unknown as { nombre: string })?.nombre)
    .filter(Boolean);

  if (!roleNames.includes("Admin")) redirect("/dashboard");

  const { data: modulos } = await supabase
    .from("modulos_config")
    .select("*")
    .order("orden");

  return <AdminModulosClient initialModulos={(modulos ?? []) as ModuloConfig[]} />;
}

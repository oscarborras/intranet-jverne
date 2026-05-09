import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminModulosClient } from "./AdminModulosClient";
import type { ModuloConfig } from "@/lib/types";

export default async function AdminModulosPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: rolesData } = await supabase
    .from("user_roles_intranet")
    .select("perfiles_intranet(nombre)")
    .eq("user_id", user!.id);

  const roleNames = (rolesData ?? [])
    .map((r) => (r.perfiles_intranet as unknown as { nombre: string })?.nombre)
    .filter(Boolean);

  if (!roleNames.includes("Admin")) redirect("/dashboard");

  const [{ data: modulos }, { data: perfiles }, { data: accessRows }] = await Promise.all([
    supabase.from("modulos_config").select("*").order("orden"),
    supabase.from("perfiles_intranet").select("id, nombre").order("id"),
    supabase.from("modulo_perfiles").select("modulo_id, perfil_id"),
  ]);

  const initialAccess: Record<number, number[]> = {};
  for (const row of (accessRows ?? [])) {
    if (!initialAccess[row.modulo_id]) initialAccess[row.modulo_id] = [];
    initialAccess[row.modulo_id].push(row.perfil_id);
  }

  return (
    <AdminModulosClient
      initialModulos={(modulos ?? []) as ModuloConfig[]}
      perfiles={(perfiles ?? []) as { id: number; nombre: string }[]}
      initialAccess={initialAccess}
    />
  );
}

import { createClient } from "@/lib/supabase/server";
import { AdminModulosClient } from "./AdminModulosClient";
import type { ModuloConfig } from "@/lib/types";
import { requireRole } from "@/lib/auth";

export default async function AdminModulosPage() {
  await requireRole(["Admin"]);
  const supabase = await createClient();

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

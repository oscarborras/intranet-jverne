import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getUserRoles } from "@/lib/auth";

export async function getModuleAccess(supabase: SupabaseClient, userId: string) {
  const [roles, { data: modulosData }] = await Promise.all([
    getUserRoles(userId),
    supabase.from("modulos_config").select("slug, activo, modulo_perfiles(perfil_id)").order("orden"),
  ]);

  const isAdmin = roles.some((r) => r.nombre === "Admin");
  const userPerfilIds = new Set(roles.map((r) => r.id));

  const inactiveModuleSlugs = (modulosData ?? [])
    .filter((m) => {
      if (!m.activo) return true;
      if (isAdmin) return false;
      const allowed = (m.modulo_perfiles as { perfil_id: number }[]).map((mp) => mp.perfil_id);
      return !allowed.some((id) => userPerfilIds.has(id));
    })
    .map((m) => m.slug as string);

  return { roles, isAdmin, inactiveModuleSlugs };
}

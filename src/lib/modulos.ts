import type { SupabaseClient } from "@supabase/supabase-js";
import type { Perfil } from "@/lib/types";

export async function getModuleAccess(supabase: SupabaseClient, userId: string) {
  const [{ data: userRoles }, { data: modulosData }] = await Promise.all([
    supabase
      .from("user_roles_intranet")
      .select("perfil_id, perfiles_intranet(id, nombre, descripcion, created_at)")
      .eq("user_id", userId),
    supabase.from("modulos_config").select("slug, activo, modulo_perfiles(perfil_id)").order("orden"),
  ]);

  const roles: Perfil[] = (userRoles ?? [])
    .map((ur) => ur.perfiles_intranet as unknown as Perfil)
    .filter(Boolean);

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

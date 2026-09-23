import type { createClient } from "@/lib/supabase/server";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

// Config claves (config_intranet) holding a JSON array of perfil ids that receive each module's emails.
// Edited from Configuración → Notificaciones.
export const NOTIFICATION_CLAVES = {
  ausencias: "notificaciones_ausencias_perfiles",
  peticionesTic: "notificaciones_peticiones_tic_perfiles",
  peticionesMantenimiento: "notificaciones_peticiones_mantenimiento_perfiles",
} as const;

function parsePerfilIds(valor: string): number[] {
  try {
    const parsed: unknown = JSON.parse(valor);
    return Array.isArray(parsed) ? parsed.filter((n): n is number => typeof n === "number") : [];
  } catch {
    return [];
  }
}

// Returns the de-duplicated emails of every user holding any perfil configured under `clave`.
// When the config row does not exist yet, uses `fallbackPerfilNombre` (or nobody if omitted).
export async function getNotificationEmails(
  supabase: ServerClient,
  clave: string,
  fallbackPerfilNombre?: string
): Promise<string[]> {
  const { data: configRow } = await supabase
    .from("config_intranet")
    .select("valor")
    .eq("clave", clave)
    .maybeSingle();

  let rolesQuery = supabase.from("user_roles_intranet").select("user_id, perfiles_intranet!inner(nombre)");

  if (configRow) {
    const perfilIds = parsePerfilIds(configRow.valor as string);
    if (perfilIds.length === 0) return [];
    rolesQuery = rolesQuery.in("perfil_id", perfilIds);
  } else if (fallbackPerfilNombre) {
    rolesQuery = rolesQuery.eq("perfiles_intranet.nombre", fallbackPerfilNombre);
  } else {
    return [];
  }

  const { data: roles } = await rolesQuery;
  const userIds = [...new Set((roles ?? []).map((r) => r.user_id as string))];
  if (userIds.length === 0) return [];

  const { data: users } = await supabase.from("users_view").select("email").in("id", userIds);
  return [...new Set((users ?? []).map((u) => u.email as string).filter(Boolean))];
}

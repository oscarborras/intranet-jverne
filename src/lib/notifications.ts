import type { createClient } from "@/lib/supabase/server";
import { todayMadrid } from "@/lib/dates";
import { parseNotificationRecipients } from "@/lib/notificationConfig";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

// Config claves (config_intranet) holding the perfiles and cargos directivos that receive each module's
// emails (see lib/notificationConfig.ts). Edited from Configuración → Notificaciones.
export const NOTIFICATION_CLAVES = {
  ausencias: "notificaciones_ausencias_perfiles",
  peticionesTic: "notificaciones_peticiones_tic_perfiles",
  peticionesMantenimiento: "notificaciones_peticiones_mantenimiento_perfiles",
} as const;

interface CargoHolderRow {
  profesores: { email: string | null; fecha_cese: string | null } | null;
}

// Emails of the current (not ceased) holders of the given leadership roles
async function getCargoHolderEmails(supabase: ServerClient, cargos: string[]): Promise<string[]> {
  if (cargos.length === 0) return [];
  const today = todayMadrid();
  const { data } = await supabase
    .from("cargos_directivos")
    .select("profesores(email, fecha_cese)")
    .in("cargo", cargos)
    .not("profesor_id", "is", null);
  return ((data ?? []) as unknown as CargoHolderRow[])
    .map((r) => r.profesores)
    .filter((p): p is NonNullable<CargoHolderRow["profesores"]> => !!p && (!p.fecha_cese || p.fecha_cese > today))
    .map((p) => p.email)
    .filter((e): e is string => !!e);
}

// Emails of the users holding any of the given perfiles (by id, or a single one by name)
async function getPerfilUserEmails(
  supabase: ServerClient,
  filter: { perfilIds: number[] } | { perfilNombre: string }
): Promise<string[]> {
  let rolesQuery = supabase.from("user_roles_intranet").select("user_id, perfiles_intranet!inner(nombre)");
  if ("perfilIds" in filter) {
    if (filter.perfilIds.length === 0) return [];
    rolesQuery = rolesQuery.in("perfil_id", filter.perfilIds);
  } else {
    rolesQuery = rolesQuery.eq("perfiles_intranet.nombre", filter.perfilNombre);
  }

  const { data: roles } = await rolesQuery;
  const userIds = [...new Set((roles ?? []).map((r) => r.user_id as string))];
  if (userIds.length === 0) return [];

  const { data: users } = await supabase.from("users_view").select("email").in("id", userIds);
  return (users ?? []).map((u) => u.email as string).filter(Boolean);
}

// Returns the de-duplicated emails of every user holding any perfil configured under `clave`,
// plus the holders of the configured cargos directivos.
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

  let perfilEmails: string[] = [];
  let cargoEmails: string[] = [];
  if (configRow) {
    const { perfiles, cargos } = parseNotificationRecipients(configRow.valor as string);
    [perfilEmails, cargoEmails] = await Promise.all([
      getPerfilUserEmails(supabase, { perfilIds: perfiles }),
      getCargoHolderEmails(supabase, cargos),
    ]);
  } else if (fallbackPerfilNombre) {
    perfilEmails = await getPerfilUserEmails(supabase, { perfilNombre: fallbackPerfilNombre });
  }

  // Case-insensitive de-dup: the same person may come from a perfil and a cargo
  const byLower = new Map([...perfilEmails, ...cargoEmails].map((e) => [e.toLowerCase(), e]));
  return [...byLower.values()];
}

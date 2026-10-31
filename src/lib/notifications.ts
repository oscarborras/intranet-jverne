import type { createClient } from "@/lib/supabase/server";
import { todayMadrid } from "@/lib/dates";
import { LISTAS_CORREO_CLAVE, parseListasCorreo, parseNotificationRecipients } from "@/lib/notificationConfig";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

// Config claves (config_intranet) holding the perfiles and cargos directivos that receive each module's
// emails (see lib/notificationConfig.ts). Edited from Configuración → Notificaciones.
export const NOTIFICATION_CLAVES = {
  ausencias: "notificaciones_ausencias_perfiles",
  peticionesTic: "notificaciones_peticiones_tic_perfiles",
  peticionesMantenimiento: "notificaciones_peticiones_mantenimiento_perfiles",
  extraescolares: "notificaciones_extraescolares_perfiles",
  claustro: "notificaciones_claustro_perfiles",
} as const;

interface CargoHolderRow {
  email: string | null;
  profesores: { email: string | null; fecha_cese: string | null } | null;
}

// Emails of the given leadership roles with a current (not ceased) holder: the role mailbox when set,
// otherwise the holder's email
async function getCargoHolderEmails(supabase: ServerClient, cargos: string[]): Promise<string[]> {
  if (cargos.length === 0) return [];
  const today = todayMadrid();
  const { data } = await supabase
    .from("cargos_directivos")
    .select("email, profesores(email, fecha_cese)")
    .in("cargo", cargos)
    .not("profesor_id", "is", null);
  return ((data ?? []) as unknown as CargoHolderRow[])
    .filter((r) => !!r.profesores && (!r.profesores.fecha_cese || r.profesores.fecha_cese > today))
    .map((r) => r.email || r.profesores?.email)
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
// plus the holders of the configured cargos directivos and the configured mailing lists
// (only lists still defined in Configuración → Notificaciones).
// When the config row does not exist yet, uses `fallbackPerfilNombre` (or nobody if omitted).
export async function getNotificationEmails(
  supabase: ServerClient,
  clave: string,
  fallbackPerfilNombre?: string
): Promise<string[]> {
  const { data: rows } = await supabase
    .from("config_intranet")
    .select("clave, valor")
    .in("clave", [clave, LISTAS_CORREO_CLAVE]);
  const configRow = rows?.find((r) => r.clave === clave);

  let perfilEmails: string[] = [];
  let cargoEmails: string[] = [];
  let listaEmails: string[] = [];
  if (configRow) {
    const { perfiles, cargos, listas } = parseNotificationRecipients(configRow.valor as string);
    const definidas = new Set(
      parseListasCorreo(rows?.find((r) => r.clave === LISTAS_CORREO_CLAVE)?.valor as string | undefined)
        .map((l) => l.email.toLowerCase())
    );
    listaEmails = listas.filter((e) => definidas.has(e.toLowerCase()));
    [perfilEmails, cargoEmails] = await Promise.all([
      getPerfilUserEmails(supabase, { perfilIds: perfiles }),
      getCargoHolderEmails(supabase, cargos),
    ]);
  } else if (fallbackPerfilNombre) {
    perfilEmails = await getPerfilUserEmails(supabase, { perfilNombre: fallbackPerfilNombre });
  }

  // Case-insensitive de-dup: the same person may come from a perfil and a cargo
  const byLower = new Map([...perfilEmails, ...cargoEmails, ...listaEmails].map((e) => [e.toLowerCase(), e]));
  return [...byLower.values()];
}

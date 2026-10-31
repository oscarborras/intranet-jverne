import { isCargoDirectivo, type CargoDirectivoClave } from "@/lib/types";

// Recipients of a module's emails, stored as JSON in config_intranet (Configuración → Notificaciones).
// Current format: {"perfiles": [1, 2], "cargos": ["direccion"], "listas": ["claustro@..."]}.
// Legacy formats: without "listas", or a bare array of perfil ids.
export interface NotificationRecipients {
  perfiles: number[];
  cargos: CargoDirectivoClave[];
  /** Emails of mailing lists defined under LISTAS_CORREO_CLAVE */
  listas: string[];
}

const isString = (v: unknown): v is string => typeof v === "string";

export function parseNotificationRecipients(valor: string | undefined): NotificationRecipients {
  try {
    const parsed: unknown = JSON.parse(valor ?? "[]");
    if (Array.isArray(parsed)) {
      return { perfiles: parsed.filter((n): n is number => typeof n === "number"), cargos: [], listas: [] };
    }
    if (parsed && typeof parsed === "object") {
      const { perfiles, cargos, listas } = parsed as { perfiles?: unknown; cargos?: unknown; listas?: unknown };
      return {
        perfiles: Array.isArray(perfiles) ? perfiles.filter((n): n is number => typeof n === "number") : [],
        cargos: Array.isArray(cargos) ? cargos.filter(isCargoDirectivo) : [],
        listas: Array.isArray(listas) ? listas.filter(isString) : [],
      };
    }
  } catch {
    // Malformed value: nobody receives emails
  }
  return { perfiles: [], cargos: [], listas: [] };
}

export function serializeNotificationRecipients(r: NotificationRecipients): string {
  return JSON.stringify({ perfiles: r.perfiles, cargos: r.cargos, listas: r.listas });
}

// ─── Mailing lists ────────────────────────────────────────────────────────────

// Group mailboxes (e.g. claustro@) that modules can notify as a single recipient.
// Stored as JSON in config_intranet: [{"nombre": "Claustro", "email": "claustro@..."}]
export const LISTAS_CORREO_CLAVE = "listas_correo";

export interface ListaCorreo {
  nombre: string;
  email: string;
}

export function parseListasCorreo(valor: string | undefined): ListaCorreo[] {
  try {
    const parsed: unknown = JSON.parse(valor ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (l): l is ListaCorreo => !!l && typeof l === "object" && isString(l.nombre) && isString(l.email)
    );
  } catch {
    return [];
  }
}

export function serializeListasCorreo(listas: ListaCorreo[]): string {
  return JSON.stringify(listas.map(({ nombre, email }) => ({ nombre, email })));
}

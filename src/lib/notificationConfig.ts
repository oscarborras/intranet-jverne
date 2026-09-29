import { isCargoDirectivo, type CargoDirectivoClave } from "@/lib/types";

// Recipients of a module's emails, stored as JSON in config_intranet (Configuración → Notificaciones).
// Current format: {"perfiles": [1, 2], "cargos": ["direccion"]}. Legacy format: a bare array of perfil ids.
export interface NotificationRecipients {
  perfiles: number[];
  cargos: CargoDirectivoClave[];
}

export function parseNotificationRecipients(valor: string | undefined): NotificationRecipients {
  try {
    const parsed: unknown = JSON.parse(valor ?? "[]");
    if (Array.isArray(parsed)) {
      return { perfiles: parsed.filter((n): n is number => typeof n === "number"), cargos: [] };
    }
    if (parsed && typeof parsed === "object") {
      const { perfiles, cargos } = parsed as { perfiles?: unknown; cargos?: unknown };
      return {
        perfiles: Array.isArray(perfiles) ? perfiles.filter((n): n is number => typeof n === "number") : [],
        cargos: Array.isArray(cargos) ? cargos.filter(isCargoDirectivo) : [],
      };
    }
  } catch {
    // Malformed value: nobody receives emails
  }
  return { perfiles: [], cargos: [] };
}

export function serializeNotificationRecipients(r: NotificationRecipients): string {
  return JSON.stringify({ perfiles: r.perfiles, cargos: r.cargos });
}

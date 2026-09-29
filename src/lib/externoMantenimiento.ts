import type { PeticionMantenimientoEstado } from "@/lib/types";

// Rules of the external maintenance portal, shared by its pages and API routes

/** Requests the external technician can see: validated ones (open or in progress) and recently finished */
export const ESTADOS_PORTAL_ACTIVOS: PeticionMantenimientoEstado[] = ["abierta", "en_progreso"];
export const DIAS_FINALIZADAS_PORTAL = 30;

/** Allowed state changes from the portal (current -> next) */
export const TRANSICIONES_PORTAL: Partial<Record<PeticionMantenimientoEstado, PeticionMantenimientoEstado[]>> = {
  abierta: ["en_progreso", "finalizada"],
  en_progreso: ["finalizada"],
};

export const ESTADO_PORTAL_LABELS: Partial<Record<PeticionMantenimientoEstado, string>> = {
  abierta: "Pendiente de empezar",
  en_progreso: "En progreso",
  finalizada: "Finalizada",
};

export const MAX_NOTA_LENGTH = 2000;

/** New requests created from the portal skip validation and start in this state */
export const ESTADO_INICIAL_PORTAL: PeticionMantenimientoEstado = "abierta";
export const MAX_TITULO_LENGTH = 200;
export const MAX_UBICACION_LENGTH = 200;
export const MAX_DESCRIPCION_LENGTH = 5000;
export const MAX_FOTO_BYTES = 10 * 1024 * 1024;

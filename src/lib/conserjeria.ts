import { APP_TIMEZONE } from "@/lib/dates";

/** Number of caretakers (Ordenanza) on duty: 1 = minimum, 2 = reduced, 3 = normal service */
export type NumOrdenanzas = 1 | 2 | 3;

export interface EstadoConserjeria {
  fecha: string;
  num_ordenanzas: NumOrdenanzas;
  updated_by_nombre: string | null;
  updated_at: string;
}

export interface NivelConserjeria {
  num: NumOrdenanzas;
  titulo: string;
  servicio: string;
  /** Solid background used by buttons and the dashboard banner */
  bg: string;
  ring: string;
}

export const NIVELES_CONSERJERIA: NivelConserjeria[] = [
  { num: 1, titulo: "1 Ordenanza", servicio: "Servicios mínimos", bg: "bg-red-700", ring: "ring-red-300" },
  { num: 2, titulo: "2 Ordenanzas", servicio: "Servicio reducido", bg: "bg-amber-600", ring: "ring-amber-300" },
  { num: 3, titulo: "3 Ordenanzas", servicio: "Servicio normal", bg: "bg-green-700", ring: "ring-green-300" },
];

export const ESTADO_CONSERJERIA_SELECT = "fecha, num_ordenanzas, updated_by_nombre, updated_at";

export function nivelConserjeria(num: number | null | undefined): NivelConserjeria | null {
  return NIVELES_CONSERJERIA.find((n) => n.num === num) ?? null;
}

/** "HH:MM" in the school's timezone */
export function horaConserjeria(iso: string): string {
  return new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: APP_TIMEZONE }).format(new Date(iso));
}

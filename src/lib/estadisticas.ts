import { addDaysToDateStr } from "@/lib/dates";
import type { PeticionPrioridad } from "@/lib/types";

// Shared helpers for the request statistics pages (TIC and maintenance)

export type Periodo = "curso" | "90" | "30" | "todo";

export const PERIODOS: { id: Periodo; label: string }[] = [
  { id: "curso", label: "Curso actual" },
  { id: "90", label: "Últimos 90 días" },
  { id: "30", label: "Últimos 30 días" },
  { id: "todo", label: "Todo" },
];

// Ordinal: most urgent first
export const PRIORIDADES_ESTADISTICA: { id: PeticionPrioridad; label: string }[] = [
  { id: "urgente", label: "Urgente" },
  { id: "alta", label: "Alta" },
  { id: "normal", label: "Normal" },
  { id: "baja", label: "Baja" },
];

export const COLOR_CREADAS = "var(--chart-1)";
export const COLOR_FINALIZADAS = "var(--chart-4)";

const monthFormatter = new Intl.DateTimeFormat("es-ES", { month: "short", year: "2-digit", timeZone: "UTC" });
const numberFormatter = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 });

/** First day ("YYYY-MM-DD") included in the period, or null for "todo". */
export function periodoStart(periodo: Periodo, todayStr: string): string | null {
  if (periodo === "todo") return null;
  if (periodo === "30") return addDaysToDateStr(todayStr, -30);
  if (periodo === "90") return addDaysToDateStr(todayStr, -90);
  // School year starts on 1 September
  const [y, m] = todayStr.split("-").map(Number);
  return `${m >= 9 ? y : y - 1}-09-01`;
}

export function periodoLabel(periodo: Periodo): string {
  return PERIODOS.find((p) => p.id === periodo)?.label.toLowerCase() ?? "";
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Days between two ISO timestamps. */
export function diasEntre(desde: string, hasta: string): number {
  return (new Date(hasta).getTime() - new Date(desde).getTime()) / 86_400_000;
}

/** 0.2 -> "5 h", 2.46 -> "2,5 días" */
export function formatDias(dias: number): string {
  const horas = dias * 24;
  if (horas < 1) return "< 1 h";
  if (horas < 24) return `${Math.round(horas)} h`;
  return `${numberFormatter.format(dias)} ${dias === 1 ? "día" : "días"}`;
}

export function formatPeticiones(n: number): string {
  return `${n} ${n === 1 ? "petición" : "peticiones"}`;
}

/** "YYYY-MM" keys from `from` to `to`, inclusive */
function monthKeys(from: string, to: string): string[] {
  const out: string[] = [];
  let [y, m] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return out;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return monthFormatter.format(new Date(Date.UTC(y, m - 1, 1))).replace(".", "");
}

// Type alias (not interface) so it fits the charts' Record<string, string | number> rows
export type MesSerie = {
  mes: string;
  creadas: number;
  finalizadas: number;
};

/**
 * Created vs finished per month, from the period start (or the first request) to today.
 * Dates are Madrid calendar days ("YYYY-MM-DD").
 */
export function seriesMensual(
  creadasDates: string[],
  finalizadasDates: string[],
  start: string | null,
  todayStr: string
): MesSerie[] {
  const first = (start ?? [...creadasDates].sort()[0] ?? todayStr).slice(0, 7);
  return monthKeys(first, todayStr.slice(0, 7)).map((key) => ({
    mes: monthLabel(key),
    creadas: creadasDates.filter((d) => d.startsWith(key)).length,
    finalizadas: finalizadasDates.filter((d) => d.startsWith(key)).length,
  }));
}

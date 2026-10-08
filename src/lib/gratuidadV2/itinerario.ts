// Student itinerary (ordinario / diversificación): which titles of the group's lot
// a student takes. Mirrors gplv2_itinerario_alumno() and gplv2_progreso_grupos().
import type { ItinerarioV2 } from "@/lib/types/gratuidadV2";

export interface TituloDeLote {
  id: string;
  /** Only for some students of the group (does not count for a complete lot) */
  optativo: boolean;
  diversificacion: boolean;
}

/**
 * Manual mark for the school year, or automatic: holding any Diversificación
 * book makes the student Diversificación.
 */
export function itinerarioEfectivo(
  manual: ItinerarioV2 | undefined,
  titulosPrestados: Iterable<string>,
  titulosDiversificacion: Set<string>,
): ItinerarioV2 {
  if (manual) return manual;
  for (const id of titulosPrestados) if (titulosDiversificacion.has(id)) return "diversificacion";
  return "ordinario";
}

/** Titles the student must have for a complete lot */
export function titulosRequeridos<T extends TituloDeLote>(lote: T[], itinerario: ItinerarioV2): T[] {
  return itinerario === "diversificacion"
    ? lote.filter((t) => t.diversificacion)
    : lote.filter((t) => !t.diversificacion && !t.optativo);
}

/** Titles shown in the student's checklist (optional ones included for ordinary students) */
export function titulosDelItinerario<T extends TituloDeLote>(lote: T[], itinerario: ItinerarioV2): T[] {
  return itinerario === "diversificacion"
    ? lote.filter((t) => t.diversificacion)
    : lote.filter((t) => !t.diversificacion);
}

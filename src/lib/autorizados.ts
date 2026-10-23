// People authorised to pick up students: data shape and helpers for the
// "Alumnado" lookup, where they are shown inside each student's card.

import { normalizeText } from "@/lib/text";

export interface AutorizadoRecogida {
  id: string;
  nombre: string; // "Apellidos, Nombre"
  dni: string | null;
  telefono: string | null;
  origen: "seneca" | "manual";
  usuario_alta: string | null;
  fecha_alta: string | null;
}

export const AUTORIZADO_SELECT = "id, nombre, dni, telefono, origen, usuario_alta, fecha_alta";

/** Name parts of a guardian as stored in `alumnos` (tutor1_* / tutor2_*) */
export interface NombreTutor {
  nombre: string | null;
  primer_apellido: string | null;
  segundo_apellido: string | null;
}

/** Words of a person's name, order-independent: "Pérez López, Ana" and "Ana Pérez López" give the same key. */
function claveNombre(texto: string): string {
  return normalizeText(texto).split(/[\s,]+/).filter(Boolean).sort().join(" ");
}

/**
 * Authorised people who are not one of the student's guardians: guardians are
 * already shown in the card, so they would appear twice.
 */
export function autorizadosSinTutores(autorizados: AutorizadoRecogida[], tutores: NombreTutor[]): AutorizadoRecogida[] {
  const claves = new Set(
    tutores
      .map((t) => claveNombre([t.nombre, t.primer_apellido, t.segundo_apellido].filter(Boolean).join(" ")))
      .filter(Boolean),
  );
  if (claves.size === 0) return autorizados;
  return autorizados.filter((p) => !claves.has(claveNombre(p.nombre)));
}

/** Searchable text of a list of authorised people: name, ID and phone (also without spaces). */
export function textoAutorizados(autorizados: AutorizadoRecogida[]): string {
  return autorizados
    .flatMap((p) => [p.nombre, p.dni, p.telefono, p.telefono?.replace(/\s+/g, "")])
    .filter(Boolean)
    .join(" ");
}

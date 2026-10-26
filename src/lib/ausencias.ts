import type { AusenciaMotivo } from "@/lib/types";

/** Reasons of an absence, in display order. Only the owner and Directiva/Admin can see them (RLS). */
export const AUSENCIA_MOTIVOS: { value: AusenciaMotivo; label: string }[] = [
  { value: "cita_medica", label: "Cita médica" },
  { value: "enfermedad", label: "Enfermedad" },
  { value: "excursion", label: "Excursión" },
  { value: "asuntos_propios", label: "Asuntos propios" },
];

export function isAusenciaMotivo(value: unknown): value is AusenciaMotivo {
  return AUSENCIA_MOTIVOS.some((m) => m.value === value);
}

export function ausenciaMotivoLabel(motivo: AusenciaMotivo): string {
  return AUSENCIA_MOTIVOS.find((m) => m.value === motivo)?.label ?? motivo;
}

/** ausencias_profesorado select with the slot and course of each absence */
export const AUSENCIA_SELECT =
  "*, tramos_horarios(id, nombre, hora_inicio, hora_fin, es_recreo, orden), cursos(id, nombre, email_tutor)";

/** Same plus the private reason (null for rows the user isn't allowed to see) */
export const AUSENCIA_SELECT_CON_MOTIVO =
  "*, tramos_horarios(id, nombre, hora_inicio, hora_fin, es_recreo, orden), cursos(id, nombre, email_tutor), ausencias_motivos(motivo)";

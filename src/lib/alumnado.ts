// Student lookup ("Alumnado"): data shape and word-by-word search.

export interface AlumnoFicha {
  id: string;
  alumno: string; // "Apellido1 Apellido2, Nombre"
  unidad: string; // group, e.g. "1º ESO A"
  nie: string | null;
  edad_matricula: string | null;
  estado_matricula: string | null;
  tutor1_nombre: string | null;
  tutor1_primer_apellido: string | null;
  tutor1_segundo_apellido: string | null;
  tutor1_telefono: string | null;
  tutor1_email: string | null;
  tutor2_nombre: string | null;
  tutor2_primer_apellido: string | null;
  tutor2_segundo_apellido: string | null;
  tutor2_telefono: string | null;
  tutor2_email: string | null;
}

export const ALUMNO_FICHA_SELECT =
  "id, alumno, unidad, nie, edad_matricula, estado_matricula, " +
  "tutor1_nombre, tutor1_primer_apellido, tutor1_segundo_apellido, tutor1_telefono, tutor1_email, " +
  "tutor2_nombre, tutor2_primer_apellido, tutor2_segundo_apellido, tutor2_telefono, tutor2_email";

/** Student who has left the school (or has no group) */
export function esBaja(a: Pick<AlumnoFicha, "estado_matricula" | "unidad">): boolean {
  return Boolean(a.estado_matricula) || !a.unidad;
}

/** "1º ESO A" → "1º ESO" (course); names without a trailing group letter are returned as-is. */
export function cursoDeUnidad(unidad: string): string {
  const m = unidad.trim().match(/^(.*\S)\s+[A-Z]$/);
  return m ? m[1] : unidad.trim();
}

export function nombreTutor(a: AlumnoFicha, n: 1 | 2): string {
  const partes = n === 1
    ? [a.tutor1_nombre, a.tutor1_primer_apellido, a.tutor1_segundo_apellido]
    : [a.tutor2_nombre, a.tutor2_primer_apellido, a.tutor2_segundo_apellido];
  return partes.filter((p) => p && p.trim()).join(" ");
}

/**
 * Searchable text of a student: name, group, NIE and both guardians' names,
 * phones and emails. Phones are also added without spaces so "600 12" and
 * "60012" both match.
 */
export function textoBusqueda(a: AlumnoFicha): string {
  const telefonos = [a.tutor1_telefono, a.tutor2_telefono].filter(Boolean).map((t) => (t as string).replace(/\s+/g, ""));
  return [
    a.alumno, a.unidad, a.nie, nombreTutor(a, 1), nombreTutor(a, 2),
    a.tutor1_telefono, a.tutor2_telefono, ...telefonos, a.tutor1_email, a.tutor2_email,
  ].filter(Boolean).join(" ");
}

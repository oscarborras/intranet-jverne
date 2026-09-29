// Course helpers. Lots are stored per group ("1º ESO A" = cursos.nombre = alumnos.unidad),
// but books usually belong to a whole level ("1º ESO"), so the UI works with both.

/** "1º ESO A" → "1º ESO"; names without a trailing group letter are returned as-is. */
export function nivelDeCurso(curso: string): string {
  const m = curso.trim().match(/^(.*\S)\s+[A-Z]$/);
  return m ? m[1] : curso.trim();
}

export interface NivelCursos {
  nivel: string;
  cursos: string[];
}

/** Groups course names by level, keeping the input order (expected sorted). */
export function agruparPorNivel(cursos: string[]): NivelCursos[] {
  const map = new Map<string, string[]>();
  for (const c of cursos) {
    const nivel = nivelDeCurso(c);
    const list = map.get(nivel) ?? [];
    list.push(c);
    map.set(nivel, list);
  }
  return Array.from(map, ([nivel, list]) => ({ nivel, cursos: list }));
}

/**
 * Short text for a title's lot: whole levels are shown as the level ("1º ESO"),
 * partial ones list their groups ("3º ESO A, 3º ESO B").
 */
export function resumenLote(cursosLote: string[], todosLosCursos: string[]): string {
  const seleccion = new Set(cursosLote);
  const partes: string[] = [];
  for (const { nivel, cursos } of agruparPorNivel(todosLosCursos)) {
    const elegidos = cursos.filter((c) => seleccion.has(c));
    if (elegidos.length === 0) continue;
    if (elegidos.length === cursos.length) partes.push(nivel);
    else partes.push(...elegidos);
    elegidos.forEach((c) => seleccion.delete(c));
  }
  // Courses no longer in the course list (renamed / removed)
  partes.push(...seleccion);
  return partes.join(", ");
}

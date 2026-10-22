// Parsing and student matching of Séneca's "Personas autorizadas a recoger al
// alumnado" export (RegPerAutRecAlu.csv).
//
// The file has no student NIE: each row names the student as
// "Apellidos, Nombre (13 años)", so students are matched by normalized name and,
// when two share a name, by age. One row per student/person pair; students with
// nobody authorised come with the person columns empty and are skipped.

import { CsvFormatError, normalize, parseCsv } from "@/lib/import/alumnos";

export interface AutorizadoCsvRow {
  alumno: string; // without the "(NN años)" suffix
  edad: string | null;
  nombre: string;
  dni: string | null;
  telefono: string | null;
  usuario_alta: string | null;
  fecha_alta: string | null; // ISO timestamp
}

export interface AlumnoParaEmparejar {
  id: string;
  alumno: string;
  unidad: string;
  edad_matricula: string | null;
  estado_matricula: string | null;
}

/** Row sent to the import API */
export interface AutorizadoImport {
  alumno_id: string;
  nombre: string;
  dni: string | null;
  telefono: string | null;
  usuario_alta: string | null;
  fecha_alta: string | null;
}

export interface AutorizadoEmparejado extends AutorizadoImport {
  alumno: string;
  unidad: string;
}

export interface AlumnoNoEmparejado {
  alumno: string;
  edad: string | null;
  autorizados: number;
  motivo: string;
}

export interface ResultadoEmparejamiento {
  autorizados: AutorizadoEmparejado[];
  noEmparejados: AlumnoNoEmparejado[];
  alumnosConAutorizados: number;
  filasCsv: number;
}

type CampoCsv = "alumno" | "nombre" | "dni" | "telefono" | "usuario_alta" | "fecha_alta";

const COLUMNAS: Record<CampoCsv, string[]> = {
  alumno: ["alumno/a", "alumno"],
  nombre: ["persona autorizada"],
  dni: ["dni/nie", "dni", "nie"],
  telefono: ["telefono"],
  usuario_alta: ["usuario alta"],
  fecha_alta: ["fecha alta"],
};

function findHeader(rows: string[][]): { index: number; map: Partial<Record<CampoCsv, number>> } | null {
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const cells = rows[i].map(normalize);
    const map: Partial<Record<CampoCsv, number>> = {};
    for (const [campo, alias] of Object.entries(COLUMNAS) as [CampoCsv, string[]][]) {
      const pos = cells.findIndex((c) => alias.includes(c));
      if (pos !== -1) map[campo] = pos;
    }
    if (map.alumno !== undefined && map.nombre !== undefined) return { index: i, map };
  }
  return null;
}

/** "García  López ,Ana " → "García López, Ana" */
function limpiarNombre(value: string): string {
  return value.replace(/\s+/g, " ").replace(/\s*,\s*/g, ", ").trim();
}

/** "dd/mm/yyyy hh:mm:ss" (local time) → ISO timestamp */
function parseFecha(value: string): string | null {
  const m = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!m) return null;
  const [, d, mo, y, h = "0", mi = "0", s = "0"] = m;
  const fecha = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s));
  return Number.isNaN(fecha.getTime()) ? null : fecha.toISOString();
}

export function parseAutorizadosCsv(text: string): AutorizadoCsvRow[] {
  const sinBom = text.replace(/^﻿/, "");

  let rows: string[][] | null = null;
  let header: { index: number; map: Partial<Record<CampoCsv, number>> } | null = null;

  for (const delimiter of [",", ";", "\t"]) {
    const candidate = parseCsv(sinBom, delimiter);
    const found = findHeader(candidate);
    if (found) { rows = candidate; header = found; break; }
  }

  if (!rows || !header) {
    throw new CsvFormatError(
      "No se ha encontrado la fila de cabecera. Comprueba que el fichero es el CSV de Séneca de personas autorizadas (RegPerAutRecAlu) y que contiene las columnas \"Alumno/a\" y \"Persona autorizada\"."
    );
  }

  const { index, map } = header;
  const cell = (r: string[], campo: CampoCsv): string => {
    const pos = map[campo];
    return pos === undefined ? "" : (r[pos] ?? "").trim();
  };

  const out: AutorizadoCsvRow[] = [];
  let filasAlumno = 0;
  for (let i = index + 1; i < rows.length; i++) {
    const r = rows[i];
    const alumnoRaw = cell(r, "alumno");
    if (!alumnoRaw) continue;
    filasAlumno++;

    const nombre = limpiarNombre(cell(r, "nombre"));
    if (!nombre) continue; // student with nobody authorised

    const edadMatch = alumnoRaw.match(/\s*\((\d+)\s*a\S*os\)\s*$/i);
    const dni = cell(r, "dni").replace(/\s+/g, "").toUpperCase();
    out.push({
      alumno: limpiarNombre(edadMatch ? alumnoRaw.slice(0, edadMatch.index) : alumnoRaw),
      edad: edadMatch ? edadMatch[1] : null,
      nombre,
      dni: dni || null,
      telefono: cell(r, "telefono").replace(/\s+/g, " ") || null,
      usuario_alta: limpiarNombre(cell(r, "usuario_alta")) || null,
      fecha_alta: parseFecha(cell(r, "fecha_alta")),
    });
  }

  if (filasAlumno === 0) {
    throw new CsvFormatError("El fichero no contiene ninguna fila de alumnado.");
  }
  return out;
}

export function emparejarAutorizados(csv: AutorizadoCsvRow[], alumnos: AlumnoParaEmparejar[]): ResultadoEmparejamiento {
  const porNombre = new Map<string, AlumnoParaEmparejar[]>();
  for (const a of alumnos) {
    const key = normalize(a.alumno);
    const arr = porNombre.get(key) ?? [];
    arr.push(a);
    porNombre.set(key, arr);
  }

  // Group the rows by student as they appear in the file (name + age)
  const grupos = new Map<string, { alumno: string; edad: string | null; filas: AutorizadoCsvRow[] }>();
  for (const fila of csv) {
    const key = `${normalize(fila.alumno)}|${fila.edad ?? ""}`;
    const g = grupos.get(key) ?? { alumno: fila.alumno, edad: fila.edad, filas: [] };
    g.filas.push(fila);
    grupos.set(key, g);
  }

  const autorizados: AutorizadoEmparejado[] = [];
  const noEmparejados: AlumnoNoEmparejado[] = [];
  let alumnosConAutorizados = 0;

  for (const g of grupos.values()) {
    let candidatos = porNombre.get(normalize(g.alumno)) ?? [];
    if (candidatos.length > 1) {
      const activos = candidatos.filter((c) => !c.estado_matricula);
      if (activos.length > 0) candidatos = activos;
    }
    if (candidatos.length > 1 && g.edad) {
      const mismaEdad = candidatos.filter((c) => c.edad_matricula?.trim() === g.edad);
      if (mismaEdad.length > 0) candidatos = mismaEdad;
    }

    if (candidatos.length !== 1) {
      noEmparejados.push({
        alumno: g.alumno,
        edad: g.edad,
        autorizados: g.filas.length,
        motivo: candidatos.length === 0
          ? "No hay ningún alumno con este nombre en la intranet. Importa antes el alumnado."
          : `Hay ${candidatos.length} alumnos con este nombre y la misma edad: no se puede saber a cuál corresponde.`,
      });
      continue;
    }

    const alumno = candidatos[0];
    alumnosConAutorizados++;
    const vistos = new Set<string>();
    for (const f of g.filas) {
      const clave = `${normalize(f.nombre)}|${f.dni ?? ""}`;
      if (vistos.has(clave)) continue;
      vistos.add(clave);
      autorizados.push({
        alumno_id: alumno.id,
        alumno: alumno.alumno,
        unidad: alumno.unidad,
        nombre: f.nombre,
        dni: f.dni,
        telefono: f.telefono,
        usuario_alta: f.usuario_alta,
        fecha_alta: f.fecha_alta,
      });
    }
  }

  noEmparejados.sort((x, y) => x.alumno.localeCompare(y.alumno, "es"));
  return { autorizados, noEmparejados, alumnosConAutorizados, filasCsv: csv.length };
}

// Parsing and diffing of the "ALUMNADO DEL CENTRO" export from Séneca.
//
// Only the columns the app actually stores/uses are read — health, allergy,
// custody, address and contact-of-the-student columns are deliberately ignored.
//
// Séneca's own account fields don't apply here: students never log in to the
// intranet (the OAuth callback rejects any @alu email), so unlike profesores
// there is no "email de acceso" step in this wizard.

export interface AlumnoCsvRow {
  alumno: string;
  nie: string | null;
  estado_matricula: string | null;
  unidad: string | null;
  primer_apellido: string | null;
  segundo_apellido: string | null;
  nombre: string | null;
  sexo: string | null;
  email_personal: string | null;
  tutor1_nombre: string | null;
  tutor1_primer_apellido: string | null;
  tutor1_segundo_apellido: string | null;
  tutor1_email: string | null;
  tutor1_telefono: string | null;
  tutor1_sexo: string | null;
  tutor2_nombre: string | null;
  tutor2_primer_apellido: string | null;
  tutor2_segundo_apellido: string | null;
  tutor2_email: string | null;
  tutor2_telefono: string | null;
  tutor2_sexo: string | null;
  edad_matricula: string | null;
  fecha_matricula: string | null;
}

export interface AlumnoDbRow {
  id: string;
  alumno: string;
  nie: string | null;
  estado_matricula: string | null;
  unidad: string;
  primer_apellido: string | null;
  segundo_apellido: string | null;
  nombre: string | null;
  sexo: string;
  email_personal: string | null;
  tutor1_nombre: string | null;
  tutor1_primer_apellido: string | null;
  tutor1_segundo_apellido: string | null;
  tutor1_email: string | null;
  tutor1_telefono: string | null;
  tutor1_sexo: string | null;
  tutor2_nombre: string | null;
  tutor2_primer_apellido: string | null;
  tutor2_segundo_apellido: string | null;
  tutor2_email: string | null;
  tutor2_telefono: string | null;
  tutor2_sexo: string | null;
  edad_matricula: string | null;
  fecha_matricula: string | null;
}

export type CampoImportable =
  | "alumno" | "estado_matricula" | "nie" | "unidad"
  | "primer_apellido" | "segundo_apellido" | "nombre" | "sexo" | "email_personal"
  | "tutor1_nombre" | "tutor1_primer_apellido" | "tutor1_segundo_apellido" | "tutor1_email" | "tutor1_telefono" | "tutor1_sexo"
  | "tutor2_nombre" | "tutor2_primer_apellido" | "tutor2_segundo_apellido" | "tutor2_email" | "tutor2_telefono" | "tutor2_sexo"
  | "edad_matricula" | "fecha_matricula";

type CampoCsv = CampoImportable;

export interface CampoCambio {
  campo: CampoImportable;
  antes: string | null;
  despues: string | null;
}

export interface FilaActualizar {
  id: string;
  alumno: string;
  cambios: CampoCambio[];
  patch: Partial<Record<CampoImportable, string | null>>;
}

export interface FilaNueva {
  clave: string;
  alumno: string;
  nie: string | null;
  unidad: string | null;
  patch: Partial<Record<CampoImportable, string | null>>;
}

export interface FilaBaja {
  id: string;
  alumno: string;
  unidad: string;
}

export interface FilaAmbigua {
  clave: string;
  alumno: string;
  nie: string | null;
  unidad: string | null;
  motivo: string;
}

export interface DiffImportacion {
  actualizar: FilaActualizar[];
  nuevos: FilaNueva[];
  bajas: FilaBaja[];
  ambiguos: FilaAmbigua[];
  sinCambios: number;
  totalCsv: number;
}

export const ETIQUETA_CAMPO: Record<CampoImportable, string> = {
  alumno: "Alumno/a",
  estado_matricula: "Estado matrícula",
  nie: "Nº Id. Escolar",
  unidad: "Unidad",
  primer_apellido: "Primer apellido",
  segundo_apellido: "Segundo apellido",
  nombre: "Nombre",
  sexo: "Sexo",
  email_personal: "Email personal",
  tutor1_nombre: "Nombre tutor/a 1",
  tutor1_primer_apellido: "Primer apellido tutor/a 1",
  tutor1_segundo_apellido: "Segundo apellido tutor/a 1",
  tutor1_email: "Email tutor/a 1",
  tutor1_telefono: "Teléfono tutor/a 1",
  tutor1_sexo: "Sexo tutor/a 1",
  tutor2_nombre: "Nombre tutor/a 2",
  tutor2_primer_apellido: "Primer apellido tutor/a 2",
  tutor2_segundo_apellido: "Segundo apellido tutor/a 2",
  tutor2_email: "Email tutor/a 2",
  tutor2_telefono: "Teléfono tutor/a 2",
  tutor2_sexo: "Sexo tutor/a 2",
  edad_matricula: "Edad de matrícula",
  fecha_matricula: "Fecha de matrícula",
};

// ─── CSV parsing ──────────────────────────────────────────────────────────────

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[°º]/g, "")
    .replace(/[¿?.:]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function parseCsv(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(cur);
      cur = "";
    } else if (ch === "\n") {
      row.push(cur);
      cur = "";
      rows.push(row);
      row = [];
    } else if (ch !== "\r") {
      cur += ch;
    }
  }
  row.push(cur);
  rows.push(row);

  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

const COLUMNAS: Record<CampoCsv, string[]> = {
  alumno: ["alumno/a"],
  estado_matricula: ["estado matricula"],
  nie: ["n id escolar", "nia", "numero identificacion escolar"],
  unidad: ["unidad"],
  primer_apellido: ["primer apellido"],
  segundo_apellido: ["segundo apellido"],
  nombre: ["nombre"],
  sexo: ["sexo"],
  email_personal: ["correo electronico personal alumno/a"],
  tutor1_nombre: ["nombre primer tutor"],
  tutor1_primer_apellido: ["primer apellido primer tutor"],
  tutor1_segundo_apellido: ["segundo apellido primer tutor"],
  tutor1_email: ["correo electronico primer tutor"],
  tutor1_telefono: ["telefono primer tutor"],
  tutor1_sexo: ["sexo primer tutor"],
  tutor2_nombre: ["nombre segundo tutor"],
  tutor2_primer_apellido: ["primer apellido segundo tutor"],
  tutor2_segundo_apellido: ["segundo apellido segundo tutor"],
  tutor2_email: ["correo electronico segundo tutor"],
  tutor2_telefono: ["telefono segundo tutor"],
  tutor2_sexo: ["sexo segundo tutor"],
  edad_matricula: ["edad a 31/12 del ano de matricula"],
  fecha_matricula: ["fecha de matricula"],
};

function findHeader(rows: string[][]): { index: number; map: Partial<Record<CampoCsv, number>> } | null {
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const cells = rows[i].map(normalize);
    const map: Partial<Record<CampoCsv, number>> = {};
    for (const [campo, alias] of Object.entries(COLUMNAS) as [CampoCsv, string[]][]) {
      const pos = cells.findIndex((c) => alias.includes(c));
      if (pos !== -1) map[campo] = pos;
    }
    // alumno + nie son imprescindibles: sin ellos no se puede identificar
    // al alumno de forma fiable entre cursos.
    if (map.alumno !== undefined && map.nie !== undefined) return { index: i, map };
  }
  return null;
}

export class CsvFormatError extends Error {}

export function parseAlumnosCsv(text: string): AlumnoCsvRow[] {
  const sinBom = text.replace(/^\ufeff/, "");

  let rows: string[][] | null = null;
  let header: { index: number; map: Partial<Record<CampoCsv, number>> } | null = null;

  for (const delimiter of [";", ",", "\t"]) {
    const candidate = parseCsv(sinBom, delimiter);
    const found = findHeader(candidate);
    if (found) { rows = candidate; header = found; break; }
  }

  if (!rows || !header) {
    throw new CsvFormatError(
      "No se ha encontrado la fila de cabecera. Comprueba que el fichero es el CSV exportado de Séneca (Alumnado del Centro) y que contiene las columnas \"Alumno/a\" y \"Nº Id. Escolar\"."
    );
  }

  const { index, map } = header;
  const cell = (r: string[], campo: CampoCsv): string => {
    const pos = map[campo];
    return pos === undefined ? "" : (r[pos] ?? "").trim();
  };

  const out: AlumnoCsvRow[] = [];
  for (let i = index + 1; i < rows.length; i++) {
    const r = rows[i];
    const alumno = cell(r, "alumno");
    if (!alumno) continue;
    out.push({
      alumno,
      nie: cell(r, "nie") || null,
      estado_matricula: cell(r, "estado_matricula") || null,
      unidad: cell(r, "unidad") || null,
      primer_apellido: cell(r, "primer_apellido") || null,
      segundo_apellido: cell(r, "segundo_apellido") || null,
      nombre: cell(r, "nombre") || null,
      sexo: cell(r, "sexo") || null,
      email_personal: cell(r, "email_personal") || null,
      tutor1_nombre: cell(r, "tutor1_nombre") || null,
      tutor1_primer_apellido: cell(r, "tutor1_primer_apellido") || null,
      tutor1_segundo_apellido: cell(r, "tutor1_segundo_apellido") || null,
      tutor1_email: cell(r, "tutor1_email") || null,
      tutor1_telefono: cell(r, "tutor1_telefono") || null,
      tutor1_sexo: cell(r, "tutor1_sexo") || null,
      tutor2_nombre: cell(r, "tutor2_nombre") || null,
      tutor2_primer_apellido: cell(r, "tutor2_primer_apellido") || null,
      tutor2_segundo_apellido: cell(r, "tutor2_segundo_apellido") || null,
      tutor2_email: cell(r, "tutor2_email") || null,
      tutor2_telefono: cell(r, "tutor2_telefono") || null,
      tutor2_sexo: cell(r, "tutor2_sexo") || null,
      edad_matricula: cell(r, "edad_matricula") || null,
      fecha_matricula: cell(r, "fecha_matricula") || null,
    });
  }

  if (out.length === 0) {
    throw new CsvFormatError("El fichero no contiene ninguna fila de alumnado.");
  }
  return out;
}

// ─── Diff ─────────────────────────────────────────────────────────────────────

function claveDe(row: { nie: string | null; alumno: string }): string {
  if (row.nie) return `nie:${row.nie.toUpperCase().trim()}`;
  return `nombre:${normalize(row.alumno)}`;
}

// Un alumno con matrícula duplicada (p. ej. módulo + FP dual) puede repetirse:
// nos quedamos con la fila más reciente por fecha de matrícula.
function dedupe(filas: AlumnoCsvRow[]): AlumnoCsvRow[] {
  const porClave = new Map<string, AlumnoCsvRow>();
  for (const fila of filas) {
    const clave = claveDe(fila);
    const previa = porClave.get(clave);
    if (!previa || (fila.fecha_matricula ?? "") > (previa.fecha_matricula ?? "")) {
      porClave.set(clave, fila);
    }
  }
  return [...porClave.values()];
}

const CAMPOS_COMPARABLES: CampoImportable[] = [
  "alumno", "unidad", "primer_apellido", "segundo_apellido", "nombre", "sexo", "email_personal",
  "tutor1_nombre", "tutor1_primer_apellido", "tutor1_segundo_apellido", "tutor1_email", "tutor1_telefono", "tutor1_sexo",
  "tutor2_nombre", "tutor2_primer_apellido", "tutor2_segundo_apellido", "tutor2_email", "tutor2_telefono", "tutor2_sexo",
  "edad_matricula", "fecha_matricula",
];

export function calcularDiff(csv: AlumnoCsvRow[], db: AlumnoDbRow[]): DiffImportacion {
  const filas = dedupe(csv);

  const porNie = new Map<string, AlumnoDbRow>();
  const porNombre = new Map<string, AlumnoDbRow[]>();
  for (const a of db) {
    if (a.nie) porNie.set(a.nie.toUpperCase().trim(), a);
    const key = normalize(a.alumno);
    const arr = porNombre.get(key) ?? [];
    arr.push(a);
    porNombre.set(key, arr);
  }

  const actualizar: FilaActualizar[] = [];
  const nuevos: FilaNueva[] = [];
  const ambiguos: FilaAmbigua[] = [];
  const emparejados = new Set<string>();
  const enConflicto = new Set<string>();
  let sinCambios = 0;

  for (const fila of filas) {
    let existente: AlumnoDbRow | undefined;

    if (fila.nie) {
      existente = porNie.get(fila.nie.toUpperCase().trim());
    }

    if (!existente) {
      const candidatos = (porNombre.get(normalize(fila.alumno)) ?? [])
        .filter((c) => !emparejados.has(c.id));
      if (candidatos.length === 1) {
        existente = candidatos[0];
      } else if (candidatos.length > 1) {
        ambiguos.push({
          clave: claveDe(fila),
          alumno: fila.alumno,
          nie: fila.nie,
          unidad: fila.unidad,
          motivo: `Hay ${candidatos.length} alumnos existentes con el mismo nombre y sin Nº Id. Escolar asignado. Añade el NIE en Séneca para poder identificarlo automáticamente.`,
        });
        // No se marcan como baja: siguen matriculados, solo falta resolver la
        // ambigüedad — no son "no aparecen en el fichero".
        for (const c of candidatos) enConflicto.add(c.id);
        continue;
      }
    }

    if (!existente) {
      const patch: Partial<Record<CampoImportable, string | null>> = {};
      for (const campo of ["unidad", ...CAMPOS_COMPARABLES] as CampoImportable[]) {
        const valor = fila[campo as keyof AlumnoCsvRow] as string | null | undefined;
        if (valor !== undefined) patch[campo] = valor;
      }
      patch.nie = fila.nie;
      patch.estado_matricula = fila.estado_matricula;
      nuevos.push({ clave: claveDe(fila), alumno: fila.alumno, nie: fila.nie, unidad: fila.unidad, patch });
      continue;
    }

    emparejados.add(existente.id);

    const cambios: CampoCambio[] = [];
    const patch: Partial<Record<CampoImportable, string | null>> = {};
    const comparar = (campo: CampoImportable, nuevo: string | null) => {
      const antes = existente![campo as keyof AlumnoDbRow] as string | null ?? null;
      if (nuevo !== null && nuevo !== antes) {
        cambios.push({ campo, antes, despues: nuevo });
        patch[campo] = nuevo;
      }
    };

    if (!existente.nie && fila.nie) comparar("nie", fila.nie);
    for (const campo of CAMPOS_COMPARABLES) comparar(campo, fila[campo as keyof AlumnoCsvRow] as string | null);

    // Séneca ya no reporta baja: el alumno ha vuelto a estar matriculado activo.
    if (fila.estado_matricula === null && existente.estado_matricula !== null) {
      cambios.push({ campo: "estado_matricula", antes: existente.estado_matricula, despues: null });
      patch.estado_matricula = null;
    } else if (fila.estado_matricula !== null && fila.estado_matricula !== existente.estado_matricula) {
      cambios.push({ campo: "estado_matricula", antes: existente.estado_matricula, despues: fila.estado_matricula });
      patch.estado_matricula = fila.estado_matricula;
    }

    if (cambios.length === 0) {
      sinCambios++;
      continue;
    }

    actualizar.push({ id: existente.id, alumno: existente.alumno, cambios, patch });
  }

  // Alumnos activos que ya no aparecen en el fichero: posible baja.
  // Se excluyen los que están pendientes de resolver una ambigüedad de nombre:
  // siguen matriculados, solo falta el NIE para identificarlos con certeza.
  const bajas: FilaBaja[] = db
    .filter((a) => !emparejados.has(a.id) && !enConflicto.has(a.id))
    .filter((a) => a.estado_matricula === null)
    .map((a) => ({ id: a.id, alumno: a.alumno, unidad: a.unidad }));

  return { actualizar, nuevos, bajas, ambiguos, sinCambios, totalCsv: filas.length };
}

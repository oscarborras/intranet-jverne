// Parsing and diffing of the "PERSONAL DEL CENTRO" staff export from Séneca.
//
// The export carries a "Cuenta Google/Microsoft" column, but that is the Séneca
// corporate account and NOT the account used to sign in to the intranet, so it is
// deliberately ignored. Emails are assigned by hand during the import wizard.

export interface ProfesorCsvRow {
  profesor: string;
  dni: string | null;
  puesto: string;
  fecha_alta: string | null;
  fecha_cese: string | null;
}

export interface ProfesorDbRow {
  id: string;
  profesor: string;
  puesto: string;
  dni: string | null;
  email: string | null;
  fecha_alta: string | null;
  fecha_cese: string | null;
}

// Fields the import may write. `email` never comes from the CSV — only from step 4.
export type CampoImportable = "profesor" | "puesto" | "dni" | "email" | "fecha_alta" | "fecha_cese";

// Fields actually read from the CSV.
type CampoCsv = "profesor" | "puesto" | "dni" | "fecha_alta" | "fecha_cese";

export interface CampoCambio {
  campo: CampoImportable;
  antes: string | null;
  despues: string | null;
}

export interface FilaActualizar {
  id: string;
  profesor: string;
  cambios: CampoCambio[];
  patch: Partial<Record<CampoImportable, string | null>>;
}

export interface FilaNueva {
  clave: string;
  profesor: string;
  puesto: string;
  dni: string | null;
  fecha_alta: string | null;
  fecha_cese: string | null;
}

export interface FilaBaja {
  id: string;
  profesor: string;
  puesto: string;
}

export interface DiffImportacion {
  actualizar: FilaActualizar[];
  nuevos: FilaNueva[];
  bajas: FilaBaja[];
  sinCambios: number;
  totalCsv: number;
}

export const ETIQUETA_CAMPO: Record<CampoImportable, string> = {
  profesor: "Nombre",
  puesto: "Puesto",
  dni: "DNI",
  email: "Email",
  fecha_alta: "Fecha de alta",
  fecha_cese: "Fecha de cese",
};

// ─── CSV parsing ──────────────────────────────────────────────────────────────

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
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
  profesor:   ["empleado/a", "empleado", "empleada"],
  dni:        ["dni/pasaporte", "dni", "nif"],
  puesto:     ["puesto"],
  fecha_alta: ["fecha de toma de posesion", "fecha toma de posesion", "fecha de alta"],
  fecha_cese: ["fecha de cese", "fecha cese"],
};

function findHeader(rows: string[][]): { index: number; map: Partial<Record<CampoCsv, number>> } | null {
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const cells = rows[i].map(normalize);
    const map: Partial<Record<CampoCsv, number>> = {};
    for (const [campo, alias] of Object.entries(COLUMNAS) as [CampoCsv, string[]][]) {
      const pos = cells.findIndex((c) => alias.includes(c));
      if (pos !== -1) map[campo] = pos;
    }
    if (map.profesor !== undefined && map.puesto !== undefined) return { index: i, map };
  }
  return null;
}

function toIsoDate(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  const m = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return null;
}

export class CsvFormatError extends Error {}

export function parseProfesoresCsv(text: string): ProfesorCsvRow[] {
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
      "No se ha encontrado la fila de cabecera. Comprueba que el fichero es el CSV exportado de Séneca y que contiene las columnas \"Empleado/a\" y \"Puesto\"."
    );
  }

  const { index, map } = header;
  const cell = (r: string[], campo: CampoCsv): string => {
    const pos = map[campo];
    return pos === undefined ? "" : (r[pos] ?? "").trim();
  };

  const out: ProfesorCsvRow[] = [];
  for (let i = index + 1; i < rows.length; i++) {
    const r = rows[i];
    const profesor = cell(r, "profesor");
    if (!profesor) continue;
    out.push({
      profesor,
      dni: cell(r, "dni") || null,
      puesto: cell(r, "puesto"),
      fecha_alta: toIsoDate(cell(r, "fecha_alta")),
      fecha_cese: toIsoDate(cell(r, "fecha_cese")),
    });
  }

  if (out.length === 0) {
    throw new CsvFormatError("El fichero no contiene ninguna fila de profesorado.");
  }
  return out;
}

// ─── Diff ─────────────────────────────────────────────────────────────────────

function claveDe(row: { dni: string | null; profesor: string }): string {
  if (row.dni) return `dni:${row.dni.toUpperCase()}`;
  return `nombre:${normalize(row.profesor)}`;
}

// Séneca lists one row per contract: keep the most recent appointment per person.
function dedupe(filas: ProfesorCsvRow[]): ProfesorCsvRow[] {
  const porClave = new Map<string, ProfesorCsvRow>();
  for (const fila of filas) {
    const clave = claveDe(fila);
    const previa = porClave.get(clave);
    if (!previa || (fila.fecha_alta ?? "") > (previa.fecha_alta ?? "")) {
      porClave.set(clave, fila);
    }
  }
  return [...porClave.values()];
}

export function calcularDiff(csv: ProfesorCsvRow[], db: ProfesorDbRow[], hoy: string): DiffImportacion {
  const filas = dedupe(csv);

  const porDni = new Map<string, ProfesorDbRow>();
  const porNombre = new Map<string, ProfesorDbRow>();
  for (const p of db) {
    if (p.dni) porDni.set(p.dni.toUpperCase(), p);
    porNombre.set(normalize(p.profesor), p);
  }

  const actualizar: FilaActualizar[] = [];
  const nuevos: FilaNueva[] = [];
  const emparejados = new Set<string>();
  let sinCambios = 0;

  for (const fila of filas) {
    const existente =
      (fila.dni ? porDni.get(fila.dni.toUpperCase()) : undefined) ??
      porNombre.get(normalize(fila.profesor));

    if (!existente) {
      nuevos.push({
        clave: claveDe(fila),
        profesor: fila.profesor,
        puesto: fila.puesto,
        dni: fila.dni,
        fecha_alta: fila.fecha_alta,
        fecha_cese: fila.fecha_cese,
      });
      continue;
    }

    // Two CSV rows resolving to the same person: the first one already won.
    if (emparejados.has(existente.id)) continue;
    emparejados.add(existente.id);

    const cambios: CampoCambio[] = [];
    const patch: Partial<Record<CampoImportable, string | null>> = {};
    const comparar = (campo: CampoImportable, nuevo: string | null) => {
      const antes = existente[campo as keyof ProfesorDbRow] as string | null ?? null;
      if (nuevo !== null && nuevo !== antes) {
        cambios.push({ campo, antes, despues: nuevo });
        patch[campo] = nuevo;
      }
    };

    comparar("puesto", fila.puesto || null);
    comparar("dni", fila.dni);
    comparar("fecha_alta", fila.fecha_alta);
    comparar("fecha_cese", fila.fecha_cese);

    // Séneca no longer reports a cese date: the contract was extended.
    if (fila.fecha_cese === null && existente.fecha_cese !== null) {
      cambios.push({ campo: "fecha_cese", antes: existente.fecha_cese, despues: null });
      patch.fecha_cese = null;
    }

    if (cambios.length === 0) {
      sinCambios++;
      continue;
    }

    actualizar.push({ id: existente.id, profesor: existente.profesor, cambios, patch });
  }

  // Active professors missing from the export have left the school.
  const bajas: FilaBaja[] = db
    .filter((p) => !emparejados.has(p.id))
    .filter((p) => p.fecha_cese === null || p.fecha_cese > hoy)
    .map((p) => ({ id: p.id, profesor: p.profesor, puesto: p.puesto }));

  return { actualizar, nuevos, bajas, sinCambios, totalCsv: filas.length };
}

// Parsing of barcode lists typed or scanned by the user: single codes and ranges.

/** Largest number of codes a list may expand to (ranges included) */
export const MAX_CODIGOS_LISTA = 2000;

export interface CodigosParseados {
  /** Every code, in the order written, without duplicates */
  codigos: string[];
  /** Codes written one by one (not coming from a range) */
  sueltos: Set<string>;
  /** Ranges that could not be understood, as written */
  errores: string[];
}

const CODIGO = /^([A-Z]*)(\d+)$/;

/**
 * Expands "JV000010-JV000020" (also "JV000010-20" or "JV000010..JV000020")
 * into every code in between, keeping the prefix and the zero padding.
 * Returns null when it is not a valid range.
 */
export function expandirIntervalo(desde: string, hasta: string): string[] | null {
  const a = desde.trim().toUpperCase().match(CODIGO);
  const b = hasta.trim().toUpperCase().match(CODIGO);
  if (!a || !b) return null;
  const prefijo = a[1];
  // The end may omit the prefix ("JV000010-20")
  if (b[1] && b[1] !== prefijo) return null;
  const ini = parseInt(a[2], 10);
  const fin = parseInt(b[2], 10);
  if (fin < ini || fin - ini + 1 > MAX_CODIGOS_LISTA) return null;
  const ancho = a[2].length;
  const out: string[] = [];
  for (let n = ini; n <= fin; n++) out.push(prefijo + String(n).padStart(ancho, "0"));
  return out;
}

/** Splits the text into codes; "A-B" / "A..B" tokens are expanded as ranges. */
export function parseListaCodigos(texto: string): CodigosParseados {
  const vistos = new Set<string>();
  const codigos: string[] = [];
  const sueltos = new Set<string>();
  const errores: string[] = [];

  // Allow spaces around the range separator ("JV1 - JV5")
  const normalizado = texto.toUpperCase().replace(/\s*(-|\.\.)\s*/g, "$1");
  for (const token of normalizado.split(/[\s,;]+/).filter(Boolean)) {
    const partes = token.split(/-|\.\./);
    if (partes.length === 2) {
      const rango = expandirIntervalo(partes[0], partes[1]);
      if (!rango) { errores.push(token); continue; }
      for (const c of rango) if (!vistos.has(c)) { vistos.add(c); codigos.push(c); }
    } else if (partes.length === 1) {
      if (!vistos.has(token)) { vistos.add(token); codigos.push(token); }
      sueltos.add(token);
    } else {
      errores.push(token);
    }
    if (codigos.length > MAX_CODIGOS_LISTA) break;
  }
  return { codigos: codigos.slice(0, MAX_CODIGOS_LISTA), sueltos, errores };
}

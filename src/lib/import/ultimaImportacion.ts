// Date of the last Séneca import of each entity, stored by the import routes in
// config_intranet as "ultima_importacion_<entidad>" = "YYYY-MM-DD".

import type { SupabaseClient } from "@supabase/supabase-js";

export type EntidadImportable = "alumnos" | "profesores" | "autorizados";

export type UltimasImportaciones = Partial<Record<EntidadImportable, string>>;

/** Reads the last import date of the given entities (config_intranet is readable by any authenticated user). */
export async function getUltimasImportaciones(
  supabase: SupabaseClient,
  entidades: EntidadImportable[],
): Promise<UltimasImportaciones> {
  const { data } = await supabase
    .from("config_intranet")
    .select("clave, valor")
    .in("clave", entidades.map((e) => `ultima_importacion_${e}`));

  const result: UltimasImportaciones = {};
  for (const row of (data ?? []) as { clave: string; valor: string | null }[]) {
    if (row.valor) result[row.clave.replace("ultima_importacion_", "") as EntidadImportable] = row.valor;
  }
  return result;
}

/** "YYYY-MM-DD" → "DD/MM/YYYY"; "Nunca" when there was no import. */
export function formatUltimaImportacion(fecha: string | undefined | null): string {
  if (!fecha) return "Nunca";
  const [y, m, d] = fecha.split("-");
  return d && m && y ? `${d}/${m}/${y}` : fecha;
}

// Server-side helpers for group lists shown in Gratuidad v2 filters.
import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AlumnoPendienteV2 } from "@/lib/types/gratuidadV2";

/**
 * Groups whose students hold books right now (from gplv2_alumnos_pendientes),
 * sorted. With `incluirBajas`, also the delivery-time group of students who have
 * left the school; without it, only groups of current students.
 */
export async function gruposConLibrosPrestados(supabase: SupabaseClient, incluirBajas: boolean): Promise<string[]> {
  const grupos = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.rpc("gplv2_alumnos_pendientes").select("grupo, baja").range(from, from + 999);
    if (error) break;
    const filas = (data ?? []) as Pick<AlumnoPendienteV2, "grupo" | "baja">[];
    filas.forEach((r) => { if (r.grupo && (incluirBajas || !r.baja)) grupos.add(r.grupo); });
    if (filas.length < 1000) break;
  }
  return [...grupos].sort((a, b) => a.localeCompare(b, "es"));
}

import type { SupabaseClient } from "@supabase/supabase-js";

export const DEFAULT_DIAS_VISTA_FINALIZADAS = 30;
export const HISTORIAL_PAGE_SIZE = 20;

// Days finished requests stay on the kanban, read from config_intranet
export async function getFinalizadasCutoff(
  supabase: SupabaseClient
): Promise<{ dias: number; cutoff: string }> {
  const { data } = await supabase
    .from("config_intranet")
    .select("valor")
    .eq("clave", "dias_vista_finalizadas")
    .maybeSingle();
  const parsed = parseInt(data?.valor ?? "", 10);
  const dias = parsed > 0 ? parsed : DEFAULT_DIAS_VISTA_FINALIZADAS;
  const cutoff = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString();
  return { dias, cutoff };
}

// Strips characters with meaning in PostgREST filter syntax so user input can go inside .or()
export function sanitizeSearch(value: string | undefined): string {
  return (value ?? "").replace(/[,()*%\\:"]/g, " ").trim().slice(0, 100);
}

export function isValidDateStr(value: string | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function parsePage(value: string | undefined): number {
  const n = parseInt(value ?? "1", 10);
  return n > 0 ? n : 1;
}

// Mirrors the DB trigger locally so a card moved to "finalizada" stays on the board
export function applyFinalizadaAt<T extends { estado: string; finalizada_at: string | null }>(
  prev: T,
  next: T
): T {
  if (next.estado === "finalizada" && prev.estado !== "finalizada") {
    return { ...next, finalizada_at: new Date().toISOString() };
  }
  if (next.estado !== "finalizada" && next.estado !== "eliminada") {
    return { ...next, finalizada_at: null };
  }
  return next;
}

export function finalizadasColumnInfo(dias: number, recientes: number, antiguas: number, historialHref: string) {
  return {
    subtitle: `Últimos ${dias} días · ${recientes + antiguas} en total`,
    footerHref: historialHref,
    footerLabel: "Ver histórico",
  };
}

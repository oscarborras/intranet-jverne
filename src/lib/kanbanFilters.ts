import { matchesAllWords, searchWords } from "@/lib/text";
import type { PeticionPrioridad } from "@/lib/types";

// Board filters for the TIC and maintenance kanbans. Kept in the URL so they
// survive a reload and can be shared: ?q=proyector&prioridad=urgente,alta&mias=1&asignado=me

export const PRIORIDADES_FILTRO: { id: PeticionPrioridad; label: string }[] = [
  { id: "urgente", label: "Urgente" },
  { id: "alta", label: "Alta" },
  { id: "normal", label: "Normal" },
  { id: "baja", label: "Baja" },
];

/** "" = everyone, "me" = assigned to me, "none" = unassigned, otherwise a user id */
export type AsignadoFiltro = string;

export interface KanbanFilterState {
  q: string;
  prioridades: PeticionPrioridad[];
  /** Only requests I created */
  mias: boolean;
  asignado: AsignadoFiltro;
}

export const EMPTY_KANBAN_FILTERS: KanbanFilterState = { q: "", prioridades: [], mias: false, asignado: "" };

const PRIORIDAD_IDS = new Set<string>(PRIORIDADES_FILTRO.map((p) => p.id));

export function parseKanbanFilters(params: URLSearchParams): KanbanFilterState {
  return {
    q: params.get("q") ?? "",
    prioridades: (params.get("prioridad") ?? "")
      .split(",")
      .filter((p): p is PeticionPrioridad => PRIORIDAD_IDS.has(p)),
    mias: params.get("mias") === "1",
    asignado: params.get("asignado") ?? "",
  };
}

/** Writes the filters into `params`, removing the ones that are not active. */
export function writeKanbanFilters(params: URLSearchParams, f: KanbanFilterState): URLSearchParams {
  const out = new URLSearchParams(params);
  const set = (key: string, value: string) => (value ? out.set(key, value) : out.delete(key));
  set("q", f.q.trim());
  set("prioridad", f.prioridades.join(","));
  set("mias", f.mias ? "1" : "");
  set("asignado", f.asignado);
  return out;
}

export function isKanbanFilterActive(f: KanbanFilterState): boolean {
  return f.q.trim() !== "" || f.prioridades.length > 0 || f.mias || f.asignado !== "";
}

interface FilterableItem {
  prioridad: PeticionPrioridad;
  autor_id: string;
  asignado_id?: string | null;
}

/**
 * Applies the filters. `searchText` returns the text the query is matched against
 * (code, title, description... per module); every typed word must appear in it.
 */
export function filterKanbanItems<T extends FilterableItem>(
  items: T[],
  f: KanbanFilterState,
  userId: string,
  searchText: (item: T) => string
): T[] {
  const words = searchWords(f.q);
  return items.filter((item) => {
    if (f.prioridades.length > 0 && !f.prioridades.includes(item.prioridad)) return false;
    if (f.mias && item.autor_id !== userId) return false;
    if (f.asignado === "me" && item.asignado_id !== userId) return false;
    if (f.asignado === "none" && item.asignado_id) return false;
    if (f.asignado && f.asignado !== "me" && f.asignado !== "none" && item.asignado_id !== f.asignado) return false;
    return matchesAllWords(searchText(item), words);
  });
}

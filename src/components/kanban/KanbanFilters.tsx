"use client";

import { Search, X, User } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  EMPTY_KANBAN_FILTERS,
  PRIORIDADES_FILTRO,
  isKanbanFilterActive,
  type KanbanFilterState,
} from "@/lib/kanbanFilters";
import type { PeticionPrioridad } from "@/lib/types";

export interface AsignadoOption {
  id: string;
  label: string;
}

interface Props {
  value: KanbanFilterState;
  onChange: (next: KanbanFilterState) => void;
  /** Cards visible after filtering / cards on the board */
  shown: number;
  total: number;
  searchPlaceholder: string;
  /** Pass the options to show the "Asignado a" selector (TIC only) */
  asignadoOptions?: AsignadoOption[];
}

const PRIORITY_ACTIVE: Record<PeticionPrioridad, string> = {
  urgente: "bg-red-100 text-red-700 border-red-300",
  alta: "bg-yellow-100 text-yellow-700 border-yellow-300",
  normal: "bg-blue-100 text-blue-700 border-blue-300",
  baja: "bg-gray-200 text-gray-700 border-gray-300",
};

// Search + filter bar shown above a kanban board
export function KanbanFilters({ value, onChange, shown, total, searchPlaceholder, asignadoOptions }: Props) {
  const active = isKanbanFilterActive(value);

  function togglePrioridad(p: PeticionPrioridad) {
    const prioridades = value.prioridades.includes(p)
      ? value.prioridades.filter((x) => x !== p)
      : [...value.prioridades, p];
    onChange({ ...value, prioridades });
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3 space-y-3">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        {/* Text search */}
        <div className="relative flex-1 min-w-0">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true" />
          <input
            type="search"
            value={value.q}
            onChange={(e) => onChange({ ...value, q: e.target.value })}
            placeholder={searchPlaceholder}
            aria-label="Buscar peticiones"
            className="w-full border border-gray-200 rounded-lg pl-9 pr-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {value.q && (
            <button
              type="button"
              onClick={() => onChange({ ...value, q: "" })}
              aria-label="Borrar búsqueda"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Priority toggles */}
        <div role="group" aria-label="Filtrar por prioridad" className="flex flex-wrap gap-1.5">
          {PRIORIDADES_FILTRO.map((p) => {
            const on = value.prioridades.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => togglePrioridad(p.id)}
                aria-pressed={on}
                className={cn(
                  "px-3 py-2 min-h-[38px] rounded-lg border text-xs font-medium transition-colors",
                  on ? PRIORITY_ACTIVE[p.id] : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Mine only */}
        <button
          type="button"
          onClick={() => onChange({ ...value, mias: !value.mias })}
          aria-pressed={value.mias}
          className={cn(
            "flex items-center justify-center gap-1.5 px-3 py-2 min-h-[38px] rounded-lg border text-xs font-medium whitespace-nowrap transition-colors",
            value.mias ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
          )}
        >
          <User size={14} /> Solo las mías
        </button>

        {/* Assigned to (TIC) */}
        {asignadoOptions && (
          <select
            value={value.asignado}
            onChange={(e) => onChange({ ...value, asignado: e.target.value })}
            aria-label="Filtrar por persona asignada"
            className="border border-gray-200 rounded-lg px-3 py-2 min-h-[38px] text-xs text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Asignado a: todos</option>
            {asignadoOptions.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        )}
      </div>

      {active && (
        <div className="flex items-center justify-between gap-3 text-xs">
          <p className="text-gray-500" aria-live="polite">
            Mostrando <strong className="text-gray-800">{shown}</strong> de {total} peticiones
          </p>
          <button
            type="button"
            onClick={() => onChange(EMPTY_KANBAN_FILTERS)}
            className="flex items-center gap-1 px-2 py-1.5 rounded-md text-blue-600 font-medium hover:bg-blue-50"
          >
            <X size={12} /> Limpiar filtros
          </button>
        </div>
      )}
    </div>
  );
}

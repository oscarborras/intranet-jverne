"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { cursoDeUnidad } from "@/lib/alumnado";

interface Props {
  grupos: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

interface Level {
  name: string;
  grupos: string[];
}

// Multi-select of groups, laid out by level ("2º ESO" → A, B, C, D). Any
// combination is allowed, across levels too; whole levels toggle with one tap.
export function GruposSelector({ grupos, selected, onChange }: Props) {
  const levels = useMemo<Level[]>(() => {
    const map = new Map<string, string[]>();
    grupos.forEach((g) => {
      const level = cursoDeUnidad(g);
      map.set(level, [...(map.get(level) ?? []), g]);
    });
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b, "es"))
      .map(([name, gs]) => ({ name, grupos: gs.sort((a, b) => a.localeCompare(b, "es")) }));
  }, [grupos]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  function toggle(grupo: string) {
    onChange(selectedSet.has(grupo) ? selected.filter((g) => g !== grupo) : [...selected, grupo]);
  }

  function toggleLevel(level: Level) {
    const allSelected = level.grupos.every((g) => selectedSet.has(g));
    onChange(allSelected
      ? selected.filter((g) => !level.grupos.includes(g))
      : [...selected, ...level.grupos.filter((g) => !selectedSet.has(g))]);
  }

  return (
    <div className="space-y-2">
      <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
        {levels.map((level) => {
          const allSelected = level.grupos.every((g) => selectedSet.has(g));
          return (
            <div key={level.name} className="px-3 py-2">
              {level.grupos.length > 1 && (
                <button
                  type="button"
                  onClick={() => toggleLevel(level)}
                  aria-pressed={allSelected}
                  className={cn(
                    "mb-1.5 min-h-8 px-2.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer",
                    allSelected
                      ? "bg-blue-600 border-blue-600 text-white hover:bg-blue-700"
                      : "bg-white border-gray-300 text-gray-700 hover:bg-gray-100"
                  )}
                >
                  Todo {level.name}
                </button>
              )}
              <div className="flex flex-wrap gap-1.5">
                {level.grupos.map((g) => {
                  const checked = selectedSet.has(g);
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => toggle(g)}
                      aria-pressed={checked}
                      className={cn(
                        "min-h-9 px-3 text-sm rounded-lg border transition-colors cursor-pointer",
                        checked
                          ? "bg-blue-50 border-blue-500 text-blue-700 font-medium"
                          : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                      )}
                    >
                      {g}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-gray-500">
          {selected.length === 0 ? "Ningún grupo seleccionado" : `${selected.length} ${selected.length === 1 ? "grupo seleccionado" : "grupos seleccionados"}`}
        </span>
        {selected.length > 0 && (
          <button type="button" onClick={() => onChange([])} className="text-gray-500 hover:text-red-600 underline cursor-pointer">
            Quitar todos
          </button>
        )}
      </div>
    </div>
  );
}

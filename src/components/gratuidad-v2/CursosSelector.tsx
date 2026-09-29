"use client";

import { useMemo } from "react";
import { agruparPorNivel } from "@/lib/gratuidadV2/cursos";
import { cn } from "@/lib/utils";

interface Props {
  cursos: string[];
  seleccion: Set<string>;
  onChange: (seleccion: Set<string>) => void;
}

/** Course picker grouped by level: tap a level to toggle all its groups at once. */
export function CursosSelector({ cursos, seleccion, onChange }: Props) {
  const niveles = useMemo(() => agruparPorNivel(cursos), [cursos]);

  function toggle(lista: string[], activar: boolean) {
    const next = new Set(seleccion);
    lista.forEach((c) => (activar ? next.add(c) : next.delete(c)));
    onChange(next);
  }

  if (cursos.length === 0) {
    return <p className="text-sm text-gray-400">No hay cursos configurados.</p>;
  }

  return (
    <div className="space-y-2">
      {niveles.map(({ nivel, cursos: grupos }) => {
        const marcados = grupos.filter((g) => seleccion.has(g)).length;
        const todos = marcados === grupos.length;
        return (
          <div key={nivel} className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => toggle(grupos, !todos)}
              aria-pressed={todos}
              className={cn(
                "px-3 py-2 rounded-lg text-sm font-semibold border transition-colors min-w-[5.5rem] text-left",
                todos
                  ? "bg-blue-600 border-blue-600 text-white"
                  : marcados > 0
                    ? "bg-blue-50 border-blue-300 text-blue-800"
                    : "bg-white border-gray-300 text-gray-700 hover:border-gray-400",
              )}
            >
              {nivel}
            </button>
            {grupos.length > 1 && grupos.map((g) => {
              const on = seleccion.has(g);
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => toggle([g], !on)}
                  aria-pressed={on}
                  aria-label={g}
                  className={cn(
                    "px-2.5 py-2 rounded-lg text-xs font-medium border transition-colors",
                    on ? "bg-blue-100 border-blue-300 text-blue-800" : "bg-white border-gray-200 text-gray-500 hover:border-gray-300",
                  )}
                >
                  {g.slice(nivel.length).trim() || g}
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

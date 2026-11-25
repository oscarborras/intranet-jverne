"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ChevronDown } from "lucide-react";
import { agruparPorNivel } from "@/lib/gratuidadV2/cursos";
import { cn } from "@/lib/utils";

interface Props {
  /** Courses in the free-textbook programme (shown first) */
  cursos: string[];
  /** Other school courses, offered in a collapsible section */
  otrosCursos?: string[];
  /** Active students per group, to flag groups nobody would receive the lot in */
  alumnosPorCurso?: Record<string, number>;
  seleccion: Set<string>;
  onChange: (seleccion: Set<string>) => void;
}

/** Course picker grouped by level: tap a level to toggle all its groups at once. */
export function CursosSelector({ cursos, otrosCursos = [], alumnosPorCurso, seleccion, onChange }: Props) {
  // The other courses start folded unless the lot already uses one of them
  const [verOtros, setVerOtros] = useState(() => otrosCursos.some((c) => seleccion.has(c)));
  const marcadosOtros = otrosCursos.filter((c) => seleccion.has(c)).length;
  const sinAlumnos = alumnosPorCurso
    ? [...seleccion].filter((c) => (alumnosPorCurso[c] ?? 0) === 0).sort((a, b) => a.localeCompare(b, "es"))
    : [];

  function toggle(lista: string[], activar: boolean) {
    const next = new Set(seleccion);
    lista.forEach((c) => (activar ? next.add(c) : next.delete(c)));
    onChange(next);
  }

  if (cursos.length === 0 && otrosCursos.length === 0) {
    return <p className="text-sm text-gray-400">No hay cursos configurados.</p>;
  }

  return (
    <div className="space-y-3">
      {cursos.length > 0 && (
        <Niveles cursos={cursos} seleccion={seleccion} alumnosPorCurso={alumnosPorCurso} onToggle={toggle} />
      )}

      {otrosCursos.length > 0 && (
        <div className="border border-gray-200 rounded-lg">
          <button
            type="button"
            onClick={() => setVerOtros((v) => !v)}
            aria-expanded={verOtros}
            className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
          >
            <span>
              {cursos.length > 0 ? "Otros cursos" : "Cursos"}
              {marcadosOtros > 0 && <span className="ml-2 text-xs font-semibold text-blue-700">{marcadosOtros} marcado{marcadosOtros > 1 ? "s" : ""}</span>}
            </span>
            <ChevronDown size={16} className={cn("text-gray-400 transition-transform", verOtros && "rotate-180")} />
          </button>
          {verOtros && (
            <div className="px-3 pb-3 pt-1">
              <Niveles cursos={otrosCursos} seleccion={seleccion} alumnosPorCurso={alumnosPorCurso} onToggle={toggle} />
            </div>
          )}
        </div>
      )}

      {sinAlumnos.length > 0 && (
        <p className="flex items-start gap-1.5 text-xs text-amber-700">
          <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
          Sin alumnos matriculados: {sinAlumnos.join(", ")}. El lote no se aplicará a nadie en {sinAlumnos.length > 1 ? "esos grupos" : "ese grupo"}.
        </p>
      )}
    </div>
  );
}

interface NivelesProps {
  cursos: string[];
  seleccion: Set<string>;
  alumnosPorCurso?: Record<string, number>;
  onToggle: (lista: string[], activar: boolean) => void;
}

function Niveles({ cursos, seleccion, alumnosPorCurso, onToggle }: NivelesProps) {
  const niveles = useMemo(() => agruparPorNivel(cursos), [cursos]);
  const alumnos = (lista: string[]) => lista.reduce((s, c) => s + (alumnosPorCurso?.[c] ?? 0), 0);

  return (
    <div className="space-y-2">
      {niveles.map(({ nivel, cursos: grupos }) => {
        const marcados = grupos.filter((g) => seleccion.has(g)).length;
        const todos = marcados === grupos.length;
        const nNivel = alumnos(grupos);
        return (
          <div key={nivel} className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => onToggle(grupos, !todos)}
              aria-pressed={todos}
              title={alumnosPorCurso ? `${nNivel} alumnos` : undefined}
              className={cn(
                "px-3 py-2 rounded-lg text-sm font-semibold border transition-colors min-w-[5.5rem] text-left",
                todos
                  ? "bg-blue-600 border-blue-600 text-white"
                  : marcados > 0
                    ? "bg-blue-50 border-blue-300 text-blue-800"
                    : "bg-white border-gray-300 text-gray-700 hover:border-gray-400",
                alumnosPorCurso && nNivel === 0 && !todos && "opacity-50",
              )}
            >
              {nivel}
              {alumnosPorCurso && grupos.length === 1 && (
                <span className={cn("ml-1.5 text-xs font-normal", todos ? "text-blue-100" : "text-gray-400")}>{nNivel}</span>
              )}
            </button>
            {grupos.length > 1 && grupos.map((g) => {
              const on = seleccion.has(g);
              const n = alumnosPorCurso?.[g] ?? 0;
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => onToggle([g], !on)}
                  aria-pressed={on}
                  aria-label={alumnosPorCurso ? `${g}, ${n} alumnos` : g}
                  className={cn(
                    "px-2.5 py-2 rounded-lg text-xs font-medium border transition-colors",
                    on ? "bg-blue-100 border-blue-300 text-blue-800" : "bg-white border-gray-200 text-gray-500 hover:border-gray-300",
                    alumnosPorCurso && n === 0 && !on && "opacity-50",
                  )}
                >
                  {g.slice(nivel.length).trim() || g}
                  {alumnosPorCurso && <span className="ml-1 font-normal text-gray-400">{n}</span>}
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

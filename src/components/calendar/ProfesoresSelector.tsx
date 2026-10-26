"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { useTextFilter } from "@/lib/useTextFilter";

export interface ProfesorOpcion {
  id: string;
  profesor: string;
  /** false for teachers no longer at the school: only listed when already selected */
  activo: boolean;
}

interface Props {
  profesores: ProfesorOpcion[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

const textoProfesor = (p: ProfesorOpcion) => p.profesor;

// Multi-select of teachers: selected ones are shown as removable chips, the rest
// are found with an accent/case-insensitive search box.
export function ProfesoresSelector({ profesores, selected, onChange }: Props) {
  const [busqueda, setBusqueda] = useState("");

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const byId = useMemo(() => new Map(profesores.map((p) => [p.id, p])), [profesores]);
  const disponibles = useMemo(
    () => profesores.filter((p) => p.activo && !selectedSet.has(p.id)),
    [profesores, selectedSet],
  );
  const resultados = useTextFilter(disponibles, textoProfesor, busqueda);

  function add(id: string) {
    onChange([...selected, id]);
    setBusqueda("");
  }

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Profesores seleccionados">
          {selected.map((id) => (
            <li
              key={id}
              className="inline-flex items-center gap-1 min-h-9 pl-3 pr-1 text-sm rounded-lg border border-blue-500 bg-blue-50 text-blue-700 font-medium"
            >
              {byId.get(id)?.profesor ?? "Profesor/a desconocido"}
              <button
                type="button"
                onClick={() => onChange(selected.filter((s) => s !== id))}
                className="p-1.5 rounded-md hover:bg-blue-100 cursor-pointer"
                aria-label={`Quitar a ${byId.get(id)?.profesor ?? "este profesor/a"}`}
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar profesor/a para añadir..."
          aria-label="Buscar profesor/a para añadir"
          className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {busqueda.trim() && (
        <ul className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
          {resultados.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-400">Sin resultados</li>
          ) : (
            resultados.slice(0, 30).map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => add(p.id)}
                  className="w-full text-left min-h-10 px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 cursor-pointer"
                >
                  {p.profesor}
                </button>
              </li>
            ))
          )}
        </ul>
      )}

      <p className="text-xs text-gray-500">
        {selected.length === 0
          ? "Ningún profesor/a seleccionado"
          : `${selected.length} ${selected.length === 1 ? "profesor/a seleccionado" : "profesores seleccionados"}`}
      </p>
    </div>
  );
}

"use client";

import { PERIODOS, type Periodo } from "@/lib/estadisticas";

interface Props {
  value: Periodo;
  onChange: (periodo: Periodo) => void;
}

// One filter row above everything it scopes (the whole statistics page)
export function PeriodoSelector({ value, onChange }: Props) {
  return (
    <div role="group" aria-label="Periodo" className="flex flex-wrap bg-gray-100 rounded-lg p-1 gap-1 w-fit max-w-full">
      {PERIODOS.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onChange(p.id)}
          aria-pressed={value === p.id}
          className={`px-4 py-2 min-h-[40px] rounded-md text-sm font-medium transition-colors ${
            value === p.id ? "bg-white shadow-sm text-blue-700" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

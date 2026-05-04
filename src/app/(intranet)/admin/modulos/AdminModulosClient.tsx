"use client";

import { useState } from "react";
import { Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { ModuloConfig } from "@/lib/types";

interface Props {
  initialModulos: ModuloConfig[];
}

export function AdminModulosClient({ initialModulos }: Props) {
  const [modulos, setModulos] = useState<ModuloConfig[]>(initialModulos);

  async function toggleModulo(id: number, activo: boolean) {
    const supabase = createClient();
    await supabase.from("modulos_config").update({ activo: !activo }).eq("id", id);
    setModulos((prev) => prev.map((m) => (m.id === id ? { ...m, activo: !activo } : m)));
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Settings size={24} className="text-blue-600" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">Gestión de Módulos</h1>
          <p className="text-sm text-gray-500">Activa o desactiva módulos para todos los usuarios</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
        {modulos.map((m) => (
          <div key={m.id} className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="font-medium text-gray-900 text-sm">{m.nombre}</p>
              <p className="text-xs text-gray-500 mt-0.5">{m.descripcion}</p>
            </div>
            <button
              onClick={() => toggleModulo(m.id, m.activo)}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                m.activo ? "bg-blue-600" : "bg-gray-200"
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                  m.activo ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

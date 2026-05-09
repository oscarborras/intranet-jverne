"use client";

import { useState } from "react";
import { Settings, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { ModuloConfig } from "@/lib/types";

interface Props {
  initialModulos: ModuloConfig[];
  perfiles: { id: number; nombre: string }[];
  initialAccess: Record<number, number[]>;
}

export function AdminModulosClient({ initialModulos, perfiles, initialAccess }: Props) {
  const [modulos, setModulos] = useState<ModuloConfig[]>(initialModulos);
  const [access, setAccess] = useState<Record<number, Set<number>>>(
    () => Object.fromEntries(
      Object.entries(initialAccess).map(([k, v]) => [Number(k), new Set(v)])
    )
  );
  const [saving, setSaving] = useState<string | null>(null);

  const supabase = createClient();

  async function toggleActivo(id: number, current: boolean) {
    setSaving(`activo-${id}`);
    await supabase.from("modulos_config").update({ activo: !current }).eq("id", id);
    setModulos((prev) => prev.map((m) => (m.id === id ? { ...m, activo: !current } : m)));
    setSaving(null);
  }

  async function togglePerfil(moduloId: number, perfilId: number, currentlyEnabled: boolean) {
    setSaving(`${moduloId}-${perfilId}`);
    if (currentlyEnabled) {
      await supabase.from("modulo_perfiles").delete().eq("modulo_id", moduloId).eq("perfil_id", perfilId);
      setAccess((prev) => {
        const next = new Set(prev[moduloId] ?? []);
        next.delete(perfilId);
        return { ...prev, [moduloId]: next };
      });
    } else {
      await supabase.from("modulo_perfiles").insert({ modulo_id: moduloId, perfil_id: perfilId });
      setAccess((prev) => {
        const next = new Set(prev[moduloId] ?? []);
        next.add(perfilId);
        return { ...prev, [moduloId]: next };
      });
    }
    setSaving(null);
  }

  // Admin profile is always enabled (bypasses module checks in the app)
  const adminPerfil = perfiles.find((p) => p.nombre === "Admin");
  const configurablePerfiles = perfiles.filter((p) => p.nombre !== "Admin");

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Settings size={24} className="text-blue-600" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">Gestión de Módulos</h1>
          <p className="text-sm text-gray-500">
            Activa módulos globalmente y configura el acceso por perfil
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-500 bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-blue-600 inline-block" />
          Módulo activo globalmente
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-gray-200 inline-block" />
          Módulo desactivado (nadie lo ve)
        </span>
        <span className="flex items-center gap-1.5">
          <Lock size={13} className="text-gray-400" />
          Admin siempre tiene acceso a todo
        </span>
      </div>

      {/* Table with horizontal scroll on mobile */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-52">
                Módulo
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Global
              </th>
              {/* Admin column — always on */}
              {adminPerfil && (
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <span className="flex items-center justify-center gap-1">
                    <Lock size={11} />
                    {adminPerfil.nombre}
                  </span>
                </th>
              )}
              {configurablePerfiles.map((p) => (
                <th key={p.id} className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {p.nombre}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {modulos.map((m) => {
              const moduloAccess = access[m.id] ?? new Set<number>();
              const isGlobalSaving = saving === `activo-${m.id}`;

              return (
                <tr key={m.id} className={cn("transition-colors", !m.activo && "bg-gray-50/60")}>
                  {/* Module name */}
                  <td className="px-5 py-4">
                    <p className={cn("font-medium text-sm", m.activo ? "text-gray-900" : "text-gray-400")}>
                      {m.nombre}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{m.descripcion}</p>
                  </td>

                  {/* Global activo toggle */}
                  <td className="px-4 py-4 text-center">
                    <button
                      onClick={() => toggleActivo(m.id, m.activo)}
                      disabled={isGlobalSaving}
                      className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50",
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
                  </td>

                  {/* Admin — always checked, disabled */}
                  {adminPerfil && (
                    <td className="px-4 py-4 text-center">
                      <input
                        type="checkbox"
                        checked
                        disabled
                        className="w-4 h-4 rounded accent-blue-600 cursor-not-allowed opacity-50"
                      />
                    </td>
                  )}

                  {/* Configurable profiles */}
                  {configurablePerfiles.map((p) => {
                    const enabled = moduloAccess.has(p.id);
                    const isSaving = saving === `${m.id}-${p.id}`;
                    return (
                      <td key={p.id} className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={enabled}
                          disabled={isSaving || !m.activo}
                          onChange={() => togglePerfil(m.id, p.id, enabled)}
                          title={!m.activo ? "Activa el módulo globalmente primero" : undefined}
                          className={cn(
                            "w-4 h-4 rounded accent-blue-600 transition-opacity",
                            (isSaving || !m.activo) ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
                          )}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Los cambios se guardan automáticamente. El perfil Admin siempre tiene acceso completo.
      </p>
    </div>
  );
}

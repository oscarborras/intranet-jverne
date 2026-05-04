"use client";

import { useState } from "react";
import { Settings, Save, CheckCircle, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ConfigIntranet } from "@/lib/types";

interface Props {
  config: ConfigIntranet[];
}

// Display label for each known clave
const LABELS: Record<string, string> = {
  max_profes_asuntos_propios:    "Máximo de profesores por día",
  fecha_inicio_asuntos_propios:  "Fecha de inicio del período",
  fecha_fin_asuntos_propios:     "Fecha de fin del período",
};

// Claves that store dates as dd/MM/yyyy
const DATE_CLAVES = new Set(["fecha_inicio_asuntos_propios", "fecha_fin_asuntos_propios"]);

function ddmmyyyyToInput(val: string): string {
  const [d, m, y] = val.split("/");
  if (!d || !m || !y) return "";
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function inputToDdmmyyyy(val: string): string {
  const [y, m, d] = val.split("-");
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y}`;
}

export function ConfiguracionClient({ config }: Props) {
  // Local state: clave → current valor (in input format for dates)
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    config.forEach((row) => {
      init[row.clave] = DATE_CLAVES.has(row.clave)
        ? ddmmyyyyToInput(row.valor)
        : row.valor;
    });
    return init;
  });

  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  async function handleSave() {
    setSaving(true);
    setStatus("idle");

    const supabase = createClient();
    const now = new Date().toISOString();

    const updates = config.map((row) => {
      const raw = values[row.clave] ?? row.valor;
      const storedValue = DATE_CLAVES.has(row.clave) ? inputToDdmmyyyy(raw) : raw;
      return supabase
        .from("config_intranet")
        .update({ valor: storedValue, updated_at: now })
        .eq("clave", row.clave);
    });

    const results = await Promise.all(updates);
    const hasError = results.some((r) => r.error);

    setSaving(false);
    setStatus(hasError ? "error" : "success");
    if (!hasError) setTimeout(() => setStatus("idle"), 3000);
  }

  // Group rows by section (currently all in one section; ready for future groups)
  const asuntosRows = config.filter((r) =>
    ["max_profes_asuntos_propios", "fecha_inicio_asuntos_propios", "fecha_fin_asuntos_propios"].includes(r.clave)
  );
  const otherRows = config.filter((r) => !asuntosRows.includes(r));

  function renderField(row: ConfigIntranet) {
    const label = LABELS[row.clave] ?? row.clave;
    const isDate = DATE_CLAVES.has(row.clave);
    const isNumber = row.clave === "max_profes_asuntos_propios";

    return (
      <div key={row.clave}>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
        <p className="text-xs text-gray-400 mb-1.5">{row.descripcion}</p>
        {isNumber ? (
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={99}
              className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={values[row.clave] ?? ""}
              onChange={(e) =>
                setValues((v) => ({ ...v, [row.clave]: String(Math.max(1, parseInt(e.target.value) || 1)) }))
              }
            />
            <span className="text-sm text-gray-500">profesores simultáneos</span>
          </div>
        ) : isDate ? (
          <input
            type="date"
            className="w-full sm:w-56 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={values[row.clave] ?? ""}
            onChange={(e) =>
              setValues((v) => ({ ...v, [row.clave]: e.target.value }))
            }
          />
        ) : (
          <input
            type="text"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={values[row.clave] ?? ""}
            onChange={(e) =>
              setValues((v) => ({ ...v, [row.clave]: e.target.value }))
            }
          />
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Settings size={22} className="text-gray-500" />
          Configuración
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Parámetros generales de la intranet
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
        {/* Asuntos propios */}
        {asuntosRows.length > 0 && (
          <div className="px-6 py-5 space-y-5">
            <div>
              <h2 className="font-semibold text-gray-800 text-sm">Asuntos propios</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Límite de profesores ausentes por asuntos propios y período en que aplica.
              </p>
            </div>
            {asuntosRows.map(renderField)}
          </div>
        )}

        {/* Other params (future extensibility) */}
        {otherRows.length > 0 && (
          <div className="px-6 py-5 space-y-5">
            <h2 className="font-semibold text-gray-800 text-sm">Otros parámetros</h2>
            {otherRows.map(renderField)}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div>
          {status === "success" && (
            <span className="flex items-center gap-1.5 text-sm text-green-600">
              <CheckCircle size={16} />
              Configuración guardada correctamente
            </span>
          )}
          {status === "error" && (
            <span className="flex items-center gap-1.5 text-sm text-red-600">
              <AlertCircle size={16} />
              Error al guardar. Inténtalo de nuevo.
            </span>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors cursor-pointer"
        >
          <Save size={16} />
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}

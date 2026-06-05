"use client";

import { useState } from "react";
import { Settings, Save, CheckCircle, AlertCircle, SlidersHorizontal, UserX, BookOpen, ChevronDown } from "lucide-react";
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
  mostrar_grid_dashboard:        "Mostrar grid de módulos en el dashboard",
  mostrar_grid_dashboard_movil:  "Mostrar grid de módulos en móvil",
  modo_gratuidad_libros:         "Modo de funcionamiento",
};

// Claves that store dates as dd/MM/yyyy
const DATE_CLAVES = new Set(["fecha_inicio_asuntos_propios", "fecha_fin_asuntos_propios"]);

// Claves that store booleans as "true"/"false"
const BOOLEAN_CLAVES = new Set(["mostrar_grid_dashboard", "mostrar_grid_dashboard_movil"]);

// Claves that render as a <select> with fixed options
const SELECT_OPTIONS: Record<string, { value: string; label: string; description: string }[]> = {
  modo_gratuidad_libros: [
    { value: "prestamo",   label: "Modo Préstamo",   description: "Solo la pestaña Préstamos es visible para los profesores." },
    { value: "devolucion", label: "Modo Devolución", description: "Solo la pestaña Devoluciones es visible para los profesores." },
    { value: "completo",   label: "Modo Completo",   description: "Préstamos y Devoluciones son visibles para los profesores." },
  ],
};

// Claves grouped under the "Gratuidad Libros" tab
const GRATUIDAD_CLAVES = new Set(["modo_gratuidad_libros"]);

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

type Tab = "asuntos_propios" | "otros" | "gratuidad_libros";

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
  const [activeTab, setActiveTab] = useState<Tab>("asuntos_propios");

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
  const gratuidadRows = config.filter((r) => GRATUIDAD_CLAVES.has(r.clave));
  const otherRows = config.filter((r) => !asuntosRows.includes(r) && !gratuidadRows.includes(r));

  function renderField(row: ConfigIntranet) {
    const label = LABELS[row.clave] ?? row.clave;
    const isDate = DATE_CLAVES.has(row.clave);
    const isBoolean = BOOLEAN_CLAVES.has(row.clave);
    const isNumber = row.clave === "max_profes_asuntos_propios";
    const boolVal = values[row.clave] === "true";
    const selectOpts = SELECT_OPTIONS[row.clave];

    if (selectOpts) {
      const selected = selectOpts.find((o) => o.value === values[row.clave]) ?? selectOpts[0];
      return (
        <div key={row.clave}>
          <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
          <p className="text-xs text-gray-400 mb-1.5">{row.descripcion}</p>
          <div className="relative w-full sm:w-80">
            <select
              value={values[row.clave] ?? "completo"}
              onChange={(e) => setValues((v) => ({ ...v, [row.clave]: e.target.value }))}
              className="w-full appearance-none border border-gray-300 rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {selectOpts.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          <p className="text-xs text-blue-600 mt-1.5">{selected.description}</p>
        </div>
      );
    }

    if (isBoolean) {
      return (
        <div key={row.clave} className="flex items-center justify-between gap-4 py-1">
          <div>
            <p className="text-sm font-medium text-gray-700">{label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{row.descripcion}</p>
          </div>
          <button
            role="switch"
            aria-checked={boolVal}
            onClick={() => setValues((v) => ({ ...v, [row.clave]: boolVal ? "false" : "true" }))}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              boolVal ? "bg-blue-600" : "bg-gray-200"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                boolVal ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      );
    }

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

  const tabs: { id: Tab; label: string; icon: React.ReactNode; rows: ConfigIntranet[]; description: string }[] = ([
    {
      id: "asuntos_propios" as Tab,
      label: "Asuntos propios",
      icon: <UserX size={15} />,
      rows: asuntosRows,
      description: "Límite de profesores ausentes por asuntos propios y período en que aplica.",
    },
    {
      id: "gratuidad_libros" as Tab,
      label: "Gratuidad Libros",
      icon: <BookOpen size={15} />,
      rows: gratuidadRows,
      description: "Controla qué pestañas del módulo de gratuidad son visibles para los profesores.",
    },
    {
      id: "otros" as Tab,
      label: "Otros parámetros",
      icon: <SlidersHorizontal size={15} />,
      rows: otherRows,
      description: "Configuración general de la intranet.",
    },
  ] as { id: Tab; label: string; icon: React.ReactNode; rows: ConfigIntranet[]; description: string }[]).filter((t) => t.rows.length > 0);

  const currentTab = tabs.find((t) => t.id === activeTab) ?? tabs[0];

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

      {/* Tab bar */}
      {tabs.length > 1 && (
        <div className="flex bg-gray-100 rounded-lg p-1 w-fit gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Tab content */}
      {currentTab && (
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <p className="text-xs text-gray-400">{currentTab.description}</p>
          </div>
          <div className="px-6 py-5 space-y-5">
            {currentTab.rows.map(renderField)}
          </div>
        </div>
      )}

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

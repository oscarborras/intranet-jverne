"use client";

import { useState } from "react";
import { Settings, Save, CheckCircle, AlertCircle, SlidersHorizontal, UserX, BookOpen, ChevronDown, Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ConfigIntranet, Perfil } from "@/lib/types";

interface Props {
  config: ConfigIntranet[];
  perfiles: Pick<Perfil, "id" | "nombre">[];
}

// Display label for each known clave
const LABELS: Record<string, string> = {
  max_profes_asuntos_propios:    "Máximo de profesores por día",
  fecha_inicio_asuntos_propios:  "Fecha de inicio del período",
  fecha_fin_asuntos_propios:     "Fecha de fin del período",
  mostrar_grid_dashboard:        "Mostrar grid de módulos en el dashboard",
  mostrar_grid_dashboard_movil:  "Mostrar grid de módulos en móvil",
  modo_gratuidad_libros:         "Modo de funcionamiento",
  curso_escolar_activo:          "Curso escolar activo",
  notificaciones_ausencias_perfiles: "Módulo Ausencias",
  notificaciones_peticiones_tic_perfiles: "Módulo Peticiones TIC",
  notificaciones_peticiones_mantenimiento_perfiles: "Módulo Peticiones Mantenimiento",
};

// Claves that store dates as dd/MM/yyyy
const DATE_CLAVES = new Set(["fecha_inicio_asuntos_propios", "fecha_fin_asuntos_propios"]);

// Claves that store booleans as "true"/"false"
const BOOLEAN_CLAVES = new Set(["mostrar_grid_dashboard", "mostrar_grid_dashboard_movil"]);

// Claves that render as a <select> with fixed options
const SELECT_OPTIONS: Record<string, { value: string; label: string; description: string }[]> = {
  modo_gratuidad_libros: [
    { value: "prestamo",            label: "Modo Préstamo",              description: "Solo la pestaña Préstamos es visible para los profesores." },
    { value: "devolucion",          label: "Modo Devolución",            description: "Solo la pestaña Devoluciones es visible para los profesores." },
    { value: "completo",            label: "Modo Completo",              description: "Préstamos y Devoluciones son visibles para los profesores." },
    { value: "revision",            label: "Modo Revisión",              description: "Solo la pestaña Revisiones es visible para los profesores. El coordinador finaliza las devoluciones." },
    { value: "revision_devolucion", label: "Modo Revisión + Devoluciones", description: "Los profesores ven las pestañas Revisiones y Devoluciones." },
  ],
};

// Claves written by the app itself, never edited by hand
const HIDDEN_CLAVES = new Set(["ultima_importacion_profesores", "ultima_importacion_alumnos"]);

// Claves grouped under the "Gratuidad Libros" tab
const GRATUIDAD_CLAVES = new Set(["modo_gratuidad_libros", "curso_escolar_activo"]);

// Claves under the "Notificaciones" tab: JSON array of perfil ids that receive the module's emails
const NOTIFICACION_CLAVES = new Set(["notificaciones_ausencias_perfiles", "notificaciones_peticiones_tic_perfiles", "notificaciones_peticiones_mantenimiento_perfiles"]);

function parsePerfilIds(val: string | undefined): number[] {
  try {
    const parsed: unknown = JSON.parse(val ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((n): n is number => typeof n === "number") : [];
  } catch {
    return [];
  }
}

// Genera los cursos escolares disponibles para el selector: 4 anteriores + el siguiente
function cursosEscolaresOptions(): string[] {
  const now = new Date();
  const currentStartYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  const years: string[] = [];
  for (let y = currentStartYear + 1; y >= currentStartYear - 4; y--) {
    years.push(`${y}-${y + 1}`);
  }
  return years;
}

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

type Tab = "asuntos_propios" | "otros" | "gratuidad_libros" | "notificaciones";

interface TabAccent {
  header: string;
  iconChip: string;
  activeTab: string;
  cardBorder: string;
  checked: string;
  checkbox: string;
}

const TAB_ACCENTS: Record<Tab, TabAccent> = {
  asuntos_propios: {
    header: "bg-amber-50 border-amber-100",
    iconChip: "bg-amber-100 text-amber-700",
    activeTab: "text-amber-700",
    cardBorder: "border-l-amber-400",
    checked: "border-amber-300 bg-amber-50",
    checkbox: "accent-amber-600",
  },
  gratuidad_libros: {
    header: "bg-emerald-50 border-emerald-100",
    iconChip: "bg-emerald-100 text-emerald-700",
    activeTab: "text-emerald-700",
    cardBorder: "border-l-emerald-400",
    checked: "border-emerald-300 bg-emerald-50",
    checkbox: "accent-emerald-600",
  },
  notificaciones: {
    header: "bg-violet-50 border-violet-100",
    iconChip: "bg-violet-100 text-violet-700",
    activeTab: "text-violet-700",
    cardBorder: "border-l-violet-400",
    checked: "border-violet-300 bg-violet-50",
    checkbox: "accent-violet-600",
  },
  otros: {
    header: "bg-sky-50 border-sky-100",
    iconChip: "bg-sky-100 text-sky-700",
    activeTab: "text-sky-700",
    cardBorder: "border-l-sky-400",
    checked: "border-sky-300 bg-sky-50",
    checkbox: "accent-sky-600",
  },
};

export function ConfiguracionClient({ config, perfiles }: Props) {
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
  // Explicit display order (DB order follows created_at, which put "fin" before "inicio")
  const ASUNTOS_ORDER = ["max_profes_asuntos_propios", "fecha_inicio_asuntos_propios", "fecha_fin_asuntos_propios"];
  const asuntosRows = config
    .filter((r) => ASUNTOS_ORDER.includes(r.clave))
    .sort((a, b) => ASUNTOS_ORDER.indexOf(a.clave) - ASUNTOS_ORDER.indexOf(b.clave));
  const gratuidadRows = config.filter((r) => GRATUIDAD_CLAVES.has(r.clave));
  const notificacionRows = config.filter((r) => NOTIFICACION_CLAVES.has(r.clave));
  const otherRows = config.filter(
    (r) =>
      !asuntosRows.includes(r) &&
      !gratuidadRows.includes(r) &&
      !notificacionRows.includes(r) &&
      !HIDDEN_CLAVES.has(r.clave)
  );

  function renderField(row: ConfigIntranet, accent: TabAccent) {
    const label = LABELS[row.clave] ?? row.clave;
    const isDate = DATE_CLAVES.has(row.clave);
    const isBoolean = BOOLEAN_CLAVES.has(row.clave);
    const isNumber = row.clave === "max_profes_asuntos_propios";
    const boolVal = values[row.clave] === "true";
    const selectOpts = SELECT_OPTIONS[row.clave];

    if (NOTIFICACION_CLAVES.has(row.clave)) {
      const selectedIds = parsePerfilIds(values[row.clave]);
      const togglePerfil = (id: number) => {
        const next = selectedIds.includes(id)
          ? selectedIds.filter((x) => x !== id)
          : [...selectedIds, id].sort((a, b) => a - b);
        setValues((v) => ({ ...v, [row.clave]: JSON.stringify(next) }));
      };
      return (
        <fieldset key={row.clave}>
          <legend className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-1">
            {label}
            <span className="text-xs font-medium text-gray-500 bg-white border border-gray-200 rounded-full px-2 py-0.5">
              {selectedIds.length} {selectedIds.length === 1 ? "perfil" : "perfiles"}
            </span>
          </legend>
          <p className="text-xs text-gray-500 mb-2">{row.descripcion}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {perfiles.map((perfil) => {
              const checked = selectedIds.includes(perfil.id);
              return (
                <label
                  key={perfil.id}
                  className={`flex items-center gap-3 min-h-11 px-3 py-2 border rounded-lg cursor-pointer transition-colors ${
                    checked ? `${accent.checked} font-medium text-gray-900` : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => togglePerfil(perfil.id)}
                    className={`h-4 w-4 rounded ${accent.checkbox}`}
                  />
                  <span className="text-sm">{perfil.nombre}</span>
                </label>
              );
            })}
          </div>
          {selectedIds.length === 0 && (
            <p className="text-xs text-amber-600 mt-1.5">Ningún perfil seleccionado: no se enviarán emails.</p>
          )}
        </fieldset>
      );
    }

    if (row.clave === "curso_escolar_activo") {
      const opts = cursosEscolaresOptions();
      return (
        <div key={row.clave}>
          <label className="block text-sm font-semibold text-gray-800 mb-1">{label}</label>
          <p className="text-xs text-gray-500 mb-1.5">{row.descripcion}</p>
          <div className="relative w-full sm:w-56">
            <select
              value={values[row.clave] ?? opts[1]}
              onChange={(e) => setValues((v) => ({ ...v, [row.clave]: e.target.value }))}
              className="w-full appearance-none border border-gray-300 rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {opts.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      );
    }

    if (selectOpts) {
      const selected = selectOpts.find((o) => o.value === values[row.clave]) ?? selectOpts[0];
      return (
        <div key={row.clave}>
          <label className="block text-sm font-semibold text-gray-800 mb-1">{label}</label>
          <p className="text-xs text-gray-500 mb-1.5">{row.descripcion}</p>
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
            <p className="text-sm font-semibold text-gray-800">{label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{row.descripcion}</p>
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
        <label className="block text-sm font-semibold text-gray-800 mb-1">
          {label}
        </label>
        <p className="text-xs text-gray-500 mb-1.5">{row.descripcion}</p>
        {isNumber ? (
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={99}
              className="w-24 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={values[row.clave] ?? ""}
            onChange={(e) =>
              setValues((v) => ({ ...v, [row.clave]: e.target.value }))
            }
          />
        ) : (
          <input
            type="text"
            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={values[row.clave] ?? ""}
            onChange={(e) =>
              setValues((v) => ({ ...v, [row.clave]: e.target.value }))
            }
          />
        )}
      </div>
    );
  }

  // Each setting goes in its own card; date rows are grouped into a single "period" card
  function renderRows(rows: ConfigIntranet[], accent: TabAccent) {
    const cardClass = `rounded-lg border border-gray-200 border-l-4 ${accent.cardBorder} bg-gray-50 p-4`;
    const dateRows = rows.filter((r) => DATE_CLAVES.has(r.clave));
    const items: React.ReactNode[] = [];
    let periodAdded = false;
    rows.forEach((row) => {
      if (DATE_CLAVES.has(row.clave)) {
        if (periodAdded) return;
        periodAdded = true;
        items.push(
          <div key="periodo" className={cardClass}>
            <p className="text-sm font-semibold text-gray-800 mb-3">Período de aplicación</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {dateRows.map((r) => renderField(r, accent))}
            </div>
          </div>
        );
        return;
      }
      items.push(
        <div key={row.clave} className={cardClass}>
          {renderField(row, accent)}
        </div>
      );
    });
    return items;
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
      id: "notificaciones" as Tab,
      label: "Notificaciones",
      icon: <Bell size={15} />,
      rows: notificacionRows,
      description: "Perfiles que reciben los emails enviados por cada módulo. Se puede marcar más de un perfil.",
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
  const currentAccent = currentTab ? TAB_ACCENTS[currentTab.id] : TAB_ACCENTS.otros;

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
        <div className="flex bg-gray-100 rounded-lg p-1 w-fit max-w-full overflow-x-auto gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                currentTab?.id === tab.id
                  ? `bg-white shadow-sm ${TAB_ACCENTS[tab.id].activeTab}`
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
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className={`flex items-start gap-3 px-4 sm:px-6 py-4 border-b ${currentAccent.header}`}>
            <span className={`p-2 rounded-lg ${currentAccent.iconChip}`}>{currentTab.icon}</span>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">{currentTab.label}</h2>
              <p className="text-xs text-gray-600 mt-0.5">{currentTab.description}</p>
            </div>
          </div>
          <div className="p-4 sm:p-6 space-y-3">
            {renderRows(currentTab.rows, currentAccent)}
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

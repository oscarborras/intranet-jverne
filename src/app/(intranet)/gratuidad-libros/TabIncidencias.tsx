"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  AlertTriangle, BookOpen, CheckCircle, ChevronDown, Clock, Plus, Search, X,
} from "lucide-react";
import type {
  LibroCatalogo, Alumno,
  TipoIncidencia, EstadoIncidencia, Incidencia, IncidenciaHistorial,
} from "@/lib/types";

// ─── Config ───────────────────────────────────────────────────────────────────

const TIPO_CONFIG: Record<TipoIncidencia, { label: string; className: string }> = {
  deterioro:   { label: "Deterioro",   className: "text-amber-700 bg-amber-50 border-amber-200" },
  perdida:     { label: "Pérdida",     className: "text-red-700 bg-red-50 border-red-200" },
  reclamacion: { label: "Reclamación", className: "text-blue-700 bg-blue-50 border-blue-200" },
  robo:        { label: "Robo",        className: "text-purple-700 bg-purple-50 border-purple-200" },
  otro:        { label: "Otro",        className: "text-gray-600 bg-gray-50 border-gray-200" },
};

const ESTADO_CONFIG: Record<EstadoIncidencia, { label: string; rowClass: string; badgeClass: string; dot: string }> = {
  abierta:    { label: "Abierta",    rowClass: "",              badgeClass: "text-red-700 bg-red-50",     dot: "bg-red-500" },
  en_gestion: { label: "En gestión", rowClass: "",              badgeClass: "text-amber-700 bg-amber-50", dot: "bg-amber-500" },
  repuesta:   { label: "Repuesta",   rowClass: "",              badgeClass: "text-green-700 bg-green-50", dot: "bg-green-500" },
  archivada:  { label: "Archivada",  rowClass: "opacity-50",   badgeClass: "text-gray-500 bg-gray-100",  dot: "bg-gray-400" },
};

type FiltroEstado = EstadoIncidencia | "todas";

const FILTROS: { key: FiltroEstado; label: string }[] = [
  { key: "abierta",    label: "Abiertas" },
  { key: "en_gestion", label: "En gestión" },
  { key: "repuesta",   label: "Repuestas" },
  { key: "archivada",  label: "Archivadas" },
  { key: "todas",      label: "Todas" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function localDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

function initialsFromNombre(nombre: string): string {
  const [ap = "", nom = ""] = nombre.split(",").map((s) => s.trim());
  return ((ap[0] ?? "") + (nom[0] ?? "")).toUpperCase() || nombre.slice(0, 2).toUpperCase();
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Profesor { id: string; nombre: string; }

interface Props {
  libros: LibroCatalogo[];
  alumnos: Alumno[];
  cursoEscolar: string;
  myProfesorId: string | null;
  canManage: boolean;
  profesores: Profesor[];
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function TabIncidencias({ libros, alumnos, cursoEscolar, myProfesorId, canManage }: Props) {
  const supabase = createClient();

  // ── State principal ────────────────────────────────────────────────────────
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<FiltroEstado>("abierta");
  const [selected, setSelected] = useState<Incidencia | null>(null);
  const [showNueva, setShowNueva] = useState(false);

  // ── State: cambio de estado en detalle ────────────────────────────────────
  const [cambioEstado, setCambioEstado] = useState<EstadoIncidencia>("en_gestion");
  const [cambioNota, setCambioNota] = useState("");
  const [savingCambio, setSavingCambio] = useState(false);
  const [cambioError, setCambioError] = useState<string | null>(null);

  // ── State: nueva incidencia ────────────────────────────────────────────────
  const [alumnoSearch, setAlumnoSearch] = useState("");
  const [showSugg, setShowSugg] = useState(false);
  const [nuevaForm, setNuevaForm] = useState({
    alumno_id: null as string | null,
    alumno_nombre: "",
    alumno_grupo: "",
    libro_id: "",
    tipo: "deterioro" as TipoIncidencia,
    descripcion: "",
  });
  const [savingNueva, setSavingNueva] = useState(false);
  const [nuevaError, setNuevaError] = useState<string | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchIncidencias = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("gratuidad_incidencias")
      .select(`
        *,
        libro:libros_catalogo(titulo, isbn, editorial),
        historial:gratuidad_incidencias_historial(
          id, estado, nota, created_at,
          profesor:profesores(profesor)
        )
      `)
      .eq("curso_escolar", cursoEscolar)
      .order("created_at", { ascending: false });
    setIncidencias((data ?? []) as unknown as Incidencia[]);
    setLoading(false);
  }, [supabase, cursoEscolar]);

  useEffect(() => { fetchIncidencias(); }, [fetchIncidencias]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const filtered = useMemo(
    () => filtro === "todas" ? incidencias : incidencias.filter((i) => i.estado === filtro),
    [incidencias, filtro]
  );

  const counts = useMemo(
    () => incidencias.reduce<Partial<Record<EstadoIncidencia, number>>>((acc, i) => {
      acc[i.estado] = (acc[i.estado] ?? 0) + 1;
      return acc;
    }, {}),
    [incidencias]
  );

  const librosActivos = useMemo(
    () => libros.filter((l) => l.activo).sort((a, b) => a.titulo.localeCompare(b.titulo)),
    [libros]
  );

  const alumnosSugeridos = useMemo(() => {
    if (!alumnoSearch.trim()) return [];
    const q = alumnoSearch.toLowerCase();
    return alumnos.filter((a) => a.alumno.toLowerCase().includes(q)).slice(0, 8);
  }, [alumnos, alumnoSearch]);

  // ── Handlers: detalle ────────────────────────────────────────────────────
  function openDetail(inc: Incidencia) {
    setSelected(inc);
    // Pre-select next logical state
    const next: Record<EstadoIncidencia, EstadoIncidencia> = {
      abierta: "en_gestion",
      en_gestion: "repuesta",
      repuesta: "archivada",
      archivada: "archivada",
    };
    setCambioEstado(next[inc.estado]);
    setCambioNota("");
    setCambioError(null);
  }

  async function handleCambioEstado() {
    if (!selected) return;
    setSavingCambio(true);
    setCambioError(null);

    const patch: Record<string, unknown> = { estado: cambioEstado };
    if (cambioEstado === "repuesta" || cambioEstado === "archivada") {
      patch.fecha_resolucion = localDateStr();
    }

    const { error } = await supabase
      .from("gratuidad_incidencias")
      .update(patch)
      .eq("id", selected.id);

    if (error) { setCambioError(error.message); setSavingCambio(false); return; }

    const { data: histEntry } = await supabase
      .from("gratuidad_incidencias_historial")
      .insert({
        incidencia_id: selected.id,
        estado: cambioEstado,
        nota: cambioNota.trim() || null,
        profesor_id: myProfesorId,
      })
      .select("id, estado, nota, created_at")
      .single();

    const newEntry: IncidenciaHistorial = histEntry
      ? { ...histEntry, incidencia_id: selected.id, profesor_id: myProfesorId }
      : {
          id: crypto.randomUUID(), incidencia_id: selected.id,
          estado: cambioEstado, nota: cambioNota.trim() || null,
          profesor_id: myProfesorId, created_at: new Date().toISOString(),
        };

    const updater = (i: Incidencia): Incidencia =>
      i.id === selected.id
        ? { ...i, estado: cambioEstado, historial: [...(i.historial ?? []), newEntry] }
        : i;

    setIncidencias((prev) => prev.map(updater));
    setSelected((prev) => (prev ? updater(prev) : null));
    setCambioNota("");
    setSavingCambio(false);
  }

  // ── Handlers: nueva incidencia ───────────────────────────────────────────
  function selectAlumnoSugerido(a: Alumno) {
    setNuevaForm((f) => ({ ...f, alumno_id: a.id, alumno_nombre: a.alumno, alumno_grupo: a.unidad }));
    setAlumnoSearch(a.alumno);
    setShowSugg(false);
  }

  function resetNuevaForm() {
    setAlumnoSearch("");
    setShowSugg(false);
    setNuevaForm({ alumno_id: null, alumno_nombre: "", alumno_grupo: "", libro_id: "", tipo: "deterioro", descripcion: "" });
    setNuevaError(null);
  }

  async function handleCrearIncidencia() {
    if (!nuevaForm.alumno_nombre.trim() || !nuevaForm.alumno_grupo.trim() || !nuevaForm.libro_id) {
      setNuevaError("Alumno, grupo y libro son obligatorios.");
      return;
    }
    setSavingNueva(true);
    setNuevaError(null);

    const { data: lastInc } = await supabase
      .from("gratuidad_incidencias")
      .select("codigo")
      .order("created_at", { ascending: false })
      .limit(1);

    const lastNum = lastInc?.[0] ? parseInt(lastInc[0].codigo.replace("INC-", ""), 10) : 0;
    const codigo = `INC-${String(lastNum + 1).padStart(3, "0")}`;

    const { data: newInc, error } = await supabase
      .from("gratuidad_incidencias")
      .insert({
        codigo,
        alumno_id: nuevaForm.alumno_id,
        alumno_nombre: nuevaForm.alumno_nombre.trim(),
        alumno_grupo: nuevaForm.alumno_grupo.trim(),
        libro_id: nuevaForm.libro_id,
        tipo: nuevaForm.tipo,
        descripcion: nuevaForm.descripcion.trim() || null,
        estado: "abierta",
        curso_escolar: cursoEscolar,
      })
      .select("*, libro:libros_catalogo(titulo, isbn, editorial)")
      .single();

    if (error || !newInc) {
      setNuevaError(error?.message ?? "Error al crear la incidencia.");
      setSavingNueva(false);
      return;
    }

    await supabase.from("gratuidad_incidencias_historial").insert({
      incidencia_id: newInc.id,
      estado: "abierta",
      nota: null,
      profesor_id: myProfesorId,
    });

    setIncidencias((prev) => [{ ...(newInc as unknown as Incidencia), historial: [] }, ...prev]);
    setShowNueva(false);
    resetNuevaForm();
    setSavingNueva(false);
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Cabecera */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Incidencias y reposiciones</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Deterioros, pérdidas y reclamaciones. Gestión y seguimiento hasta el cierre.
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowNueva(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            <Plus size={15} />
            Nueva incidencia
          </button>
        )}
      </div>

      {/* Filtro pills */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-0 overflow-x-auto">
          {FILTROS.map(({ key, label }) => {
            const count = key === "todas" ? incidencias.length : (counts[key as EstadoIncidencia] ?? 0);
            return (
              <button
                key={key}
                onClick={() => setFiltro(key)}
                className={`flex-shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  filtro === key
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {label}{count > 0 ? ` (${count})` : ""}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">
          <Clock size={32} className="mx-auto mb-2 opacity-40 animate-pulse" />
          <p className="text-sm">Cargando incidencias...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <CheckCircle size={36} className="mx-auto mb-2 opacity-40" />
          <p className="font-medium">
            {filtro === "todas"
              ? "No hay incidencias registradas en este curso"
              : `No hay incidencias ${FILTROS.find((f) => f.key === filtro)?.label.toLowerCase() ?? ""}`}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3">Código</th>
                  <th className="text-left px-4 py-3">Alumno/a</th>
                  <th className="text-left px-4 py-3">Libro</th>
                  <th className="text-left px-4 py-3">Tipo</th>
                  <th className="text-left px-4 py-3">Fecha</th>
                  <th className="text-left px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((inc) => (
                  <tr
                    key={inc.id}
                    onClick={() => openDetail(inc)}
                    className={`cursor-pointer hover:bg-gray-50 transition-colors ${ESTADO_CONFIG[inc.estado].rowClass}`}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{inc.codigo}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{inc.alumno_nombre}</p>
                      <p className="text-xs text-gray-400">{inc.alumno_grupo}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-800">{inc.libro?.titulo ?? "—"}</p>
                      {inc.libro?.isbn && <p className="text-xs text-gray-400">{inc.libro.isbn}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${TIPO_CONFIG[inc.tipo].className}`}>
                        {TIPO_CONFIG[inc.tipo].label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(inc.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${ESTADO_CONFIG[inc.estado].badgeClass}`}>
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ESTADO_CONFIG[inc.estado].dot}`} />
                        {ESTADO_CONFIG[inc.estado].label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modal: Detalle ─────────────────────────────────────────────────── */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
              <h3 className="font-semibold text-gray-900">Incidencia {selected.codigo}</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Cuerpo scrollable */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

              {/* Alumno */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-sm font-bold text-amber-700 flex-shrink-0">
                  {initialsFromNombre(selected.alumno_nombre)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{selected.alumno_nombre}</p>
                  <p className="text-xs text-gray-500">{selected.alumno_grupo}</p>
                </div>
              </div>

              {/* Libro */}
              {selected.libro && (
                <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <BookOpen size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{selected.libro.titulo}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {[selected.libro.isbn, selected.libro.editorial].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </div>
              )}

              {/* Tipo */}
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">Tipo</p>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${TIPO_CONFIG[selected.tipo].className}`}>
                  {TIPO_CONFIG[selected.tipo].label}
                </span>
              </div>

              {/* Descripción */}
              {selected.descripcion && (
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">Descripción</p>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-xl border border-gray-100 px-3 py-2.5">
                    {selected.descripcion}
                  </p>
                </div>
              )}

              {/* Línea de tiempo */}
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Línea de tiempo</p>
                {(selected.historial ?? []).length === 0 ? (
                  <p className="text-sm text-gray-400">Sin historial</p>
                ) : (
                  <div className="relative pl-5">
                    <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gray-200" />
                    <div className="space-y-5">
                      {[...(selected.historial ?? [])]
                        .sort((a, b) => a.created_at.localeCompare(b.created_at))
                        .map((entry) => (
                          <div key={entry.id} className="relative">
                            <div className={`absolute left-[-22px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white ${ESTADO_CONFIG[entry.estado].dot}`} />
                            <p className="text-xs text-gray-400">{formatDate(entry.created_at)}</p>
                            <p className="text-sm font-semibold text-gray-800">
                              {ESTADO_CONFIG[entry.estado].label}
                            </p>
                            {entry.nota && (
                              <p className="text-xs text-gray-500 mt-0.5">{entry.nota}</p>
                            )}
                            {entry.profesor?.profesor && (
                              <p className="text-xs text-gray-400 mt-0.5">{entry.profesor.profesor}</p>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Cambiar estado (canManage + no archivada) */}
              {canManage && selected.estado !== "archivada" && (
                <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Cambiar estado</p>
                  <div className="relative">
                    <select
                      value={cambioEstado}
                      onChange={(e) => setCambioEstado(e.target.value as EstadoIncidencia)}
                      className="w-full appearance-none border border-gray-300 rounded-lg pl-3 pr-8 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {(["abierta", "en_gestion", "repuesta", "archivada"] as EstadoIncidencia[])
                        .filter((e) => e !== selected.estado)
                        .map((e) => (
                          <option key={e} value={e}>{ESTADO_CONFIG[e].label}</option>
                        ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                  <textarea
                    value={cambioNota}
                    onChange={(e) => setCambioNota(e.target.value)}
                    placeholder="Nota opcional (acción tomada, observaciones...)"
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  {cambioError && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <AlertTriangle size={12} /> {cambioError}
                    </p>
                  )}
                  <button
                    onClick={handleCambioEstado}
                    disabled={savingCambio}
                    className="w-full bg-gray-900 hover:bg-gray-700 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
                  >
                    {savingCambio ? "Guardando..." : "Guardar cambio"}
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-gray-100 flex-shrink-0">
              <button
                onClick={() => setSelected(null)}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Nueva incidencia ────────────────────────────────────────── */}
      {showNueva && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-semibold text-gray-900">Nueva incidencia</h3>
              <button
                onClick={() => { setShowNueva(false); resetNuevaForm(); }}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {nuevaError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {nuevaError}
                </p>
              )}

              {/* Alumno autocomplete */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Alumno/a *</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={alumnoSearch}
                    onChange={(e) => {
                      setAlumnoSearch(e.target.value);
                      setShowSugg(true);
                      if (!e.target.value) {
                        setNuevaForm((f) => ({ ...f, alumno_id: null, alumno_nombre: "", alumno_grupo: "" }));
                      }
                    }}
                    onFocus={() => setShowSugg(true)}
                    onBlur={() => setTimeout(() => setShowSugg(false), 150)}
                    placeholder="Buscar alumno por nombre..."
                    className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {showSugg && alumnosSugeridos.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-48 overflow-y-auto">
                    {alumnosSugeridos.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onMouseDown={() => selectAlumnoSugerido(a)}
                        className="w-full text-left px-3 py-2.5 hover:bg-blue-50 text-sm"
                      >
                        <span className="font-medium text-gray-800">{a.alumno}</span>
                        <span className="text-gray-400 ml-2 text-xs">{a.unidad}</span>
                      </button>
                    ))}
                  </div>
                )}
                {nuevaForm.alumno_nombre && (
                  <p className="text-xs text-gray-500 mt-1">
                    Seleccionado: <span className="font-medium">{nuevaForm.alumno_nombre}</span>
                    {nuevaForm.alumno_grupo && <> · {nuevaForm.alumno_grupo}</>}
                  </p>
                )}
              </div>

              {/* Libro */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Libro *</label>
                <div className="relative">
                  <select
                    value={nuevaForm.libro_id}
                    onChange={(e) => setNuevaForm((f) => ({ ...f, libro_id: e.target.value }))}
                    className="w-full appearance-none border border-gray-300 rounded-lg pl-3 pr-8 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">— Selecciona un libro —</option>
                    {librosActivos.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.titulo} · {l.nivel}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <div className="relative">
                  <select
                    value={nuevaForm.tipo}
                    onChange={(e) => setNuevaForm((f) => ({ ...f, tipo: e.target.value as TipoIncidencia }))}
                    className="w-full appearance-none border border-gray-300 rounded-lg pl-3 pr-8 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {(Object.keys(TIPO_CONFIG) as TipoIncidencia[]).map((t) => (
                      <option key={t} value={t}>{TIPO_CONFIG[t].label}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={nuevaForm.descripcion}
                  onChange={(e) => setNuevaForm((f) => ({ ...f, descripcion: e.target.value }))}
                  placeholder="Describe la incidencia..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 px-5 py-4 border-t">
              <button
                onClick={() => { setShowNueva(false); resetNuevaForm(); }}
                className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCrearIncidencia}
                disabled={savingNueva}
                className="flex-1 bg-gray-900 hover:bg-gray-700 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
              >
                {savingNueva ? "Creando..." : "Crear incidencia"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

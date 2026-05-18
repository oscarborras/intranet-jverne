"use client";

import { useState, useMemo, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  CheckCircle, AlertTriangle, X, Users, CalendarDays, ChevronDown, RotateCcw, BookOpen,
} from "lucide-react";
import type { PrestamoLibro, EstadoDevolucion, TipoIncidencia } from "@/lib/types";

const DEVOLUCION_TO_TIPO: Partial<Record<EstadoDevolucion, TipoIncidencia>> = {
  deteriorado: "deterioro",
  perdido: "perdida",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function initialsFromNombre(nombre: string): string {
  const [apellidos = "", nombre_ = ""] = nombre.split(",").map((s) => s.trim());
  return ((apellidos[0] ?? "") + (nombre_[0] ?? "")).toUpperCase() || nombre.slice(0, 2).toUpperCase();
}

const ESTADO_CONFIG: Record<EstadoDevolucion, { label: string; active: string; hover: string }> = {
  bueno: { label: "Bueno", active: "bg-green-100 text-green-700 border-green-300", hover: "hover:bg-green-50 hover:border-green-200" },
  deteriorado: { label: "Deteriorado", active: "bg-amber-100 text-amber-700 border-amber-300", hover: "hover:bg-amber-50 hover:border-amber-200" },
  perdido: { label: "Perdido", active: "bg-red-100 text-red-700 border-red-300", hover: "hover:bg-red-50 hover:border-red-200" },
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Profesor { id: string; nombre: string; }

interface Props {
  prestamosActivos: PrestamoLibro[];
  onPrestamosChange: React.Dispatch<React.SetStateAction<PrestamoLibro[]>>;
  cursoEscolar: string;
  myProfesorId: string | null;
  canManage: boolean;
  profesores: Profesor[];
  initialGrupo?: string;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function TabDevolucionesLote({ prestamosActivos, onPrestamosChange, cursoEscolar, myProfesorId, canManage, profesores, initialGrupo }: Props) {
  const supabase = createClient();

  // ── State ──────────────────────────────────────────────────────────────────
  const [selectedUnidad, setSelectedUnidad] = useState<string>(initialGrupo ?? "");
  const [selectedAlumnoKey, setSelectedAlumnoKey] = useState<string | null>(null);
  // libro_id → estado seleccionado (null = no se devuelve)
  const [bookStates, setBookStates] = useState<Record<string, EstadoDevolucion | null>>({});
  const [observaciones, setObservaciones] = useState<string>("");
  const [fechaDevolucion, setFechaDevolucion] = useState<string>(todayString());
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [overrideProfesorId, setOverrideProfesorId] = useState<string>(myProfesorId ?? "");

  const efectivoProfesorId = myProfesorId ?? (overrideProfesorId || null);

  // ── Refresh activos desde BD al montar ────────────────────────────────────
  useEffect(() => {
    async function refreshActivos() {
      const { data } = await supabase
        .from("prestamos_libros")
        .select("id, libro_id, alumno_id, alumno_nombre, alumno_grupo, num_ejemplar, fecha_prestamo, entregado_por, devuelto_por, curso_escolar, fecha_devolucion, estado_devolucion, observaciones, created_at, libro:libros_catalogo(titulo, asignatura, nivel, diversificacion)")
        .eq("curso_escolar", cursoEscolar)
        .is("fecha_devolucion", null)
        .order("alumno_grupo")
        .order("alumno_nombre");

      if (!data) return;

      const profIds = [...new Set(data.map((p) => p.entregado_por).filter(Boolean) as string[])];
      let nameMap: Record<string, string> = {};
      if (profIds.length > 0) {
        const { data: profData } = await supabase.from("profesores").select("id, profesor").in("id", profIds);
        nameMap = Object.fromEntries((profData ?? []).map((p) => [p.id as string, p.profesor as string]));
      }

      const updated = data.map((p) => ({
        ...p,
        libro: (p.libro as unknown as { titulo: string; asignatura: string; nivel: string; diversificacion?: boolean } | null) ?? undefined,
        entregado_por_nombre: { profesor: nameMap[p.entregado_por as string] ?? "—" },
      })) as import("@/lib/types").PrestamoLibro[];

      onPrestamosChange(updated);
    }
    refreshActivos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursoEscolar]);

  // ── Derived ────────────────────────────────────────────────────────────────

  const unidades = useMemo(() =>
    [...new Set(prestamosActivos.map((p) => p.alumno_grupo))].sort(),
    [prestamosActivos]);

  const alumnosConPrestamos = useMemo(() => {
    const map: Record<string, { key: string; nombre: string; libroIds: Set<string> }> = {};
    for (const p of prestamosActivos) {
      if (p.alumno_grupo !== selectedUnidad) continue;
      const key = p.alumno_id ?? p.alumno_nombre;
      if (!map[key]) map[key] = { key, nombre: p.alumno_nombre, libroIds: new Set() };
      map[key].libroIds.add(p.libro_id);
    }
    return Object.values(map).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [prestamosActivos, selectedUnidad]);

  // Préstamos activos del alumno seleccionado (uno por libro)
  const librosDelAlumno = useMemo(() => {
    if (!selectedAlumnoKey) return [];
    return prestamosActivos.filter((p) => {
      const key = p.alumno_id ?? p.alumno_nombre;
      return key === selectedAlumnoKey && p.alumno_grupo === selectedUnidad;
    });
  }, [prestamosActivos, selectedAlumnoKey, selectedUnidad]);

  // Cuántos libros tienen estado marcado (serán devueltos)
  const countToReturn = useMemo(() =>
    librosDelAlumno.filter((p) => bookStates[p.libro_id] != null).length,
    [librosDelAlumno, bookStates]);

  const selectedAlumno = alumnosConPrestamos.find((a) => a.key === selectedAlumnoKey) ?? null;

  // ── Actions ────────────────────────────────────────────────────────────────

  function handleUnidadChange(unidad: string) {
    setSelectedUnidad(unidad);
    setSelectedAlumnoKey(null);
    setBookStates({});
    setObservaciones("");
    setSuccessMsg(null);
    setErrorMsg(null);
  }

  function selectAlumno(key: string) {
    setSelectedAlumnoKey(key);
    setBookStates({});
    setObservaciones("");
    setSuccessMsg(null);
  }

  function handleEstado(libroId: string, estado: EstadoDevolucion) {
    setBookStates((prev) => ({
      ...prev,
      [libroId]: prev[libroId] === estado ? null : estado,
    }));
  }

  function handleTodoBueno() {
    const all: Record<string, EstadoDevolucion> = {};
    for (const p of librosDelAlumno) all[p.libro_id] = "bueno";
    setBookStates(all);
  }

  async function handleFinalizar() {
    if (!efectivoProfesorId) {
      setErrorMsg("Selecciona el profesor que registra la devolución.");
      return;
    }
    if (countToReturn === 0) return;
    setSaving(true);
    setErrorMsg(null);

    // Agrupar préstamos por estado para hacer una update por estado
    const byEstado: Partial<Record<EstadoDevolucion, string[]>> = {};
    for (const p of librosDelAlumno) {
      const estado = bookStates[p.libro_id];
      if (!estado) continue;
      if (!byEstado[estado]) byEstado[estado] = [];
      byEstado[estado]!.push(p.id);
    }

    const allReturnedIds = new Set(Object.values(byEstado).flat());

    // Calcular el siguiente alumno ANTES de actualizar el estado
    const remainingForCurrent = prestamosActivos.filter((p) => {
      const key = p.alumno_id ?? p.alumno_nombre;
      return key === selectedAlumnoKey && p.alumno_grupo === selectedUnidad && !allReturnedIds.has(p.id);
    });

    let nextKey: string | null = selectedAlumnoKey;
    if (remainingForCurrent.length === 0) {
      const currentIdx = alumnosConPrestamos.findIndex((a) => a.key === selectedAlumnoKey);
      nextKey = null;
      for (let offset = 1; offset < alumnosConPrestamos.length; offset++) {
        const candidate = alumnosConPrestamos[(currentIdx + offset) % alumnosConPrestamos.length];
        const candidateRemaining = prestamosActivos.some((p) => {
          const key = p.alumno_id ?? p.alumno_nombre;
          return key === candidate.key && !allReturnedIds.has(p.id);
        });
        if (candidateRemaining) { nextKey = candidate.key; break; }
      }
    }

    // Ejecutar updates agrupados por estado
    let hasError = false;
    for (const [estado, ids] of Object.entries(byEstado) as [EstadoDevolucion, string[]][]) {
      const { error } = await supabase
        .from("prestamos_libros")
        .update({
          fecha_devolucion: fechaDevolucion,
          estado_devolucion: estado,
          devuelto_por: efectivoProfesorId,
          observaciones: observaciones.trim() || null,
        })
        .in("id", ids);
      if (error) { hasError = true; setErrorMsg(`Error: ${error.message}`); break; }
    }

    setSaving(false);
    if (hasError) return;

    // Auto-create incidents for deteriorado / perdido books
    const incidentLoans = librosDelAlumno.filter((p) => {
      const e = bookStates[p.libro_id];
      return e === "deteriorado" || e === "perdido";
    });
    if (incidentLoans.length > 0) {
      const { data: lastInc } = await supabase
        .from("gratuidad_incidencias")
        .select("codigo")
        .order("created_at", { ascending: false })
        .limit(1);
      let nextNum = lastInc?.[0] ? parseInt(lastInc[0].codigo.replace("INC-", ""), 10) : 0;
      for (const loan of incidentLoans) {
        nextNum++;
        const codigo = `INC-${String(nextNum).padStart(3, "0")}`;
        const tipo = DEVOLUCION_TO_TIPO[bookStates[loan.libro_id] as EstadoDevolucion]!;
        const { data: newInc } = await supabase
          .from("gratuidad_incidencias")
          .insert({
            codigo,
            prestamo_id: loan.id,
            alumno_id: loan.alumno_id,
            alumno_nombre: loan.alumno_nombre,
            alumno_grupo: loan.alumno_grupo,
            libro_id: loan.libro_id,
            tipo,
            descripcion: observaciones.trim() || null,
            estado: "abierta",
            curso_escolar: cursoEscolar,
          })
          .select("id")
          .single();
        if (newInc?.id) {
          await supabase.from("gratuidad_incidencias_historial").insert({
            incidencia_id: newInc.id,
            estado: "abierta",
            nota: "Incidencia abierta automáticamente al registrar la devolución.",
            profesor_id: efectivoProfesorId,
          });
        }
      }
    }

    const total = allReturnedIds.size;
    onPrestamosChange((prev) => prev.filter((p) => !allReturnedIds.has(p.id)));
    setSelectedAlumnoKey(nextKey);
    setBookStates({});
    setObservaciones("");
    setSuccessMsg(`${total} devolución${total !== 1 ? "es" : ""} registrada${total !== 1 ? "s" : ""}.`);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* Selector de profesor para canManage sin perfil de profesor */}
      {canManage && !myProfesorId && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
          <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />
          <span className="text-sm text-amber-800 font-medium whitespace-nowrap">Registrar como:</span>
          <div className="relative">
            <select
              value={overrideProfesorId}
              onChange={(e) => setOverrideProfesorId(e.target.value)}
              className="appearance-none border border-amber-300 rounded-lg pl-3 pr-8 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 min-w-48"
            >
              <option value="">— Selecciona un profesor —</option>
              {profesores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Barra superior */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <select
            value={selectedUnidad}
            onChange={(e) => handleUnidadChange(e.target.value)}
            className="appearance-none border border-gray-300 rounded-lg pl-3 pr-8 py-2.5 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-44"
          >
            <option value="">Selecciona un grupo...</option>
            {unidades.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        {selectedUnidad && alumnosConPrestamos.length > 0 && (
          <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium px-2.5 py-1.5 rounded-full">
            <Users size={12} />
            {alumnosConPrestamos.length} pendientes
          </span>
        )}

        {selectedUnidad && (
          <div className="flex items-center gap-1.5 ml-auto">
            <CalendarDays size={14} className="text-gray-400 flex-shrink-0" />
            <input
              type="date"
              value={fechaDevolucion}
              onChange={(e) => setFechaDevolucion(e.target.value)}
              className="border border-gray-300 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
      </div>

      {/* Mensajes */}
      {successMsg && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2.5 rounded-lg">
          <CheckCircle size={15} />
          {successMsg}
          <button onClick={() => setSuccessMsg(null)} className="ml-auto text-green-500 hover:text-green-700">
            <X size={14} />
          </button>
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-lg">
          <AlertTriangle size={15} className="flex-shrink-0" />
          {errorMsg}
          <button onClick={() => setErrorMsg(null)} className="ml-auto text-red-400 hover:text-red-600">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Estado vacío */}
      {!selectedUnidad && (
        <div className="text-center py-16 text-gray-400">
          <RotateCcw size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">Selecciona un grupo para gestionar devoluciones</p>
          <p className="text-sm mt-1">Solo aparecen grupos con préstamos activos</p>
        </div>
      )}
      {selectedUnidad && alumnosConPrestamos.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <CheckCircle size={36} className="mx-auto mb-2 opacity-40" />
          <p className="font-medium">Todos los libros de este grupo están devueltos</p>
        </div>
      )}

      {/* Vista dividida */}
      {selectedUnidad && alumnosConPrestamos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">

          {/* Panel izquierdo — lista de alumnos */}
          <div className="md:col-span-2 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
              <span className="text-sm font-medium text-gray-700">Selecciona el alumno que devuelve los libros</span>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="text-sm font-semibold text-gray-700">Alumnado</span>
                <span className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
                  {alumnosConPrestamos.length} pendientes
                </span>
              </div>
              <div className="divide-y divide-gray-50">
                {alumnosConPrestamos.map((alumno) => {
                  const isSelected = alumno.key === selectedAlumnoKey;
                  return (
                    <button
                      key={alumno.key}
                      onClick={() => selectAlumno(alumno.key)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                        }`}
                    >
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isSelected ? "bg-blue-200 text-blue-800" : "bg-gray-200 text-gray-600"
                        }`}>
                        {initialsFromNombre(alumno.nombre)}
                      </div>
                      <span className="text-sm text-gray-800 flex-1 min-w-0 truncate">{alumno.nombre}</span>
                      <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex-shrink-0 tabular-nums">
                        {alumno.libroIds.size}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Panel derecho — libros del alumno */}
          <div className="md:col-span-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
              <span className="text-sm font-medium text-gray-700">Indica el estado solo de los libros que se devuelvan o se hayan perdido y confirma la devolución</span>
            </div>
            {!selectedAlumno ? (
              <div className="bg-white border border-gray-200 rounded-xl flex flex-col items-center justify-center py-16 text-gray-400">
                <BookOpen size={36} className="mb-2 opacity-40" />
                <p className="text-sm font-medium">Selecciona un alumno de la lista</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">

                {/* Cabecera del alumno */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50 flex-wrap">
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 flex-shrink-0">
                    {initialsFromNombre(selectedAlumno.nombre)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{selectedAlumno.nombre}</p>
                    <p className="text-xs text-gray-500">{selectedUnidad}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={handleTodoBueno}
                      className="text-sm font-medium text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors whitespace-nowrap"
                    >
                      Todo bueno
                    </button>
                    <button
                      onClick={handleFinalizar}
                      disabled={countToReturn === 0 || saving}
                      className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                    >
                      <RotateCcw size={14} />
                      {saving ? "Guardando..." : `Finalizar devolución (${countToReturn}/${librosDelAlumno.length})`}
                    </button>
                  </div>
                </div>

                {/* Lista de libros con estado */}
                <div className="divide-y divide-gray-100">
                  {librosDelAlumno.map((p) => {
                    const estado = bookStates[p.libro_id] ?? null;
                    return (
                      <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">
                              {p.libro?.titulo ?? "—"}
                            </p>
                            {p.libro?.diversificacion && (
                              <span className="flex-shrink-0 text-[9px] font-semibold tracking-wide uppercase px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">DIV</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400">
                            {p.libro?.asignatura}
                            {p.num_ejemplar && <> · Ej. {p.num_ejemplar}</>}
                          </p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          {(Object.keys(ESTADO_CONFIG) as EstadoDevolucion[]).map((e) => (
                            <button
                              key={e}
                              onClick={() => handleEstado(p.libro_id, e)}
                              className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${estado === e
                                ? ESTADO_CONFIG[e].active
                                : `border-gray-200 text-gray-500 bg-white ${ESTADO_CONFIG[e].hover}`
                                }`}
                            >
                              {ESTADO_CONFIG[e].label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Observaciones */}
                <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
                  <input
                    type="text"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Observaciones en caso de deterioros o extravios (opcional) ..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}

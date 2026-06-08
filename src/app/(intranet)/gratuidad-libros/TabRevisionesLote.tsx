"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  CheckCircle, AlertTriangle, X, Users, ChevronDown, BookOpen, Check, ClipboardCheck, Undo2, Eye,
} from "lucide-react";
import type { PrestamoLibro, EstadoDevolucion, TipoIncidencia, Alumno } from "@/lib/types";

const NO_ACTIVOS = "__no_activos__";

const DEVOLUCION_TO_TIPO: Partial<Record<EstadoDevolucion, TipoIncidencia>> = {
  deteriorado: "deterioro",
  perdido: "perdida",
};

const TIPO_LABEL: Record<string, string> = {
  deterioro: "no reutilizable",
  perdida: "perdido",
};

function initialsFromNombre(nombre: string): string {
  const [apellidos = "", nombre_ = ""] = nombre.split(",").map((s) => s.trim());
  return ((apellidos[0] ?? "") + (nombre_[0] ?? "")).toUpperCase() || nombre.slice(0, 2).toUpperCase();
}

const ESTADO_CONFIG: Record<EstadoDevolucion, { label: string; active: string; hover: string }> = {
  bueno:       { label: "Reutilizable",    active: "bg-green-100 text-green-700 border-green-300",  hover: "hover:bg-green-50 hover:border-green-200" },
  deteriorado: { label: "No reutilizable", active: "bg-amber-100 text-amber-700 border-amber-300",  hover: "hover:bg-amber-50 hover:border-amber-200" },
  perdido:     { label: "Perdido",         active: "bg-red-100 text-red-700 border-red-300",         hover: "hover:bg-red-50 hover:border-red-200" },
};

type TipoRevision = "por_alumno" | "por_asignatura";

interface Profesor { id: string; nombre: string; }

interface Props {
  prestamosActivos: PrestamoLibro[];
  onPrestamosChange: React.Dispatch<React.SetStateAction<PrestamoLibro[]>>;
  cursoEscolar: string;
  myProfesorId: string | null;
  canManage: boolean;
  profesores: Profesor[];
  alumnosInactivos: Alumno[];
  initialGrupo?: string;
}

export function TabRevisionesLote({ prestamosActivos, onPrestamosChange, cursoEscolar, myProfesorId, canManage, profesores, alumnosInactivos, initialGrupo }: Props) {
  const supabase = createClient();

  // ── Common state ───────────────────────────────────────────────────────────
  const [tipoRevision, setTipoRevision] = useState<TipoRevision>("por_asignatura");
  const [selectedUnidad, setSelectedUnidad] = useState<string>(initialGrupo ?? "");
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [overrideProfesorId, setOverrideProfesorId] = useState<string>(myProfesorId ?? "");
  const [showRevisados, setShowRevisados] = useState(false);

  // ── Por alumno state ────────────────────────────────────────────────────────
  const [selectedAlumnoKey, setSelectedAlumnoKey] = useState<string | null>(null);
  const [bookStates, setBookStates] = useState<Record<string, EstadoDevolucion | null>>({});
  const [observaciones, setObservaciones] = useState<string>("");

  // ── Por asignatura state ────────────────────────────────────────────────────
  const [selectedLibroIdsAsig, setSelectedLibroIdsAsig] = useState<Set<string>>(new Set());
  const [alumnoEstadosAsig, setAlumnoEstadosAsig] = useState<Record<string, EstadoDevolucion | null>>({});
  const [observacionesAsig, setObservacionesAsig] = useState<string>("");

  // ── Confirm & undo modals ───────────────────────────────────────────────────
  const [pendingConfirm, setPendingConfirm] = useState<"por_alumno" | "por_asignatura" | null>(null);
  const [pendingAnularId, setPendingAnularId] = useState<string | null>(null);

  const efectivoProfesorId = myProfesorId ?? (overrideProfesorId || null);

  // ── Derived: inactive students ──────────────────────────────────────────────
  const inactiveAlumnoIds = useMemo(
    () => new Set(alumnosInactivos.map((a) => a.id)),
    [alumnosInactivos]
  );

  // ── Derived: split activos into pending review vs already reviewed ──────────
  const prestamosParaRevisar = useMemo(
    () => prestamosActivos,
    [prestamosActivos]
  );

  const prestamosRevisados = useMemo(() => {
    if (!selectedUnidad) return [];
    return prestamosActivos.filter((p) => {
      if (!p.en_revision) return false;
      if (selectedUnidad === NO_ACTIVOS) return Boolean(p.alumno_id && inactiveAlumnoIds.has(p.alumno_id));
      return p.alumno_grupo === selectedUnidad;
    });
  }, [prestamosActivos, selectedUnidad, inactiveAlumnoIds]);

  // ── Derived: common ─────────────────────────────────────────────────────────
  const unidades = useMemo(() => {
    const groups = [...new Set(prestamosActivos.map((p) => p.alumno_grupo))].sort();
    const hasInactiveLoans = prestamosActivos.some(
      (p) => p.alumno_id && inactiveAlumnoIds.has(p.alumno_id)
    );
    if (hasInactiveLoans) groups.push(NO_ACTIVOS);
    return groups;
  }, [prestamosActivos, inactiveAlumnoIds]);

  // ── Derived: por alumno ─────────────────────────────────────────────────────
  const alumnosConPrestamos = useMemo(() => {
    const map: Record<string, { key: string; nombre: string; libroIds: Set<string> }> = {};
    for (const p of prestamosParaRevisar) {
      const matchesGroup = selectedUnidad === NO_ACTIVOS
        ? Boolean(p.alumno_id && inactiveAlumnoIds.has(p.alumno_id))
        : p.alumno_grupo === selectedUnidad;
      if (!matchesGroup) continue;
      const key = p.alumno_id ?? p.alumno_nombre;
      if (!map[key]) map[key] = { key, nombre: p.alumno_nombre, libroIds: new Set() };
      map[key].libroIds.add(p.libro_id);
    }
    return Object.values(map).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [prestamosParaRevisar, selectedUnidad, inactiveAlumnoIds]);

  const librosDelAlumno = useMemo(() => {
    if (!selectedAlumnoKey) return [];
    return prestamosParaRevisar.filter((p) => {
      const key = p.alumno_id ?? p.alumno_nombre;
      if (key !== selectedAlumnoKey) return false;
      if (selectedUnidad === NO_ACTIVOS) return true;
      return p.alumno_grupo === selectedUnidad;
    });
  }, [prestamosParaRevisar, selectedAlumnoKey, selectedUnidad]);

  const countToReview = useMemo(
    () => librosDelAlumno.filter((p) => bookStates[p.libro_id] != null).length,
    [librosDelAlumno, bookStates]
  );

  const selectedAlumno = alumnosConPrestamos.find((a) => a.key === selectedAlumnoKey) ?? null;

  // ── Derived: por asignatura ─────────────────────────────────────────────────
  const librosDelGrupoAsig = useMemo(() => {
    const map: Record<string, { libro_id: string; titulo: string; asignatura: string; nivel: string; diversificacion?: boolean; count: number }> = {};
    for (const p of prestamosParaRevisar) {
      const matchesGroup = selectedUnidad === NO_ACTIVOS
        ? Boolean(p.alumno_id && inactiveAlumnoIds.has(p.alumno_id))
        : p.alumno_grupo === selectedUnidad;
      if (!matchesGroup) continue;
      if (!map[p.libro_id]) {
        map[p.libro_id] = {
          libro_id: p.libro_id,
          titulo: p.libro?.titulo ?? "—",
          asignatura: p.libro?.asignatura ?? "",
          nivel: p.libro?.nivel ?? "",
          diversificacion: p.libro?.diversificacion,
          count: 0,
        };
      }
      map[p.libro_id].count++;
    }
    return Object.values(map).sort((a, b) => a.asignatura.localeCompare(b.asignatura) || a.titulo.localeCompare(b.titulo));
  }, [prestamosParaRevisar, selectedUnidad, inactiveAlumnoIds]);

  const alumnosConLibrosAsig = useMemo(() => {
    if (selectedLibroIdsAsig.size === 0) return [];
    const map: Record<string, { key: string; nombre: string; prestamos: PrestamoLibro[] }> = {};
    for (const p of prestamosParaRevisar) {
      const matchesGroup = selectedUnidad === NO_ACTIVOS
        ? Boolean(p.alumno_id && inactiveAlumnoIds.has(p.alumno_id))
        : p.alumno_grupo === selectedUnidad;
      if (!matchesGroup) continue;
      if (!selectedLibroIdsAsig.has(p.libro_id)) continue;
      const key = p.alumno_id ?? p.alumno_nombre;
      if (!map[key]) map[key] = { key, nombre: p.alumno_nombre, prestamos: [] };
      map[key].prestamos.push(p);
    }
    return Object.values(map).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [prestamosParaRevisar, selectedUnidad, selectedLibroIdsAsig, inactiveAlumnoIds]);

  const countAsigToReview = useMemo(
    () => Object.values(alumnoEstadosAsig).filter((e) => e != null).length,
    [alumnoEstadosAsig]
  );

  // ── Derived: ver revisados ──────────────────────────────────────────────────
  const alumnosConRevisados = useMemo(() => {
    const map: Record<string, { key: string; nombre: string; count: number }> = {};
    for (const p of prestamosRevisados) {
      const key = p.alumno_id ?? p.alumno_nombre;
      if (!map[key]) map[key] = { key, nombre: p.alumno_nombre, count: 0 };
      map[key].count++;
    }
    return Object.values(map).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [prestamosRevisados]);

  const [selectedAlumnoRevisadoKey, setSelectedAlumnoRevisadoKey] = useState<string | null>(null);
  const librosRevisadosAlumno = useMemo(() => {
    if (!selectedAlumnoRevisadoKey) return [];
    return prestamosRevisados.filter((p) => (p.alumno_id ?? p.alumno_nombre) === selectedAlumnoRevisadoKey);
  }, [prestamosRevisados, selectedAlumnoRevisadoKey]);
  const selectedAlumnoRevisado = alumnosConRevisados.find((a) => a.key === selectedAlumnoRevisadoKey) ?? null;

  // ── Actions: common ─────────────────────────────────────────────────────────
  function handleUnidadChange(unidad: string) {
    setSelectedUnidad(unidad);
    setSelectedAlumnoKey(null);
    setBookStates({});
    setObservaciones("");
    setSelectedLibroIdsAsig(new Set());
    setAlumnoEstadosAsig({});
    setObservacionesAsig("");
    setSelectedAlumnoRevisadoKey(null);
    setSuccessMsg(null);
    setErrorMsg(null);
  }

  function handleTipoChange(tipo: TipoRevision) {
    setTipoRevision(tipo);
    setSelectedAlumnoKey(null);
    setBookStates({});
    setObservaciones("");
    setSelectedLibroIdsAsig(new Set());
    setAlumnoEstadosAsig({});
    setObservacionesAsig("");
    setSuccessMsg(null);
    setErrorMsg(null);
  }

  function handleToggleRevisados(checked: boolean) {
    setShowRevisados(checked);
    setSelectedAlumnoRevisadoKey(null);
    setSuccessMsg(null);
    setErrorMsg(null);
  }

  // ── Helper: create incidencia for a loan with origen="revision" ─────────────
  async function createIncidencia(loan: PrestamoLibro, estado: EstadoDevolucion, descripcion: string | null) {
    const tipo = DEVOLUCION_TO_TIPO[estado]!;

    // Check for existing open incidencia for this prestamo (any tipo)
    const { data: existingArr } = await supabase
      .from("gratuidad_incidencias")
      .select("id, tipo")
      .eq("prestamo_id", loan.id)
      .in("estado", ["abierta", "en_gestion"])
      .limit(1);
    const existing = existingArr?.[0] ?? null;

    if (existing) {
      const tipoChanged = existing.tipo !== tipo;
      if (tipoChanged) {
        await supabase.from("gratuidad_incidencias").update({ tipo }).eq("id", existing.id as string);
      }
      await supabase.from("gratuidad_incidencias_historial").insert({
        incidencia_id: existing.id as string,
        estado: "abierta",
        nota: tipoChanged
          ? `Estado actualizado en revisión: ${TIPO_LABEL[existing.tipo as string] ?? existing.tipo} → ${TIPO_LABEL[tipo]}.${descripcion ? " " + descripcion : ""}`
          : `Revisión actualizada.${descripcion ? " " + descripcion : ""}`,
        profesor_id: efectivoProfesorId,
      });
      return;
    }

    const { data: lastInc } = await supabase
      .from("gratuidad_incidencias")
      .select("codigo")
      .order("created_at", { ascending: false })
      .limit(1);
    const nextNum = lastInc?.[0] ? parseInt((lastInc[0].codigo as string).replace("INC-", ""), 10) + 1 : 1;
    const codigo = `INC-${String(nextNum).padStart(3, "0")}`;
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
        descripcion,
        estado: "abierta",
        origen: "revision",
        curso_escolar: cursoEscolar,
      })
      .select("id")
      .single();
    if (newInc?.id && efectivoProfesorId) {
      await supabase.from("gratuidad_incidencias_historial").insert({
        incidencia_id: newInc.id,
        estado: "abierta",
        nota: "Incidencia abierta automáticamente al registrar la revisión.",
        profesor_id: efectivoProfesorId,
      });
    }
  }

  // ── Actions: por alumno ─────────────────────────────────────────────────────
  function selectAlumno(key: string) {
    setSelectedAlumnoKey(key);
    const prefilled: Record<string, EstadoDevolucion | null> = {};
    for (const p of prestamosActivos) {
      const k = p.alumno_id ?? p.alumno_nombre;
      if (k !== key) continue;
      const matchesGroup = selectedUnidad === NO_ACTIVOS
        ? Boolean(p.alumno_id && inactiveAlumnoIds.has(p.alumno_id))
        : p.alumno_grupo === selectedUnidad;
      if (!matchesGroup) continue;
      if (p.estado_revision) prefilled[p.libro_id] = p.estado_revision;
    }
    setBookStates(prefilled);
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

  async function handleGuardarRevision() {
    if (!efectivoProfesorId) {
      setErrorMsg("Selecciona el profesor que registra la revisión.");
      return;
    }
    if (countToReview === 0) return;
    setSaving(true);
    setErrorMsg(null);

    const byEstado: Partial<Record<EstadoDevolucion, string[]>> = {};
    for (const p of librosDelAlumno) {
      const estado = bookStates[p.libro_id];
      if (!estado) continue;
      if (!byEstado[estado]) byEstado[estado] = [];
      byEstado[estado]!.push(p.id);
    }

    const reviewedIds = new Set(Object.values(byEstado).flat());
    const reviewTimestamp = new Date().toISOString();
    let hasError = false;

    for (const [estado, ids] of Object.entries(byEstado) as [EstadoDevolucion, string[]][]) {
      const { error } = await supabase
        .from("prestamos_libros")
        .update({ en_revision: true, estado_revision: estado, fecha_revision: reviewTimestamp })
        .in("id", ids);
      if (error) { hasError = true; setErrorMsg(`Error: ${error.message}`); break; }
    }

    if (hasError) { setSaving(false); return; }

    // Create incidencias for deteriorado/perdido
    const incidentLoans = librosDelAlumno.filter((p) => {
      const e = bookStates[p.libro_id];
      return e === "deteriorado" || e === "perdido";
    });
    for (const loan of incidentLoans) {
      await createIncidencia(loan, bookStates[loan.libro_id] as EstadoDevolucion, observaciones.trim() || null);
    }

    // Update livePrestamosList: mark reviewed books
    onPrestamosChange((prev) =>
      prev.map((p) => {
        const estado = bookStates[p.libro_id];
        if (!reviewedIds.has(p.id) || !estado) return p;
        return { ...p, en_revision: true, estado_revision: estado, fecha_revision: reviewTimestamp };
      })
    );

    const total = reviewedIds.size;
    setSelectedAlumnoKey(null);
    setBookStates({});
    setObservaciones("");
    setSaving(false);
    setSuccessMsg(`${total} revisión${total !== 1 ? "es" : ""} guardada${total !== 1 ? "s" : ""}.`);
  }

  // ── Actions: por asignatura ─────────────────────────────────────────────────
  function prefillEstadosAsig(libroIds: Set<string>) {
    if (libroIds.size === 0) { setAlumnoEstadosAsig({}); return; }
    const alumnoEstados: Record<string, Set<string>> = {};
    for (const p of prestamosActivos) {
      const matchesGroup = selectedUnidad === NO_ACTIVOS
        ? Boolean(p.alumno_id && inactiveAlumnoIds.has(p.alumno_id))
        : p.alumno_grupo === selectedUnidad;
      if (!matchesGroup || !libroIds.has(p.libro_id) || !p.en_revision || !p.estado_revision) continue;
      const key = p.alumno_id ?? p.alumno_nombre;
      if (!alumnoEstados[key]) alumnoEstados[key] = new Set();
      alumnoEstados[key].add(p.estado_revision);
    }
    const prefilled: Record<string, EstadoDevolucion | null> = {};
    for (const [key, estados] of Object.entries(alumnoEstados)) {
      if (estados.size === 1) prefilled[key] = [...estados][0] as EstadoDevolucion;
    }
    setAlumnoEstadosAsig(prefilled);
  }

  function toggleLibroAsig(libroId: string) {
    const next = new Set(selectedLibroIdsAsig);
    if (next.has(libroId)) next.delete(libroId);
    else next.add(libroId);
    setSelectedLibroIdsAsig(next);
    prefillEstadosAsig(next);
  }

  function selectAllLibrosAsig() {
    const next = new Set(librosDelGrupoAsig.map((l) => l.libro_id));
    setSelectedLibroIdsAsig(next);
    prefillEstadosAsig(next);
  }

  function clearAllLibrosAsig() {
    setSelectedLibroIdsAsig(new Set());
    setAlumnoEstadosAsig({});
  }

  function handleAlumnoEstadoAsig(key: string, estado: EstadoDevolucion) {
    setAlumnoEstadosAsig((prev) => ({
      ...prev,
      [key]: prev[key] === estado ? null : estado,
    }));
  }

  function handleTodoEstadoAsig(estado: EstadoDevolucion) {
    const all: Record<string, EstadoDevolucion> = {};
    for (const a of alumnosConLibrosAsig) all[a.key] = estado;
    setAlumnoEstadosAsig(all);
  }

  async function handleGuardarRevisionAsig() {
    if (!efectivoProfesorId) {
      setErrorMsg("Selecciona el profesor que registra la revisión.");
      return;
    }
    if (countAsigToReview === 0) return;
    setSaving(true);
    setErrorMsg(null);

    const byEstado: Partial<Record<EstadoDevolucion, string[]>> = {};
    const reviewedIds = new Set<string>();

    for (const alumno of alumnosConLibrosAsig) {
      const estado = alumnoEstadosAsig[alumno.key];
      if (!estado) continue;
      for (const p of alumno.prestamos) {
        if (!byEstado[estado]) byEstado[estado] = [];
        byEstado[estado]!.push(p.id);
        reviewedIds.add(p.id);
      }
    }

    const reviewTimestamp = new Date().toISOString();
    let hasError = false;
    for (const [estado, ids] of Object.entries(byEstado) as [EstadoDevolucion, string[]][]) {
      const { error } = await supabase
        .from("prestamos_libros")
        .update({ en_revision: true, estado_revision: estado, fecha_revision: reviewTimestamp })
        .in("id", ids);
      if (error) { hasError = true; setErrorMsg(`Error: ${error.message}`); break; }
    }

    if (hasError) { setSaving(false); return; }

    // Create incidencias for deteriorado/perdido
    for (const alumno of alumnosConLibrosAsig) {
      const estado = alumnoEstadosAsig[alumno.key];
      if (estado === "deteriorado" || estado === "perdido") {
        for (const loan of alumno.prestamos) {
          await createIncidencia(loan, estado, observacionesAsig.trim() || null);
        }
      }
    }

    // Update livePrestamosList: mark reviewed books
    const estadoMap: Record<string, EstadoDevolucion> = {};
    for (const alumno of alumnosConLibrosAsig) {
      const estado = alumnoEstadosAsig[alumno.key];
      if (!estado) continue;
      for (const p of alumno.prestamos) estadoMap[p.id] = estado;
    }
    onPrestamosChange((prev) =>
      prev.map((p) => {
        const estado = estadoMap[p.id];
        if (!estado) return p;
        return { ...p, en_revision: true, estado_revision: estado, fecha_revision: reviewTimestamp };
      })
    );

    const total = reviewedIds.size;
    setSelectedLibroIdsAsig(new Set());
    setAlumnoEstadosAsig({});
    setObservacionesAsig("");
    setSaving(false);
    setSuccessMsg(`${total} revisión${total !== 1 ? "es" : ""} guardada${total !== 1 ? "s" : ""}.`);
  }

  // ── Actions: anular revisión ────────────────────────────────────────────────
  async function handleAnularRevision(prestamoId: string) {
    setErrorMsg(null);
    const { error } = await supabase
      .from("prestamos_libros")
      .update({ en_revision: false, estado_revision: null, fecha_revision: null })
      .eq("id", prestamoId);
    if (error) { setErrorMsg(`Error: ${error.message}`); return; }
    onPrestamosChange((prev) =>
      prev.map((p) =>
        p.id === prestamoId
          ? { ...p, en_revision: false, estado_revision: null, fecha_revision: null }
          : p
      )
    );
    const remaining = prestamosRevisados.filter(
      (p) => p.id !== prestamoId && (p.alumno_id ?? p.alumno_nombre) === selectedAlumnoRevisadoKey
    );
    if (remaining.length === 0) setSelectedAlumnoRevisadoKey(null);
    setSuccessMsg("Revisión anulada. El libro vuelve a la lista de pendientes.");
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const showPanels = Boolean(selectedUnidad) && alumnosConPrestamos.length > 0 && !showRevisados;

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
        {!showRevisados && (
          <div className="relative">
            <select
              value={tipoRevision}
              onChange={(e) => handleTipoChange(e.target.value as TipoRevision)}
              className="appearance-none border border-gray-300 rounded-lg pl-3 pr-8 py-2.5 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="por_asignatura">Por asignatura</option>
              <option value="por_alumno">Por alumno</option>
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        )}

        {/* Selector de grupo */}
        <div className="relative">
          <select
            value={selectedUnidad}
            onChange={(e) => handleUnidadChange(e.target.value)}
            className="appearance-none border border-gray-300 rounded-lg pl-3 pr-8 py-2.5 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-44"
          >
            <option value="">Selecciona un grupo...</option>
            {unidades.map((u) => (
              <option key={u} value={u}>{u === NO_ACTIVOS ? "No activos" : u}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        {selectedUnidad && alumnosConPrestamos.length > 0 && !showRevisados && (
          <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-medium px-2.5 py-1.5 rounded-full">
            <Users size={12} />
            {alumnosConPrestamos.length} pendientes
          </span>
        )}

        {selectedUnidad && prestamosRevisados.length > 0 && !showRevisados && (
          <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-200 text-xs font-medium px-2.5 py-1.5 rounded-full">
            <CheckCircle size={12} />
            {prestamosRevisados.length} revisados
          </span>
        )}

        {/* Toggle ver revisados */}
        {selectedUnidad && (
          <label className="flex items-center gap-2 cursor-pointer select-none ml-auto">
            <input
              type="checkbox"
              checked={showRevisados}
              onChange={(e) => handleToggleRevisados(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 accent-indigo-600 cursor-pointer"
            />
            <span className="text-sm text-gray-600 font-medium whitespace-nowrap">Ver revisados</span>
          </label>
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
          <ClipboardCheck size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">Selecciona un grupo para revisar libros</p>
          <p className="text-sm mt-1">Solo aparecen grupos con préstamos activos</p>
        </div>
      )}
      {selectedUnidad && alumnosConPrestamos.length === 0 && !showRevisados && (
        <div className="text-center py-12 text-gray-400">
          <CheckCircle size={36} className="mx-auto mb-2 opacity-40" />
          <p className="font-medium">No hay préstamos activos en este grupo</p>
        </div>
      )}

      {/* ── Vista: Ver revisados ──────────────────────────────────────────────── */}
      {showRevisados && selectedUnidad && (
        prestamosRevisados.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <BookOpen size={36} className="mx-auto mb-2 opacity-40" />
            <p className="font-medium">No hay libros revisados en este grupo</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">

            {/* Panel izquierdo — alumnos con revisiones */}
            <div className="md:col-span-2 flex flex-col gap-2">
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <span className="text-sm font-semibold text-gray-700">Alumnado revisado</span>
                  <span className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
                    {alumnosConRevisados.length} alumnos
                  </span>
                </div>
                <div className="divide-y divide-gray-50">
                  {alumnosConRevisados.map((alumno) => {
                    const isSelected = alumno.key === selectedAlumnoRevisadoKey;
                    return (
                      <button
                        key={alumno.key}
                        onClick={() => setSelectedAlumnoRevisadoKey(alumno.key)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${isSelected ? "bg-indigo-50" : "hover:bg-gray-50"}`}
                      >
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isSelected ? "bg-indigo-200 text-indigo-800" : "bg-gray-200 text-gray-600"}`}>
                          {initialsFromNombre(alumno.nombre)}
                        </div>
                        <span className="text-sm text-gray-800 flex-1 min-w-0 truncate">{alumno.nombre}</span>
                        <span className="text-xs text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full flex-shrink-0 tabular-nums">
                          {alumno.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Panel derecho — libros revisados */}
            <div className="md:col-span-3 flex flex-col gap-2">
              {!selectedAlumnoRevisado ? (
                <div className="bg-white border border-gray-200 rounded-xl flex flex-col items-center justify-center py-16 text-gray-400">
                  <Eye size={36} className="mb-2 opacity-40" />
                  <p className="text-sm font-medium">Selecciona un alumno de la lista</p>
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 flex-shrink-0">
                      {initialsFromNombre(selectedAlumnoRevisado.nombre)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{selectedAlumnoRevisado.nombre}</p>
                      <p className="text-xs text-gray-500">{selectedUnidad === NO_ACTIVOS ? "No activo" : selectedUnidad}</p>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {librosRevisadosAlumno.map((p) => {
                      const cfg = p.estado_revision ? ESTADO_CONFIG[p.estado_revision] : null;
                      const fechaRev = p.fecha_revision
                        ? new Date(p.fecha_revision).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })
                        : null;
                      return (
                        <div key={p.id} className="flex items-start gap-3 px-4 py-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{p.libro?.titulo ?? "—"}</p>
                              {p.libro?.diversificacion && (
                                <span className="flex-shrink-0 text-[9px] font-semibold tracking-wide uppercase px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">DIV</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <p className="text-xs text-gray-400">
                                {p.libro?.asignatura}
                                {p.num_ejemplar && <> · Ej. {p.num_ejemplar}</>}
                              </p>
                              {cfg && (
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${cfg.active}`}>
                                  {cfg.label}
                                </span>
                              )}
                              {fechaRev && (
                                <span className="text-[10px] text-gray-400">Revisado: {fechaRev}</span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => setPendingAnularId(p.id)}
                            title="Anular revisión"
                            className="flex-shrink-0 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Undo2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      )}

      {/* ── Vista: Por alumno ──────────────────────────────────────────────────── */}
      {showPanels && tipoRevision === "por_alumno" && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">

          {/* Panel izquierdo — lista de alumnos */}
          <div className="md:col-span-2 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
              <span className="text-sm font-medium text-gray-700">Selecciona el alumno a revisar</span>
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
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${isSelected ? "bg-indigo-50" : "hover:bg-gray-50"}`}
                    >
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isSelected ? "bg-indigo-200 text-indigo-800" : "bg-gray-200 text-gray-600"}`}>
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
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
              <span className="text-sm font-medium text-gray-700">Indica el estado de cada libro</span>
            </div>
            {!selectedAlumno ? (
              <div className="bg-white border border-gray-200 rounded-xl flex flex-col items-center justify-center py-16 text-gray-400">
                <BookOpen size={36} className="mb-2 opacity-40" />
                <p className="text-sm font-medium">Selecciona un alumno de la lista</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50 flex-wrap">
                  <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 flex-shrink-0">
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
                      Todo reutilizable
                    </button>
                    <button
                      onClick={() => setPendingConfirm("por_alumno")}
                      disabled={countToReview === 0 || saving}
                      className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                    >
                      <ClipboardCheck size={14} />
                      {saving ? "Guardando..." : `Guardar revisión (${countToReview}/${librosDelAlumno.length})`}
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-gray-100">
                  {librosDelAlumno.map((p) => {
                    const estado = bookStates[p.libro_id] ?? null;
                    return (
                      <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{p.libro?.titulo ?? "—"}</p>
                            {p.libro?.diversificacion && (
                              <span className="flex-shrink-0 text-[9px] font-semibold tracking-wide uppercase px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">DIV</span>
                            )}
                            {p.en_revision && (
                              <span className="flex-shrink-0 text-[9px] font-semibold tracking-wide uppercase px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 border border-indigo-200">Revisado</span>
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
                              className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${estado === e ? ESTADO_CONFIG[e].active : `border-gray-200 text-gray-500 bg-white ${ESTADO_CONFIG[e].hover}`}`}
                            >
                              {ESTADO_CONFIG[e].label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
                  <input
                    type="text"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Observaciones en caso de deterioros o extravíos (opcional) ..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Vista: Por asignatura ─────────────────────────────────────────────── */}
      {showPanels && tipoRevision === "por_asignatura" && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">

          {/* Panel izquierdo — libros del grupo */}
          <div className="md:col-span-2 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
              <span className="text-sm font-medium text-gray-700">Selecciona los libros a revisar</span>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="text-sm font-semibold text-gray-700">Libros del grupo</span>
                <div className="flex items-center gap-2">
                  <button onClick={selectAllLibrosAsig} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors">Todos</button>
                  <span className="text-gray-300">·</span>
                  <button onClick={clearAllLibrosAsig} className="text-xs text-gray-400 hover:text-gray-600 font-medium transition-colors">Ninguno</button>
                </div>
              </div>
              <div className="divide-y divide-gray-50">
                {librosDelGrupoAsig.map((libro) => {
                  const isChecked = selectedLibroIdsAsig.has(libro.libro_id);
                  return (
                    <button
                      key={libro.libro_id}
                      onClick={() => toggleLibroAsig(libro.libro_id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${isChecked ? "bg-indigo-50" : "hover:bg-gray-50"}`}
                    >
                      <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-colors ${isChecked ? "bg-indigo-600 border-indigo-600" : "border-gray-300 bg-white"}`}>
                        {isChecked && <Check size={12} className="text-white" strokeWidth={3} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{libro.titulo}</p>
                          {libro.diversificacion && (
                            <span className="flex-shrink-0 text-[9px] font-semibold tracking-wide uppercase px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">DIV</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 truncate">{libro.asignatura}</p>
                      </div>
                      <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex-shrink-0 tabular-nums">
                        {libro.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Panel derecho — alumnos con estado */}
          <div className="md:col-span-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
              <span className="text-sm font-medium text-gray-700">Indica el estado de la revisión por alumno</span>
            </div>
            {selectedLibroIdsAsig.size === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl flex flex-col items-center justify-center py-16 text-gray-400">
                <BookOpen size={36} className="mb-2 opacity-40" />
                <p className="text-sm font-medium">Selecciona al menos un libro</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-700 mr-auto">
                      {alumnosConLibrosAsig.length} alumnos
                    </span>
                    <button
                      onClick={() => handleTodoEstadoAsig("bueno")}
                      className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2.5 py-1.5 rounded-lg hover:bg-green-100 transition-colors whitespace-nowrap"
                    >
                      Todo reutilizable
                    </button>
                    <button
                      onClick={() => handleTodoEstadoAsig("deteriorado")}
                      className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-lg hover:bg-amber-100 transition-colors whitespace-nowrap"
                    >
                      Todo no reutilizable
                    </button>
                    <button
                      onClick={() => handleTodoEstadoAsig("perdido")}
                      className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 px-2.5 py-1.5 rounded-lg hover:bg-red-100 transition-colors whitespace-nowrap"
                    >
                      Todo perdido
                    </button>
                  </div>
                  <div className="flex justify-center">
                    <button
                      onClick={() => setPendingConfirm("por_asignatura")}
                      disabled={countAsigToReview === 0 || saving}
                      className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors whitespace-nowrap"
                    >
                      <ClipboardCheck size={14} />
                      {saving ? "Guardando..." : `Guardar revisión (${countAsigToReview}/${alumnosConLibrosAsig.length})`}
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-gray-100">
                  {alumnosConLibrosAsig.map((alumno) => {
                    const estado = alumnoEstadosAsig[alumno.key] ?? null;
                    return (
                      <div key={alumno.key} className="flex items-center gap-3 px-4 py-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${estado ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-600"}`}>
                          {initialsFromNombre(alumno.nombre)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{alumno.nombre}</p>
                            {alumno.prestamos.some((p) => p.en_revision) && (
                              <span className="flex-shrink-0 text-[9px] font-semibold tracking-wide uppercase px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 border border-indigo-200">Revisado</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400">{alumno.prestamos.length} libro{alumno.prestamos.length !== 1 ? "s" : ""}</p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          {(Object.keys(ESTADO_CONFIG) as EstadoDevolucion[]).map((e) => (
                            <button
                              key={e}
                              onClick={() => handleAlumnoEstadoAsig(alumno.key, e)}
                              className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${estado === e ? ESTADO_CONFIG[e].active : `border-gray-200 text-gray-500 bg-white ${ESTADO_CONFIG[e].hover}`}`}
                            >
                              {ESTADO_CONFIG[e].label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 space-y-3">
                  <input
                    type="text"
                    value={observacionesAsig}
                    onChange={(e) => setObservacionesAsig(e.target.value)}
                    placeholder="Observaciones en caso de deterioros o extravíos (opcional) ..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="flex justify-center">
                    <button
                      onClick={() => setPendingConfirm("por_asignatura")}
                      disabled={countAsigToReview === 0 || saving}
                      className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors whitespace-nowrap"
                    >
                      <ClipboardCheck size={14} />
                      {saving ? "Guardando..." : `Guardar revisión (${countAsigToReview}/${alumnosConLibrosAsig.length})`}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: confirmar anulación de revisión */}
      {pendingAnularId && (() => {
        const p = prestamosRevisados.find((x) => x.id === pendingAnularId);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
              <div className="px-5 py-4 border-b flex items-center gap-3">
                <Undo2 size={20} className="text-red-500 flex-shrink-0" />
                <h2 className="font-semibold text-gray-900">Anular revisión</h2>
              </div>
              <div className="px-5 py-4 space-y-1">
                <p className="text-sm text-gray-600">
                  ¿Anular la revisión de <span className="font-semibold">{p?.libro?.titulo ?? "este libro"}</span> de{" "}
                  <span className="font-semibold">{p?.alumno_nombre ?? "este alumno"}</span>?
                </p>
                <p className="text-xs text-gray-400">El libro volverá a aparecer como pendiente de revisión.</p>
              </div>
              <div className="flex gap-3 px-5 py-4 border-t">
                <button
                  onClick={() => setPendingAnularId(null)}
                  className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    const id = pendingAnularId;
                    setPendingAnularId(null);
                    handleAnularRevision(id);
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
                >
                  Anular revisión
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal: confirmar guardar revisión */}
      {pendingConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="px-5 py-4 border-b flex items-center gap-3">
              <ClipboardCheck size={20} className="text-indigo-600 flex-shrink-0" />
              <h2 className="font-semibold text-gray-900">Confirmar revisión</h2>
            </div>
            <div className="px-5 py-4">
              {pendingConfirm === "por_alumno" ? (
                <p className="text-sm text-gray-600">
                  ¿Guardar la revisión de{" "}
                  <span className="font-semibold">{countToReview} libro{countToReview !== 1 ? "s" : ""}</span>{" "}
                  de <span className="font-semibold">{selectedAlumno?.nombre}</span>?
                </p>
              ) : (
                <p className="text-sm text-gray-600">
                  ¿Guardar la revisión de{" "}
                  <span className="font-semibold">{countAsigToReview} alumno{countAsigToReview !== 1 ? "s" : ""}</span>{" "}
                  ({selectedLibroIdsAsig.size} libro{selectedLibroIdsAsig.size !== 1 ? "s" : ""})?
                </p>
              )}
            </div>
            <div className="flex gap-3 px-5 py-4 border-t">
              <button
                onClick={() => setPendingConfirm(null)}
                className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const tipo = pendingConfirm;
                  setPendingConfirm(null);
                  if (tipo === "por_alumno") handleGuardarRevision();
                  else handleGuardarRevisionAsig();
                }}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

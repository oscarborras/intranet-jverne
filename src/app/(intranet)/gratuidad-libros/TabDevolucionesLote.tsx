"use client";

import { useState, useMemo, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  CheckCircle, AlertTriangle, X, Users, CalendarDays, ChevronDown, RotateCcw, BookOpen, Check,
} from "lucide-react";
import type { PrestamoLibro, EstadoDevolucion, TipoIncidencia, Alumno } from "@/lib/types";

const NO_ACTIVOS = "__no_activos__";

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
  bueno: { label: "Reutilizable", active: "bg-green-100 text-green-700 border-green-300", hover: "hover:bg-green-50 hover:border-green-200" },
  deteriorado: { label: "No reutilizable", active: "bg-amber-100 text-amber-700 border-amber-300", hover: "hover:bg-amber-50 hover:border-amber-200" },
  perdido: { label: "Perdido", active: "bg-red-100 text-red-700 border-red-300", hover: "hover:bg-red-50 hover:border-red-200" },
};

type TipoDevolucion = "por_alumno" | "por_asignatura";

// ─── Props ────────────────────────────────────────────────────────────────────

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

// ─── Componente principal ─────────────────────────────────────────────────────

export function TabDevolucionesLote({ prestamosActivos, onPrestamosChange, cursoEscolar, myProfesorId, canManage, profesores, alumnosInactivos, initialGrupo }: Props) {
  const supabase = createClient();

  // ── Common state ────────────────────────────────────────────────────────────
  const [tipoDevolucion, setTipoDevolucion] = useState<TipoDevolucion>("por_asignatura");
  const [selectedUnidad, setSelectedUnidad] = useState<string>(initialGrupo ?? "");
  const [fechaDevolucion, setFechaDevolucion] = useState<string>(todayString());
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [overrideProfesorId, setOverrideProfesorId] = useState<string>(myProfesorId ?? "");

  // ── Por alumno state ─────────────────────────────────────────────────────────
  const [selectedAlumnoKey, setSelectedAlumnoKey] = useState<string | null>(null);
  const [bookStates, setBookStates] = useState<Record<string, EstadoDevolucion | null>>({});
  const [observaciones, setObservaciones] = useState<string>("");

  // ── Por asignatura state ─────────────────────────────────────────────────────
  const [selectedLibroIdsAsig, setSelectedLibroIdsAsig] = useState<Set<string>>(new Set());
  const [alumnoEstadosAsig, setAlumnoEstadosAsig] = useState<Record<string, EstadoDevolucion | null>>({});
  const [observacionesAsig, setObservacionesAsig] = useState<string>("");

  // ── Ver devueltos state ───────────────────────────────────────────────────────
  const [showDevueltos, setShowDevueltos] = useState(false);
  const [prestamosDevueltos, setPrestamosDevueltos] = useState<PrestamoLibro[]>([]);
  const [loadingDevueltos, setLoadingDevueltos] = useState(false);
  const [selectedAlumnoDevueltoKey, setSelectedAlumnoDevueltoKey] = useState<string | null>(null);
  const [editStates, setEditStates] = useState<Record<string, { estado: EstadoDevolucion; fecha: string }>>({});
  const [savingEdit, setSavingEdit] = useState(false);

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

  // ── Fetch devueltos cuando el toggle está activo y hay grupo seleccionado ────
  useEffect(() => {
    if (!showDevueltos || !selectedUnidad) {
      setPrestamosDevueltos([]);
      setSelectedAlumnoDevueltoKey(null);
      return;
    }
    let cancelled = false;
    setLoadingDevueltos(true);

    async function fetchDev() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query: any = supabase
        .from("prestamos_libros")
        .select("id, libro_id, alumno_id, alumno_nombre, alumno_grupo, num_ejemplar, fecha_prestamo, entregado_por, devuelto_por, curso_escolar, fecha_devolucion, estado_devolucion, observaciones, created_at, libro:libros_catalogo(titulo, asignatura, nivel, diversificacion)")
        .eq("curso_escolar", cursoEscolar)
        .not("fecha_devolucion", "is", null)
        .order("alumno_nombre");

      if (selectedUnidad === NO_ACTIVOS) {
        const ids = [...inactiveAlumnoIds];
        if (ids.length === 0) {
          if (!cancelled) { setPrestamosDevueltos([]); setLoadingDevueltos(false); }
          return;
        }
        query = query.in("alumno_id", ids);
      } else {
        query = query.eq("alumno_grupo", selectedUnidad);
      }

      const { data } = await query;
      if (!cancelled) {
        setPrestamosDevueltos((data ?? []).map((p: Record<string, unknown>) => ({
          ...p,
          libro: (p.libro as { titulo: string; asignatura: string; nivel: string; diversificacion?: boolean } | null) ?? undefined,
        })) as PrestamoLibro[]);
        setLoadingDevueltos(false);
      }
    }

    fetchDev();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDevueltos, selectedUnidad, cursoEscolar]);

  // ── Derived: common ─────────────────────────────────────────────────────────

  const inactiveAlumnoIds = useMemo(
    () => new Set(alumnosInactivos.map((a) => a.id)),
    [alumnosInactivos]
  );

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
    for (const p of prestamosActivos) {
      const matchesGroup = selectedUnidad === NO_ACTIVOS
        ? Boolean(p.alumno_id && inactiveAlumnoIds.has(p.alumno_id))
        : p.alumno_grupo === selectedUnidad;
      if (!matchesGroup) continue;
      const key = p.alumno_id ?? p.alumno_nombre;
      if (!map[key]) map[key] = { key, nombre: p.alumno_nombre, libroIds: new Set() };
      map[key].libroIds.add(p.libro_id);
    }
    return Object.values(map).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [prestamosActivos, selectedUnidad, inactiveAlumnoIds]);

  const librosDelAlumno = useMemo(() => {
    if (!selectedAlumnoKey) return [];
    return prestamosActivos.filter((p) => {
      const key = p.alumno_id ?? p.alumno_nombre;
      if (key !== selectedAlumnoKey) return false;
      if (selectedUnidad === NO_ACTIVOS) return true;
      return p.alumno_grupo === selectedUnidad;
    });
  }, [prestamosActivos, selectedAlumnoKey, selectedUnidad]);

  const countToReturn = useMemo(() =>
    librosDelAlumno.filter((p) => bookStates[p.libro_id] != null).length,
    [librosDelAlumno, bookStates]);

  const selectedAlumno = alumnosConPrestamos.find((a) => a.key === selectedAlumnoKey) ?? null;

  // ── Derived: por asignatura ─────────────────────────────────────────────────

  const librosDelGrupoAsig = useMemo(() => {
    const map: Record<string, { libro_id: string; titulo: string; asignatura: string; nivel: string; diversificacion?: boolean; count: number }> = {};
    for (const p of prestamosActivos) {
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
  }, [prestamosActivos, selectedUnidad, inactiveAlumnoIds]);

  const alumnosConLibrosAsig = useMemo(() => {
    if (selectedLibroIdsAsig.size === 0) return [];
    const map: Record<string, { key: string; nombre: string; prestamos: PrestamoLibro[] }> = {};
    for (const p of prestamosActivos) {
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
  }, [prestamosActivos, selectedUnidad, selectedLibroIdsAsig, inactiveAlumnoIds]);

  const countAsigToReturn = useMemo(() =>
    Object.values(alumnoEstadosAsig).filter((e) => e != null).length,
    [alumnoEstadosAsig]);

  // ── Derived: ver devueltos ───────────────────────────────────────────────────

  const alumnosConDevueltos = useMemo(() => {
    const map: Record<string, { key: string; nombre: string; count: number }> = {};
    for (const p of prestamosDevueltos) {
      const key = p.alumno_id ?? p.alumno_nombre;
      if (!map[key]) map[key] = { key, nombre: p.alumno_nombre, count: 0 };
      map[key].count++;
    }
    return Object.values(map).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [prestamosDevueltos]);

  const librosDevueltos = useMemo(() => {
    if (!selectedAlumnoDevueltoKey) return [];
    return prestamosDevueltos.filter((p) => (p.alumno_id ?? p.alumno_nombre) === selectedAlumnoDevueltoKey);
  }, [prestamosDevueltos, selectedAlumnoDevueltoKey]);

  const selectedAlumnoDevuelto = alumnosConDevueltos.find((a) => a.key === selectedAlumnoDevueltoKey) ?? null;

  // ── Actions: common ─────────────────────────────────────────────────────────

  function handleUnidadChange(unidad: string) {
    setSelectedUnidad(unidad);
    setSelectedAlumnoKey(null);
    setBookStates({});
    setObservaciones("");
    setSelectedLibroIdsAsig(new Set());
    setAlumnoEstadosAsig({});
    setObservacionesAsig("");
    setSelectedAlumnoDevueltoKey(null);
    setEditStates({});
    setSuccessMsg(null);
    setErrorMsg(null);
  }

  function handleTipoChange(tipo: TipoDevolucion) {
    setTipoDevolucion(tipo);
    setSelectedAlumnoKey(null);
    setBookStates({});
    setObservaciones("");
    setSelectedLibroIdsAsig(new Set());
    setAlumnoEstadosAsig({});
    setObservacionesAsig("");
    setSuccessMsg(null);
    setErrorMsg(null);
  }

  function handleToggleDevueltos(checked: boolean) {
    setShowDevueltos(checked);
    setSelectedAlumnoDevueltoKey(null);
    setEditStates({});
    setPrestamosDevueltos([]);
    setSuccessMsg(null);
    setErrorMsg(null);
  }

  function selectAlumnoDevuelto(key: string) {
    setSelectedAlumnoDevueltoKey(key);
    const loans = prestamosDevueltos.filter((p) => (p.alumno_id ?? p.alumno_nombre) === key);
    const states: Record<string, { estado: EstadoDevolucion; fecha: string }> = {};
    for (const p of loans) {
      states[p.id] = {
        estado: (p.estado_devolucion as EstadoDevolucion) ?? "bueno",
        fecha: p.fecha_devolucion ?? todayString(),
      };
    }
    setEditStates(states);
  }

  async function handleGuardarEdicion() {
    setSavingEdit(true);
    setErrorMsg(null);
    let hasError = false;
    for (const [prestamoId, { estado, fecha }] of Object.entries(editStates)) {
      const { error } = await supabase
        .from("prestamos_libros")
        .update({ estado_devolucion: estado, fecha_devolucion: fecha })
        .eq("id", prestamoId);
      if (error) { hasError = true; setErrorMsg(`Error: ${error.message}`); break; }
    }
    setSavingEdit(false);
    if (!hasError) {
      setPrestamosDevueltos((prev) =>
        prev.map((p) => {
          const edit = editStates[p.id];
          return edit ? { ...p, estado_devolucion: edit.estado, fecha_devolucion: edit.fecha } : p;
        })
      );
      setSuccessMsg("Cambios guardados correctamente.");
    }
  }

  // ── Actions: por alumno ─────────────────────────────────────────────────────

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

    const byEstado: Partial<Record<EstadoDevolucion, string[]>> = {};
    for (const p of librosDelAlumno) {
      const estado = bookStates[p.libro_id];
      if (!estado) continue;
      if (!byEstado[estado]) byEstado[estado] = [];
      byEstado[estado]!.push(p.id);
    }

    const allReturnedIds = new Set(Object.values(byEstado).flat());

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

  // ── Actions: por asignatura ─────────────────────────────────────────────────

  function toggleLibroAsig(libroId: string) {
    setSelectedLibroIdsAsig((prev) => {
      const next = new Set(prev);
      if (next.has(libroId)) next.delete(libroId);
      else next.add(libroId);
      return next;
    });
    setAlumnoEstadosAsig({});
  }

  function selectAllLibrosAsig() {
    setSelectedLibroIdsAsig(new Set(librosDelGrupoAsig.map((l) => l.libro_id)));
    setAlumnoEstadosAsig({});
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

  async function handleFinalizarAsig() {
    if (!efectivoProfesorId) {
      setErrorMsg("Selecciona el profesor que registra la devolución.");
      return;
    }
    if (countAsigToReturn === 0) return;
    setSaving(true);
    setErrorMsg(null);

    const byEstado: Partial<Record<EstadoDevolucion, string[]>> = {};
    const allReturnedIds = new Set<string>();

    for (const alumno of alumnosConLibrosAsig) {
      const estado = alumnoEstadosAsig[alumno.key];
      if (!estado) continue;
      for (const p of alumno.prestamos) {
        if (!byEstado[estado]) byEstado[estado] = [];
        byEstado[estado]!.push(p.id);
        allReturnedIds.add(p.id);
      }
    }

    let hasError = false;
    for (const [estado, ids] of Object.entries(byEstado) as [EstadoDevolucion, string[]][]) {
      const { error } = await supabase
        .from("prestamos_libros")
        .update({
          fecha_devolucion: fechaDevolucion,
          estado_devolucion: estado,
          devuelto_por: efectivoProfesorId,
          observaciones: observacionesAsig.trim() || null,
        })
        .in("id", ids);
      if (error) { hasError = true; setErrorMsg(`Error: ${error.message}`); break; }
    }

    if (hasError) { setSaving(false); return; }

    // Create incidencias for deteriorado/perdido
    const incidentEntries: Array<{ loan: PrestamoLibro; estado: EstadoDevolucion }> = [];
    for (const alumno of alumnosConLibrosAsig) {
      const estado = alumnoEstadosAsig[alumno.key];
      if (estado === "deteriorado" || estado === "perdido") {
        for (const loan of alumno.prestamos) incidentEntries.push({ loan, estado });
      }
    }

    if (incidentEntries.length > 0) {
      const { data: lastInc } = await supabase
        .from("gratuidad_incidencias")
        .select("codigo")
        .order("created_at", { ascending: false })
        .limit(1);
      let nextNum = lastInc?.[0] ? parseInt(lastInc[0].codigo.replace("INC-", ""), 10) : 0;
      for (const { loan, estado } of incidentEntries) {
        nextNum++;
        const codigo = `INC-${String(nextNum).padStart(3, "0")}`;
        const tipo = DEVOLUCION_TO_TIPO[estado]!;
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
            descripcion: observacionesAsig.trim() || null,
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
    setSelectedLibroIdsAsig(new Set());
    setAlumnoEstadosAsig({});
    setObservacionesAsig("");
    setSaving(false);
    setSuccessMsg(`${total} devolución${total !== 1 ? "es" : ""} registrada${total !== 1 ? "s" : ""}.`);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const showPanels = Boolean(selectedUnidad) && alumnosConPrestamos.length > 0 && !showDevueltos;

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
        {/* Tipo de devolución — oculto en modo ver devueltos */}
        {!showDevueltos && (
          <div className="relative">
            <select
              value={tipoDevolucion}
              onChange={(e) => handleTipoChange(e.target.value as TipoDevolucion)}
              className="appearance-none border border-gray-300 rounded-lg pl-3 pr-8 py-2.5 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="appearance-none border border-gray-300 rounded-lg pl-3 pr-8 py-2.5 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-44"
          >
            <option value="">Selecciona un grupo...</option>
            {unidades.map((u) => (
              <option key={u} value={u}>{u === NO_ACTIVOS ? "No activos" : u}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        {selectedUnidad && alumnosConPrestamos.length > 0 && !showDevueltos && (
          <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium px-2.5 py-1.5 rounded-full">
            <Users size={12} />
            {alumnosConPrestamos.length} pendientes
          </span>
        )}

        {/* Lado derecho: fecha + toggle ver devueltos */}
        <div className="flex items-center gap-3 ml-auto">
          {selectedUnidad && !showDevueltos && (
            <div className="flex items-center gap-1.5">
              <CalendarDays size={14} className="text-gray-400 flex-shrink-0" />
              <input
                type="date"
                value={fechaDevolucion}
                onChange={(e) => setFechaDevolucion(e.target.value)}
                className="border border-gray-300 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          {selectedUnidad && (
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showDevueltos}
                onChange={(e) => handleToggleDevueltos(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 accent-blue-600 cursor-pointer"
              />
              <span className="text-sm text-gray-600 font-medium whitespace-nowrap">Ver devueltos</span>
            </label>
          )}
        </div>
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
      {selectedUnidad && alumnosConPrestamos.length === 0 && !showDevueltos && (
        <div className="text-center py-12 text-gray-400">
          <CheckCircle size={36} className="mx-auto mb-2 opacity-40" />
          <p className="font-medium">Todos los libros de este grupo están devueltos</p>
        </div>
      )}

      {/* ── Vista: Ver devueltos ──────────────────────────────────────────────── */}
      {showDevueltos && selectedUnidad && (
        loadingDevueltos ? (
          <div className="text-center py-12 text-gray-400">
            <RotateCcw size={36} className="mx-auto mb-2 opacity-40 animate-spin" />
            <p className="text-sm font-medium">Cargando devoluciones...</p>
          </div>
        ) : prestamosDevueltos.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <BookOpen size={36} className="mx-auto mb-2 opacity-40" />
            <p className="font-medium">No hay devoluciones registradas en este grupo</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">

            {/* Panel izquierdo — alumnos con devoluciones */}
            <div className="md:col-span-2 flex flex-col gap-2">
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <span className="text-sm font-semibold text-gray-700">Alumnado</span>
                  <span className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
                    {alumnosConDevueltos.length} alumnos
                  </span>
                </div>
                <div className="divide-y divide-gray-50">
                  {alumnosConDevueltos.map((alumno) => {
                    const isSelected = alumno.key === selectedAlumnoDevueltoKey;
                    return (
                      <button
                        key={alumno.key}
                        onClick={() => selectAlumnoDevuelto(alumno.key)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${isSelected ? "bg-blue-50" : "hover:bg-gray-50"}`}
                      >
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isSelected ? "bg-blue-200 text-blue-800" : "bg-gray-200 text-gray-600"}`}>
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

            {/* Panel derecho — libros devueltos con edición */}
            <div className="md:col-span-3 flex flex-col gap-2">
              {!selectedAlumnoDevuelto ? (
                <div className="bg-white border border-gray-200 rounded-xl flex flex-col items-center justify-center py-16 text-gray-400">
                  <BookOpen size={36} className="mb-2 opacity-40" />
                  <p className="text-sm font-medium">Selecciona un alumno de la lista</p>
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 flex-shrink-0">
                      {initialsFromNombre(selectedAlumnoDevuelto.nombre)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{selectedAlumnoDevuelto.nombre}</p>
                      <p className="text-xs text-gray-500">{selectedUnidad === NO_ACTIVOS ? "No activo" : selectedUnidad}</p>
                    </div>
                  </div>

                  <div className="divide-y divide-gray-100">
                    {librosDevueltos.map((p) => {
                      const edit = editStates[p.id];
                      if (!edit) return null;
                      return (
                        <div key={p.id} className="px-4 py-3 space-y-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{p.libro?.titulo ?? "—"}</p>
                              {p.libro?.diversificacion && (
                                <span className="flex-shrink-0 text-[9px] font-semibold tracking-wide uppercase px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">DIV</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400">
                              {p.libro?.asignatura}
                              {p.num_ejemplar && <> · Ej. {p.num_ejemplar}</>}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex gap-1">
                              {(Object.keys(ESTADO_CONFIG) as EstadoDevolucion[]).map((e) => (
                                <button
                                  key={e}
                                  onClick={() => setEditStates((prev) => ({ ...prev, [p.id]: { ...prev[p.id], estado: e } }))}
                                  className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${
                                    edit.estado === e ? ESTADO_CONFIG[e].active : `border-gray-200 text-gray-500 bg-white ${ESTADO_CONFIG[e].hover}`
                                  }`}
                                >
                                  {ESTADO_CONFIG[e].label}
                                </button>
                              ))}
                            </div>
                            <div className="flex items-center gap-1.5 ml-auto">
                              <CalendarDays size={13} className="text-gray-400 flex-shrink-0" />
                              <input
                                type="date"
                                value={edit.fecha}
                                onChange={(e) => setEditStates((prev) => ({ ...prev, [p.id]: { ...prev[p.id], fecha: e.target.value } }))}
                                className="border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex justify-end">
                    <button
                      onClick={handleGuardarEdicion}
                      disabled={savingEdit}
                      className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                    >
                      <Check size={14} />
                      {savingEdit ? "Guardando..." : "Guardar cambios"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      )}

      {/* ── Vista: Por alumno ─────────────────────────────────────────────────── */}
      {showPanels && tipoDevolucion === "por_alumno" && (
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
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${isSelected ? "bg-blue-50" : "hover:bg-gray-50"}`}
                    >
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isSelected ? "bg-blue-200 text-blue-800" : "bg-gray-200 text-gray-600"}`}>
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
              <span className="text-sm font-medium text-gray-700">Indica el estado de los libros que se devuelvan o se hayan perdido y confirma</span>
            </div>
            {!selectedAlumno ? (
              <div className="bg-white border border-gray-200 rounded-xl flex flex-col items-center justify-center py-16 text-gray-400">
                <BookOpen size={36} className="mb-2 opacity-40" />
                <p className="text-sm font-medium">Selecciona un alumno de la lista</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
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
                      Todo reutilizable
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
                              className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${
                                estado === e ? ESTADO_CONFIG[e].active : `border-gray-200 text-gray-500 bg-white ${ESTADO_CONFIG[e].hover}`
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

                <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
                  <input
                    type="text"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Observaciones en caso de deterioros o extravíos (opcional) ..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Vista: Por asignatura ─────────────────────────────────────────────── */}
      {showPanels && tipoDevolucion === "por_asignatura" && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">

          {/* Panel izquierdo — libros del grupo */}
          <div className="md:col-span-2 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
              <span className="text-sm font-medium text-gray-700">Selecciona los libros a devolver</span>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="text-sm font-semibold text-gray-700">Libros del grupo</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={selectAllLibrosAsig}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                  >
                    Todos
                  </button>
                  <span className="text-gray-300">·</span>
                  <button
                    onClick={clearAllLibrosAsig}
                    className="text-xs text-gray-400 hover:text-gray-600 font-medium transition-colors"
                  >
                    Ninguno
                  </button>
                </div>
              </div>
              <div className="divide-y divide-gray-50">
                {librosDelGrupoAsig.map((libro) => {
                  const isChecked = selectedLibroIdsAsig.has(libro.libro_id);
                  return (
                    <button
                      key={libro.libro_id}
                      onClick={() => toggleLibroAsig(libro.libro_id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${isChecked ? "bg-blue-50" : "hover:bg-gray-50"}`}
                    >
                      <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-colors ${
                        isChecked ? "bg-blue-600 border-blue-600" : "border-gray-300 bg-white"
                      }`}>
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

          {/* Panel derecho — alumnos con libros seleccionados */}
          <div className="md:col-span-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
              <span className="text-sm font-medium text-gray-700">Indica el estado de la devolución por alumno</span>
            </div>
            {selectedLibroIdsAsig.size === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl flex flex-col items-center justify-center py-16 text-gray-400">
                <BookOpen size={36} className="mb-2 opacity-40" />
                <p className="text-sm font-medium">Selecciona al menos un libro</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                {/* Cabecera con botones globales */}
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
                      onClick={handleFinalizarAsig}
                      disabled={countAsigToReturn === 0 || saving}
                      className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors whitespace-nowrap"
                    >
                      <RotateCcw size={14} />
                      {saving ? "Guardando..." : `Finalizar devolución (${countAsigToReturn}/${alumnosConLibrosAsig.length})`}
                    </button>
                  </div>
                </div>

                {/* Lista de alumnos con estado */}
                <div className="divide-y divide-gray-100">
                  {alumnosConLibrosAsig.map((alumno) => {
                    const estado = alumnoEstadosAsig[alumno.key] ?? null;
                    return (
                      <div key={alumno.key} className="flex items-center gap-3 px-4 py-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${estado ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                          {initialsFromNombre(alumno.nombre)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{alumno.nombre}</p>
                          <p className="text-xs text-gray-400">{alumno.prestamos.length} libro{alumno.prestamos.length !== 1 ? "s" : ""}</p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          {(Object.keys(ESTADO_CONFIG) as EstadoDevolucion[]).map((e) => (
                            <button
                              key={e}
                              onClick={() => handleAlumnoEstadoAsig(alumno.key, e)}
                              className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${
                                estado === e ? ESTADO_CONFIG[e].active : `border-gray-200 text-gray-500 bg-white ${ESTADO_CONFIG[e].hover}`
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

                {/* Observaciones + botón final */}
                <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 space-y-3">
                  <input
                    type="text"
                    value={observacionesAsig}
                    onChange={(e) => setObservacionesAsig(e.target.value)}
                    placeholder="Observaciones en caso de deterioros o extravíos (opcional) ..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex justify-center">
                    <button
                      onClick={handleFinalizarAsig}
                      disabled={countAsigToReturn === 0 || saving}
                      className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors whitespace-nowrap"
                    >
                      <RotateCcw size={14} />
                      {saving ? "Guardando..." : `Finalizar devolución (${countAsigToReturn}/${alumnosConLibrosAsig.length})`}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

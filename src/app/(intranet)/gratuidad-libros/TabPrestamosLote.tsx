"use client";

import { useState, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  CheckCircle, AlertTriangle, X, Users, BookOpen, CalendarDays, ChevronDown, SquareCheck, Trash2, List,
} from "lucide-react";
import type { Alumno, LibroCatalogo, PrestamoLibro } from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nivelFromUnidad(unidad: string): string | null {
  if (unidad.startsWith("1º ESO")) return "1º ESO";
  if (unidad.startsWith("2º ESO")) return "2º ESO";
  if (unidad.startsWith("3º ESO")) return "3º ESO";
  if (unidad.startsWith("4º ESO")) return "4º ESO";
  if (unidad.startsWith("1º BACH")) return "1º Bach";
  if (unidad.startsWith("2º BACH")) return "2º Bach";
  if (/CFGB|FPBS/i.test(unidad)) return "FP Básica";
  return null;
}

function initials(alumno: Alumno): string {
  const p = alumno.primer_apellido?.[0] ?? "";
  const n = alumno.nombre?.[0] ?? "";
  return (p + n).toUpperCase() || alumno.alumno.slice(0, 2).toUpperCase();
}

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── Modal: alerta de stock ───────────────────────────────────────────────────

interface StockAlerta { titulo: string; disponibles: number; solicitados: number; }

function ModalStockAlert({ alertas, onCancel, onForce, saving }: {
  alertas: StockAlerta[];
  onCancel: () => void;
  onForce: () => void;
  saving: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="px-5 py-4 border-b flex items-center gap-3">
          <AlertTriangle size={20} className="text-amber-500 flex-shrink-0" />
          <h2 className="font-semibold text-gray-900">Stock insuficiente</h2>
        </div>
        <div className="px-5 py-4 space-y-2">
          <p className="text-sm text-gray-600 mb-3">Algunos libros no tienen suficientes ejemplares disponibles:</p>
          {alertas.map((a) => (
            <div key={a.titulo} className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm">
              <p className="font-medium text-gray-800 truncate">{a.titulo}</p>
              <p className="text-amber-700">{a.disponibles} disponibles · {a.solicitados} solicitados</p>
            </div>
          ))}
          <p className="text-xs text-gray-400 pt-1">Puedes continuar igualmente; los libros sin stock no se asignarán.</p>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t">
          <button onClick={onCancel} className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
            Revisar
          </button>
          <button onClick={onForce} disabled={saving} className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
            {saving ? "Guardando..." : "Entregar igualmente"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: confirmar anulación en lote (opción B) ────────────────────────────

function ModalAnularConfirm({ prestamos, libroTituloMap, deleting, onCancel, onConfirm }: {
  prestamos: PrestamoLibro[];
  libroTituloMap: Record<string, string>;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const porAlumno = prestamos.reduce<Record<string, PrestamoLibro[]>>((acc, p) => {
    const key = p.alumno_id ?? p.alumno_nombre;
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="px-5 py-4 border-b flex items-center gap-3">
          <Trash2 size={20} className="text-red-500 flex-shrink-0" />
          <h2 className="font-semibold text-gray-900">Anular entregas</h2>
        </div>
        <div className="px-5 py-4 space-y-2 max-h-72 overflow-y-auto">
          <p className="text-sm text-gray-600 mb-1">
            Se eliminarán <span className="font-semibold">{prestamos.length}</span> registro{prestamos.length !== 1 ? "s" : ""} de préstamo:
          </p>
          {Object.entries(porAlumno).map(([key, loans]) => (
            <div key={key} className="bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              <p className="text-sm font-medium text-gray-800 truncate">{loans[0].alumno_nombre}</p>
              {loans.map((l) => (
                <p key={l.id} className="text-xs text-red-700 mt-0.5 flex items-center gap-1">
                  <BookOpen size={10} className="flex-shrink-0" />
                  {libroTituloMap[l.libro_id] ?? l.libro?.titulo ?? l.libro_id}
                </p>
              ))}
            </div>
          ))}
        </div>
        <div className="flex gap-3 px-5 py-4 border-t">
          <button onClick={onCancel} className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={deleting} className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
            {deleting ? "Anulando..." : "Confirmar anulación"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Profesor { id: string; nombre: string; }

interface Props {
  alumnos: Alumno[];
  libros: LibroCatalogo[];
  prestamos: PrestamoLibro[];
  onPrestamosChange: React.Dispatch<React.SetStateAction<PrestamoLibro[]>>;
  cursoEscolar: string;
  myProfesorId: string | null;
  canManage: boolean;
  profesores: Profesor[];
  unidadesGratuidad: string[];
  completadosIniciales: string[];
  initialGrupo?: string;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function TabPrestamosLote({ alumnos, libros, prestamos, onPrestamosChange, cursoEscolar, myProfesorId, canManage, profesores, unidadesGratuidad, completadosIniciales, initialGrupo }: Props) {
  const supabase = createClient();

  // ── State ──────────────────────────────────────────────────────────────────
  const [selectedUnidad, setSelectedUnidad] = useState<string>(initialGrupo ?? "");
  const [selectedAlumnoIds, setSelectedAlumnoIds] = useState<Set<string>>(new Set());
  const [selectedLibroIds, setSelectedLibroIds] = useState<Set<string>>(new Set());
  const [fechaEntrega, setFechaEntrega] = useState<string>(todayString());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [stockAlertas, setStockAlertas] = useState<StockAlerta[]>([]);
  const [anularModalOpen, setAnularModalOpen] = useState(false);
  const [detalleAlumno, setDetalleAlumno] = useState<Alumno | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [overrideProfesorId, setOverrideProfesorId] = useState<string>(myProfesorId ?? "");
  const [localCompletados, setLocalCompletados] = useState<Set<string>>(new Set(completadosIniciales));
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const efectivoProfesorId = myProfesorId ?? (overrideProfesorId || null);

  // ── Derived ────────────────────────────────────────────────────────────────

  const unidades = useMemo(() => {
    const gratuidadSet = new Set(unidadesGratuidad);
    return [...new Set(alumnos.map((a) => a.unidad))]
      .filter((u) => gratuidadSet.has(u))
      .sort();
  }, [alumnos, unidadesGratuidad]);

  const nivel = selectedUnidad ? nivelFromUnidad(selectedUnidad) : null;

  const alumnosDelGrupo = useMemo(
    () => alumnos.filter((a) => a.unidad === selectedUnidad),
    [alumnos, selectedUnidad]
  );

  const loteLibros = useMemo(
    () => (nivel ? libros.filter((l) => l.nivel === nivel && l.activo) : []),
    [libros, nivel]
  );

  const loanCountsPerLibro = useMemo(() =>
    prestamos.reduce<Record<string, number>>((acc, p) => {
      acc[p.libro_id] = (acc[p.libro_id] ?? 0) + 1;
      return acc;
    }, {}),
    [prestamos]);

  const disponibles = useCallback(
    (libroId: string) => {
      const libro = libros.find((l) => l.id === libroId);
      return Math.max(0, (libro?.stock_total ?? 0) - (loanCountsPerLibro[libroId] ?? 0));
    },
    [libros, loanCountsPerLibro]
  );

  const alumnoLibrosMap = useMemo(() => {
    const loteIds = new Set(loteLibros.map((l) => l.id));
    const map: Record<string, Set<string>> = {};
    for (const p of prestamos) {
      if (p.alumno_id && loteIds.has(p.libro_id)) {
        if (!map[p.alumno_id]) map[p.alumno_id] = new Set();
        map[p.alumno_id].add(p.libro_id);
      }
    }
    return map;
  }, [prestamos, loteLibros]);

  const totalConLoteCompleto = useMemo(() => {
    if (loteLibros.length === 0) return 0;
    return alumnosDelGrupo.filter(
      (a) => (alumnoLibrosMap[a.id]?.size ?? 0) >= loteLibros.length || localCompletados.has(a.id)
    ).length;
  }, [alumnosDelGrupo, alumnoLibrosMap, loteLibros, localCompletados]);

  const newRecordsCount = useMemo(() => {
    let count = 0;
    for (const alumnoId of selectedAlumnoIds) {
      const existing = alumnoLibrosMap[alumnoId] ?? new Set();
      for (const libroId of selectedLibroIds) {
        if (!existing.has(libroId)) count++;
      }
    }
    return count;
  }, [selectedAlumnoIds, selectedLibroIds, alumnoLibrosMap]);

  const libroTituloMap = useMemo(() =>
    Object.fromEntries(loteLibros.map((l) => [l.id, l.titulo])),
    [loteLibros]);

  // Alumnos con algún préstamo del lote pero sin lote completo y sin marca manual
  const alumnosPendientesDeCompletar = useMemo(() =>
    alumnosDelGrupo.filter((a) => {
      const count = alumnoLibrosMap[a.id]?.size ?? 0;
      return count > 0 && count < loteLibros.length && !localCompletados.has(a.id);
    }),
  [alumnosDelGrupo, alumnoLibrosMap, loteLibros, localCompletados]);

  // Opción B: préstamos del lote que serían anulados para los alumnos seleccionados
  const prestamosToAnular = useMemo(() => {
    const loteIds = new Set(loteLibros.map((l) => l.id));
    return prestamos.filter(
      (p) => p.alumno_id && selectedAlumnoIds.has(p.alumno_id) && loteIds.has(p.libro_id)
    );
  }, [prestamos, selectedAlumnoIds, loteLibros]);

  // Opción C: préstamos del lote del alumno en detalle
  const librosDelDetalle = useMemo(() => {
    if (!detalleAlumno) return [];
    const loteIds = new Set(loteLibros.map((l) => l.id));
    return prestamos.filter(
      (p) => p.alumno_id === detalleAlumno.id && loteIds.has(p.libro_id)
    );
  }, [detalleAlumno, prestamos, loteLibros]);

  // ── Actions ────────────────────────────────────────────────────────────────

  function handleUnidadChange(unidad: string) {
    setSelectedUnidad(unidad);
    setSelectedAlumnoIds(new Set());
    setSelectedLibroIds(new Set());
    setSuccessMsg(null);
    setDetalleAlumno(null);
  }

  function handleSelectAllLibros() {
    if (selectedLibroIds.size === loteLibros.length) {
      setSelectedLibroIds(new Set());
    } else {
      setSelectedLibroIds(new Set(loteLibros.map((l) => l.id)));
    }
  }

  function toggleAlumno(id: string) {
    setSelectedAlumnoIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleLibro(id: string) {
    setSelectedLibroIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSelectAll() {
    if (selectedAlumnoIds.size === alumnosDelGrupo.length) {
      setSelectedAlumnoIds(new Set());
    } else {
      setSelectedAlumnoIds(new Set(alumnosDelGrupo.map((a) => a.id)));
    }
  }

  async function doEntregar(libroIdsToUse: Set<string>) {
    if (!efectivoProfesorId) {
      setErrorMsg("Selecciona el profesor que registra la entrega antes de continuar.");
      return;
    }
    setSaving(true);
    setErrorMsg(null);

    const inserts: Record<string, unknown>[] = [];
    for (const alumnoId of selectedAlumnoIds) {
      const alumno = alumnos.find((a) => a.id === alumnoId)!;
      const existing = alumnoLibrosMap[alumnoId] ?? new Set();
      for (const libroId of libroIdsToUse) {
        if (!existing.has(libroId)) {
          inserts.push({
            libro_id: libroId,
            alumno_id: alumnoId,
            alumno_nombre: alumno.alumno,
            alumno_grupo: alumno.unidad,
            curso_escolar: cursoEscolar,
            fecha_prestamo: fechaEntrega,
            entregado_por: efectivoProfesorId,
          });
        }
      }
    }

    if (inserts.length === 0) {
      setStockAlertas([]);
      setSaving(false);
      setSuccessMsg("Todos los alumnos seleccionados ya tienen estos libros.");
      return;
    }

    const { data, error } = await supabase
      .from("prestamos_libros")
      .insert(inserts)
      .select("id, libro_id, alumno_id, alumno_nombre, alumno_grupo, num_ejemplar, fecha_prestamo, entregado_por, devuelto_por, curso_escolar, fecha_devolucion, estado_devolucion, observaciones, created_at, libro:libros_catalogo(titulo, asignatura, nivel)");

    setSaving(false);
    setStockAlertas([]);

    if (error || !data) {
      setErrorMsg(`Error al guardar: ${error?.message ?? "respuesta inesperada del servidor"}`);
      return;
    }

    const newPrestamos: PrestamoLibro[] = data.map((p) => ({
      ...p,
      libro: (p.libro as unknown as { titulo: string; asignatura: string; nivel: string }[] | null)?.[0] ?? undefined,
    }));
    onPrestamosChange((prev) => [...prev, ...newPrestamos]);
    setSelectedAlumnoIds(new Set());
    setSuccessMsg(`${inserts.length} préstamo${inserts.length !== 1 ? "s" : ""} registrado${inserts.length !== 1 ? "s" : ""} correctamente.`);
  }

  // Opción B: anular en lote
  async function handleAnularLote() {
    if (prestamosToAnular.length === 0) return;
    setDeleting(true);
    const ids = prestamosToAnular.map((p) => p.id);
    const { error } = await supabase.from("prestamos_libros").delete().in("id", ids);
    setDeleting(false);
    if (error) { setErrorMsg(`Error al anular: ${error.message}`); return; }
    onPrestamosChange((prev) => prev.filter((p) => !ids.includes(p.id)));
    setSelectedAlumnoIds(new Set());
    setAnularModalOpen(false);
    setSuccessMsg(`${ids.length} préstamo${ids.length !== 1 ? "s" : ""} anulado${ids.length !== 1 ? "s" : ""}.`);
  }

  // Opción C: eliminar préstamo individual
  async function handleEliminarPrestamo(prestamoId: string) {
    const { error } = await supabase.from("prestamos_libros").delete().eq("id", prestamoId);
    if (error) { setErrorMsg(`Error al eliminar: ${error.message}`); return; }
    onPrestamosChange((prev) => prev.filter((p) => p.id !== prestamoId));
  }

  async function handleMarcarTodosCompletos() {
    if (!efectivoProfesorId) {
      setErrorMsg("Selecciona el profesor que registra la entrega antes de continuar.");
      return;
    }
    if (alumnosPendientesDeCompletar.length === 0) return;
    setMarkingAll(true);
    const inserts = alumnosPendientesDeCompletar.map((a) => ({
      alumno_id: a.id,
      curso_escolar: cursoEscolar,
      marcado_por: efectivoProfesorId,
    }));
    const { error } = await supabase.from("gratuidad_lote_completado").insert(inserts);
    setMarkingAll(false);
    if (error) { setErrorMsg(`Error al marcar: ${error.message}`); return; }
    setLocalCompletados((prev) => new Set([...prev, ...alumnosPendientesDeCompletar.map((a) => a.id)]));
  }

  async function handleMarcarCompleto(alumnoId: string) {
    if (!efectivoProfesorId) {
      setErrorMsg("Selecciona el profesor que registra la entrega antes de continuar.");
      return;
    }
    setMarkingId(alumnoId);
    const { error } = await supabase
      .from("gratuidad_lote_completado")
      .insert({ alumno_id: alumnoId, curso_escolar: cursoEscolar, marcado_por: efectivoProfesorId });
    setMarkingId(null);
    if (error) { setErrorMsg(`Error al marcar: ${error.message}`); return; }
    setLocalCompletados((prev) => new Set([...prev, alumnoId]));
  }

  async function handleDesmarcarCompleto(alumnoId: string) {
    setMarkingId(alumnoId);
    const { error } = await supabase
      .from("gratuidad_lote_completado")
      .delete()
      .eq("alumno_id", alumnoId)
      .eq("curso_escolar", cursoEscolar);
    setMarkingId(null);
    if (error) { setErrorMsg(`Error al desmarcar: ${error.message}`); return; }
    setLocalCompletados((prev) => { const next = new Set(prev); next.delete(alumnoId); return next; });
  }

  function handleEntregar() {
    if (selectedAlumnoIds.size === 0 || selectedLibroIds.size === 0) return;
    if (!efectivoProfesorId) {
      setErrorMsg("Selecciona el profesor que registra la entrega antes de continuar.");
      return;
    }
    const alertas: StockAlerta[] = [];
    for (const libroId of selectedLibroIds) {
      const disp = disponibles(libroId);
      if (disp < selectedAlumnoIds.size) {
        const libro = libros.find((l) => l.id === libroId)!;
        alertas.push({ titulo: libro.titulo, disponibles: disp, solicitados: selectedAlumnoIds.size });
      }
    }
    if (alertas.length > 0) { setStockAlertas(alertas); return; }
    doEntregar(selectedLibroIds);
  }

  function handleForceEntregar() {
    const safeLibros = new Set([...selectedLibroIds].filter((id) => disponibles(id) > 0));
    doEntregar(safeLibros);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const ningunaUnidad = !selectedUnidad;
  const sinLote = selectedUnidad && !nivel;
  const sinLibrosEnLote = nivel && loteLibros.length === 0;

  return (
    <div className="space-y-5">

      {/* Selector de profesor */}
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
              {profesores.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Barra de grupo + acciones */}
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

        {selectedUnidad && (
          <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium px-2.5 py-1.5 rounded-full">
            <Users size={12} />
            {alumnosDelGrupo.length} alumnos/as
          </span>
        )}

        {selectedUnidad && loteLibros.length > 0 && (
          <div className="flex items-center gap-1.5 ml-auto">
            <CalendarDays size={14} className="text-gray-400 flex-shrink-0" />
            <input
              type="date"
              value={fechaEntrega}
              onChange={(e) => setFechaEntrega(e.target.value)}
              className="border border-gray-300 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {selectedUnidad && loteLibros.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={handleSelectAll}
              className="border border-gray-300 text-gray-700 text-sm font-medium px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              {selectedAlumnoIds.size === alumnosDelGrupo.length ? "Deseleccionar todo" : "Seleccionar todo"}
            </button>
            {/* Opción B: anular entregas en lote */}
            {prestamosToAnular.length > 0 && (
              <button
                onClick={() => setAnularModalOpen(true)}
                className="flex items-center gap-2 border border-red-300 text-red-600 hover:bg-red-50 text-sm font-medium px-3 py-2.5 rounded-lg transition-colors whitespace-nowrap"
              >
                <Trash2 size={15} />
                Anular ({prestamosToAnular.length})
              </button>
            )}
            <button
              onClick={handleEntregar}
              disabled={selectedAlumnoIds.size === 0 || selectedLibroIds.size === 0 || saving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors whitespace-nowrap"
            >
              <CheckCircle size={15} />
              Entregar lote ({newRecordsCount})
            </button>
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

      {/* Estados vacíos */}
      {ningunaUnidad && (
        <div className="text-center py-16 text-gray-400">
          <Users size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">Selecciona un grupo para comenzar</p>
          <p className="text-sm mt-1">Elige un grupo en el selector de arriba</p>
        </div>
      )}
      {sinLote && (
        <div className="text-center py-12 text-gray-400">
          <BookOpen size={36} className="mx-auto mb-2 opacity-40" />
          <p className="font-medium">No hay lote definido para este grupo</p>
          <p className="text-sm mt-1">Añade libros al catálogo con el nivel correspondiente</p>
        </div>
      )}
      {sinLibrosEnLote && (
        <div className="text-center py-12 text-gray-400">
          <BookOpen size={36} className="mx-auto mb-2 opacity-40" />
          <p className="font-medium">No hay libros activos para el nivel {nivel}</p>
          <p className="text-sm mt-1">Revisa el catálogo e introdúce los libros del curso</p>
        </div>
      )}

      {/* Vista dividida: lote + alumnos */}
      {selectedUnidad && loteLibros.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">

          {/* Panel izquierdo — lote */}
          <div className="md:col-span-2 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
              <span className="text-sm font-medium text-gray-700">Selecciona los libros que vas a entregar</span>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="text-sm font-semibold text-gray-700">Lote del curso · {nivel}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSelectAllLibros}
                    className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded-md transition-colors"
                  >
                    {selectedLibroIds.size === loteLibros.length ? "Desmarcar todos" : "Marcar todos"}
                  </button>
                  <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 border border-green-200 text-xs font-medium px-2 py-1 rounded-full">
                    <BookOpen size={11} />
                    {loteLibros.length} libros
                  </span>
                </div>
              </div>
              <div className="divide-y divide-gray-50">
                {loteLibros.map((libro) => {
                  const disp = disponibles(libro.id);
                  const sinStock = disp === 0;
                  const isSelected = selectedLibroIds.has(libro.id);
                  return (
                    <label
                      key={libro.id}
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors select-none ${sinStock ? "opacity-60" : ""} ${isSelected && !sinStock ? "bg-blue-50" : "hover:bg-gray-50"}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleLibro(libro.id)}
                        disabled={sinStock}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{libro.titulo}</p>
                        {libro.editorial && <p className="text-xs text-gray-400">{libro.editorial}</p>}
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <span className={`text-sm font-semibold tabular-nums ${sinStock ? "text-red-500" : "text-gray-700"}`}>
                          {disp}/{libro.stock_total}
                        </span>
                        {sinStock && <p className="text-xs text-red-400 mt-0.5">Sin stock</p>}
                      </div>
                    </label>
                  );
                })}
              </div>
              <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
                <p className="text-xs text-gray-400">
                  <AlertTriangle size={11} className="inline mr-1 text-amber-400" />
                  Disponibles / Total. Los libros sin stock no se asignarán.
                </p>
              </div>
            </div>
          </div>

          {/* Panel derecho — alumnos */}
          <div className="md:col-span-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
              <span className="text-sm font-medium text-gray-700">Selecciona los alumnos que recibirán lo seleccionado en el paso 1</span>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="text-sm font-semibold text-gray-700">Alumnado del grupo</span>
                <div className="flex items-center gap-2">
                  {alumnosPendientesDeCompletar.length > 0 && (
                    <button
                      onClick={handleMarcarTodosCompletos}
                      disabled={markingAll}
                      className="inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800 hover:bg-teal-50 border border-teal-200 px-2 py-1 rounded-md transition-colors disabled:opacity-40"
                    >
                      {markingAll
                        ? <span className="w-3 h-3 border border-teal-400 border-t-transparent rounded-full animate-spin" />
                        : <SquareCheck size={11} />
                      }
                      Completar todos ({alumnosPendientesDeCompletar.length})
                    </button>
                  )}
                  <span className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
                    {totalConLoteCompleto}/{alumnosDelGrupo.length} entregados
                  </span>
                </div>
              </div>
              <div className="divide-y divide-gray-50">
                {alumnosDelGrupo.map((alumno) => {
                  const librosAlumno = alumnoLibrosMap[alumno.id] ?? new Set();
                  const countLibros = librosAlumno.size;
                  const totalLote = loteLibros.length;
                  const completoPorLibros = countLibros >= totalLote;
                  const completoManual = localCompletados.has(alumno.id);
                  const isSelected = selectedAlumnoIds.has(alumno.id);
                  const isMarking = markingId === alumno.id;

                  return (
                    <div
                      key={alumno.id}
                      className={`flex items-center gap-3 px-4 py-3 transition-colors ${isSelected ? "bg-blue-50" : "hover:bg-gray-50"}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleAlumno(alumno.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0 cursor-pointer"
                      />
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                        {initials(alumno)}
                      </div>
                      <span className="text-sm text-gray-800 flex-1 min-w-0 truncate">{alumno.alumno}</span>

                      {/* Estado + botón detalle (opción C) */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {completoPorLibros ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">
                            <CheckCircle size={11} />
                            Entregado
                          </span>
                        ) : completoManual ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">
                            <SquareCheck size={11} />
                            Completado · {countLibros}/{totalLote}
                            <button
                              onClick={() => handleDesmarcarCompleto(alumno.id)}
                              disabled={isMarking}
                              title="Desmarcar"
                              className="ml-0.5 text-green-400 hover:text-green-700 disabled:opacity-40"
                            >
                              <X size={10} />
                            </button>
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${countLibros > 0 ? "text-amber-700 bg-amber-100" : "text-gray-400"}`}>
                              {countLibros}/{totalLote}
                            </span>
                            {countLibros > 0 && (
                              <button
                                onClick={() => handleMarcarCompleto(alumno.id)}
                                disabled={isMarking}
                                title="Marcar como lote completo"
                                className="inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800 hover:bg-teal-50 border border-teal-200 px-1.5 py-1 rounded-md transition-colors disabled:opacity-40"
                              >
                                {isMarking
                                  ? <span className="w-3 h-3 border border-teal-400 border-t-transparent rounded-full animate-spin" />
                                  : <SquareCheck size={11} />
                                }
                                Completar
                              </button>
                            )}
                          </div>
                        )}

                        {/* Opción C: ver/eliminar libros individuales */}
                        {countLibros > 0 && (
                          <button
                            onClick={() => setDetalleAlumno(alumno)}
                            title="Ver libros asignados"
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <List size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Modal: alerta de stock */}
      {stockAlertas.length > 0 && (
        <ModalStockAlert
          alertas={stockAlertas}
          onCancel={() => setStockAlertas([])}
          onForce={handleForceEntregar}
          saving={saving}
        />
      )}

      {/* Modal: confirmar anulación en lote (opción B) */}
      {anularModalOpen && (
        <ModalAnularConfirm
          prestamos={prestamosToAnular}
          libroTituloMap={libroTituloMap}
          deleting={deleting}
          onCancel={() => setAnularModalOpen(false)}
          onConfirm={handleAnularLote}
        />
      )}

      {/* Modal: detalle de libros por alumno (opción C) */}
      {detalleAlumno && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 flex-shrink-0">
                  {initials(detalleAlumno)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm truncate max-w-[180px]">{detalleAlumno.alumno}</p>
                  <p className="text-xs text-gray-500">Libros asignados del lote</p>
                </div>
              </div>
              <button onClick={() => setDetalleAlumno(null)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={18} />
              </button>
            </div>

            <div className="divide-y divide-gray-100">
              {librosDelDetalle.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10">Sin libros asignados del lote</p>
              ) : librosDelDetalle.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{libroTituloMap[p.libro_id] ?? p.libro?.titulo ?? "—"}</p>
                    <p className="text-xs text-gray-400">{p.libro?.asignatura ?? ""}</p>
                  </div>
                  <button
                    onClick={() => handleEliminarPrestamo(p.id)}
                    title="Eliminar préstamo"
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div className="px-4 py-3 border-t bg-gray-50">
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <AlertTriangle size={10} className="text-amber-400 flex-shrink-0" />
                Elimina registros de entrega erróneos, no devoluciones.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

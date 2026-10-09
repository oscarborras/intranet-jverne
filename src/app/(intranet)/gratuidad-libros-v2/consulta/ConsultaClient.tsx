"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BookOpen, Camera, History, Loader2, Search, Tags, User, Settings2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ilikePatterns } from "@/lib/text";
import { Modal } from "@/components/gratuidad-v2/Modal";
import { ConservacionText, DiversificacionBadge, OptativoBadge, SituacionBadge } from "@/components/gratuidad-v2/Badges";
import { ScannerInput } from "@/components/gratuidad-v2/ScannerInput";
import { CameraScanner } from "@/components/gratuidad-v2/CameraScanner";
import { useBarcodeScanner, useScanDebounce } from "@/components/gratuidad-v2/useBarcodeScanner";
import { playFeedback } from "@/components/gratuidad-v2/scanFeedback";
import {
  ETIQUETAS_CONSERVACION, ETIQUETAS_SITUACION, MENSAJES_ERROR_V2,
  type CambiarSituacionResult, type ConservacionV2, type EstadoIncidenciaV2, type ResultadoPrestamoV2,
  type SituacionV2, type TipoIncidenciaV2, type TipoMovimientoV2,
} from "@/lib/types/gratuidadV2";

interface Props {
  canManage: boolean;
  inicial: { codigo: string; alumno: string };
}

interface Ficha {
  id: string;
  codigo: string;
  situacion: SituacionV2;
  conservacion: ConservacionV2;
  fecha_alta: string;
  observaciones: string | null;
  titulo: { titulo: string; asignatura: string | null; isbn: string | null; editorial: string | null; diversificacion: boolean } | null;
  alumno: { id: string; alumno: string; unidad: string } | null;
}

interface Movimiento {
  id: number;
  tipo: TipoMovimientoV2;
  created_at: string;
  detalle: Record<string, string | number | boolean | null>;
  alumno: { alumno: string; unidad: string } | null;
  profesor: { profesor: string } | null;
}

interface IncidenciaResumen {
  codigo: string;
  tipo: TipoIncidenciaV2;
  estado: EstadoIncidenciaV2;
  alumno_nombre: string | null;
  created_at: string;
}

interface AlumnoBusqueda {
  id: string;
  alumno: string;
  unidad: string;
  nie: string | null;
}

interface PrestamoAlumno {
  id: string;
  curso_escolar: string;
  fecha_entrega: string;
  fecha_devolucion: string | null;
  resultado: ResultadoPrestamoV2 | null;
  conservacion_entrega: ConservacionV2;
  conservacion_devolucion: ConservacionV2 | null;
  ejemplar: { codigo: string; titulo_id: string; titulo: { titulo: string; diversificacion: boolean } | null } | null;
}

const MOVIMIENTO_LABEL: Record<TipoMovimientoV2, string> = {
  alta: "Alta en el inventario",
  entrega: "Entregado",
  devolucion: "Devuelto",
  anulacion: "Anulado",
  perdido: "Marcado como perdido",
  baja: "Dado de baja",
  recuperado: "Recuperado",
  cambio_conservacion: "Cambio de estado",
  renovacion: "Préstamo renovado",
};

const MOVIMIENTO_COLOR: Record<TipoMovimientoV2, string> = {
  alta: "bg-gray-400",
  entrega: "bg-blue-500",
  devolucion: "bg-emerald-500",
  anulacion: "bg-gray-400",
  perdido: "bg-red-500",
  baja: "bg-gray-500",
  recuperado: "bg-emerald-500",
  cambio_conservacion: "bg-amber-500",
  renovacion: "bg-blue-500",
};

const RESULTADO_LABEL: Record<ResultadoPrestamoV2, string> = {
  devuelto: "Devuelto",
  perdido: "Perdido",
  anulado: "Anulado",
  renovado: "Renovado para el curso siguiente",
};

function fechaHora(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "2-digit", year: "numeric" });
}

function detalleMovimiento(m: Movimiento): string {
  const d = m.detalle;
  const cons = (v: unknown) => (typeof v === "string" && v in ETIQUETAS_CONSERVACION ? ETIQUETAS_CONSERVACION[v as ConservacionV2] : "");
  if (m.tipo === "cambio_conservacion") return `${cons(d.anterior)} → ${cons(d.nueva)}${d.motivo ? ` · ${d.motivo}` : ""}`;
  if (m.tipo === "devolucion") return `Estado: ${cons(d.conservacion)}`;
  if (m.tipo === "anulacion") return d.deshace === "devolucion" ? "Devolución deshecha" : "Entrega deshecha";
  if (m.tipo === "renovacion") return `Del curso ${d.curso_anterior} al ${d.curso_escolar}`;
  if (m.tipo === "entrega" && d.curso_escolar) return `Curso ${d.curso_escolar}${d.forzado ? " · título repetido confirmado" : ""}`;
  if ((m.tipo === "perdido" || m.tipo === "baja" || m.tipo === "recuperado") && d.motivo) return String(d.motivo);
  return "";
}

type Modo = "ejemplar" | "alumno";

export function ConsultaClient({ canManage, inicial }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [modo, setModo] = useState<Modo>(inicial.alumno ? "alumno" : "ejemplar");
  const [camara, setCamara] = useState(false);

  // Copy
  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [incidencias, setIncidencias] = useState<IncidenciaResumen[]>([]);
  const [cargando, setCargando] = useState(false);
  const [noEncontrado, setNoEncontrado] = useState<string | null>(null);

  // Student
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState<AlumnoBusqueda[]>([]);
  const [alumno, setAlumno] = useState<AlumnoBusqueda | null>(null);
  const [prestamosAlumno, setPrestamosAlumno] = useState<PrestamoAlumno[]>([]);
  /** Titles marked optional in the lot of the student's current group */
  const [optativosAlumno, setOptativosAlumno] = useState<Set<string>>(new Set());

  // Manager actions
  const [editando, setEditando] = useState(false);
  const [editSituacion, setEditSituacion] = useState<SituacionV2 | "">("");
  const [editConservacion, setEditConservacion] = useState<ConservacionV2>("bueno");
  const [editMotivo, setEditMotivo] = useState("");
  const [editIncidencia, setEditIncidencia] = useState(true);
  const [editGuardando, setEditGuardando] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const actualizarUrl = useCallback((params: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, []);

  // ── Copy lookup ─────────────────────────────────────────────────────────────

  const cargarFicha = useCallback(async (codigo: string) => {
    setModo("ejemplar");
    setCargando(true);
    setNoEncontrado(null);
    const { data } = await supabase
      .from("gplv2_ejemplares")
      .select("id, codigo, situacion, conservacion, fecha_alta, observaciones, titulo:gplv2_titulos(titulo, asignatura, isbn, editorial, diversificacion), alumno:alumnos(id, alumno, unidad)")
      .eq("codigo", codigo)
      .maybeSingle();
    if (!data) {
      setFicha(null);
      setMovimientos([]);
      setIncidencias([]);
      setNoEncontrado(codigo);
      setCargando(false);
      playFeedback("error");
      return;
    }
    const f = data as unknown as Ficha;
    const [{ data: movs }, { data: incs }] = await Promise.all([
      supabase
        .from("gplv2_movimientos")
        .select("id, tipo, created_at, detalle, alumno:alumnos(alumno, unidad), profesor:profesores(profesor)")
        .eq("ejemplar_id", f.id)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("gplv2_incidencias")
        .select("codigo, tipo, estado, alumno_nombre, created_at")
        .eq("ejemplar_id", f.id)
        .order("created_at", { ascending: false }),
    ]);
    setFicha(f);
    setMovimientos((movs ?? []) as unknown as Movimiento[]);
    setIncidencias((incs ?? []) as IncidenciaResumen[]);
    setCargando(false);
    playFeedback("ok");
    actualizarUrl({ codigo: f.codigo });
  }, [supabase, actualizarUrl]);

  const aceptar = useScanDebounce(1000);
  const handleScan = useCallback((codigo: string) => {
    if (aceptar(codigo)) cargarFicha(codigo);
  }, [aceptar, cargarFicha]);
  useBarcodeScanner(handleScan, !editando);

  // ── Student lookup ──────────────────────────────────────────────────────────

  const cargarAlumno = useCallback(async (a: AlumnoBusqueda) => {
    setModo("alumno");
    setAlumno(a);
    setResultados([]);
    setBusqueda("");
    setCargando(true);
    const [{ data }, { data: optativos }] = await Promise.all([
      supabase
        .from("gplv2_prestamos")
        .select("id, curso_escolar, fecha_entrega, fecha_devolucion, resultado, conservacion_entrega, conservacion_devolucion, ejemplar:gplv2_ejemplares(codigo, titulo_id, titulo:gplv2_titulos(titulo, diversificacion))")
        .eq("alumno_id", a.id)
        .order("fecha_entrega", { ascending: false }),
      a.unidad
        ? supabase.from("gplv2_titulo_cursos").select("titulo_id").eq("curso", a.unidad).eq("optativo", true)
        : Promise.resolve({ data: [] as { titulo_id: string }[] }),
    ]);
    setPrestamosAlumno((data ?? []) as unknown as PrestamoAlumno[]);
    setOptativosAlumno(new Set((optativos ?? []).map((o: { titulo_id: string }) => o.titulo_id)));
    setCargando(false);
    actualizarUrl({ alumno: a.id });
  }, [supabase, actualizarUrl]);

  // Every word in name, group or NIE (case and accents ignored).
  // A newer keystroke aborts the pending request so a slow answer cannot overwrite it.
  useEffect(() => {
    const patrones = ilikePatterns(busqueda);
    if (busqueda.trim().length < 3 || patrones.length === 0) { setResultados([]); return; }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      let consulta = supabase.from("alumnos").select("id, alumno, unidad, nie");
      for (const p of patrones) consulta = consulta.ilike("search_text", p);
      const { data } = await consulta.order("alumno").limit(20).abortSignal(ctrl.signal);
      if (!ctrl.signal.aborted) setResultados((data ?? []) as AlumnoBusqueda[]);
    }, 300);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [busqueda, supabase]);

  // Initial load from the URL (links from Ejemplares, or reload)
  const initDone = useRef(false);
  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;
    if (inicial.codigo) cargarFicha(inicial.codigo.toUpperCase());
    else if (inicial.alumno) {
      supabase.from("alumnos").select("id, alumno, unidad, nie").eq("id", inicial.alumno).maybeSingle()
        .then(({ data }) => { if (data) cargarAlumno(data as AlumnoBusqueda); });
    }
  }, [inicial, cargarFicha, cargarAlumno, supabase]);

  // ── Manager: change situation / condition ───────────────────────────────────

  function abrirEdicion() {
    if (!ficha) return;
    setEditSituacion("");
    setEditConservacion(ficha.conservacion);
    setEditMotivo("");
    setEditIncidencia(true);
    setEditError(null);
    setEditando(true);
  }

  async function guardarEdicion() {
    if (!ficha) return;
    setEditGuardando(true);
    setEditError(null);
    const { data, error } = await supabase.rpc("gplv2_cambiar_situacion", {
      p_codigo: ficha.codigo,
      p_situacion: editSituacion || null,
      p_conservacion: editConservacion !== ficha.conservacion ? editConservacion : null,
      p_motivo: editMotivo.trim() || null,
      p_crear_incidencia: editSituacion === "perdido" && editIncidencia,
    });
    setEditGuardando(false);
    const res = data as CambiarSituacionResult | null;
    if (error || !res) { setEditError(error?.message ?? "Error al guardar"); return; }
    if (!res.ok) { setEditError(MENSAJES_ERROR_V2[res.error]); return; }
    setEditando(false);
    cargarFicha(ficha.codigo);
  }

  // Situations a manager can move the copy to from its current one
  const situacionesPosibles: SituacionV2[] = ficha
    ? ficha.situacion === "prestado" ? ["perdido"]
      : ficha.situacion === "en_centro" ? ["perdido", "baja"]
        : ["en_centro"]
    : [];

  // ── Render ──────────────────────────────────────────────────────────────────

  const actuales = prestamosAlumno.filter((p) => !p.fecha_devolucion);
  const historial = prestamosAlumno.filter((p) => p.fecha_devolucion && p.resultado !== "anulado");

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-3">
        <div className="grid grid-cols-2 gap-1 p-1 bg-gray-100 rounded-lg sm:w-80" role="tablist">
          <button role="tab" aria-selected={modo === "ejemplar"} onClick={() => setModo("ejemplar")}
            className={cn("flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium", modo === "ejemplar" ? "bg-white shadow text-gray-900" : "text-gray-500")}>
            <BookOpen size={15} /> Libro
          </button>
          <button role="tab" aria-selected={modo === "alumno"} onClick={() => setModo("alumno")}
            className={cn("flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium", modo === "alumno" ? "bg-white shadow text-gray-900" : "text-gray-500")}>
            <User size={15} /> Alumno
          </button>
        </div>

        {modo === "ejemplar" ? (
          <>
            <div className="flex gap-2">
              <div className="flex-1"><ScannerInput onScan={handleScan} disabled={editando} placeholder="Escanea o escribe el código del libro" /></div>
              <button
                onClick={() => setCamara((c) => !c)}
                aria-pressed={camara}
                aria-label={camara ? "Cerrar cámara" : "Escanear con la cámara"}
                className={cn("w-14 flex items-center justify-center rounded-xl border-2", camara ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-300 text-gray-600")}
              >
                <Camera size={22} />
              </button>
            </div>
            {camara && <CameraScanner onScan={handleScan} onClose={() => setCamara(false)} />}
          </>
        ) : (
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Nombre o NIE del alumno (mínimo 3 letras)"
              aria-label="Buscar alumno"
              className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {resultados.length > 0 && (
              <ul className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                {resultados.map((a) => (
                  <li key={a.id}>
                    <button onClick={() => cargarAlumno(a)} className="w-full text-left px-3 py-3 hover:bg-blue-50 text-sm">
                      {a.alumno} <span className="text-gray-400">· {a.unidad || "sin grupo"}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {cargando && <div className="flex justify-center py-10 text-gray-400"><Loader2 className="animate-spin" /></div>}

      {/* ── Copy card ── */}
      {!cargando && modo === "ejemplar" && noEncontrado && (
        <p className="text-center py-10 text-red-600 font-medium">No existe ningún libro con el código <span className="font-mono">{noEncontrado}</span>.</p>
      )}
      {!cargando && modo === "ejemplar" && ficha && (
        <div className="grid lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] gap-4 items-start">
          <section aria-label="Ficha del libro" className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <p className="font-mono text-2xl font-bold text-gray-900">{ficha.codigo}</p>
              <SituacionBadge situacion={ficha.situacion} />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{ficha.titulo?.titulo}</p>
              {ficha.titulo?.diversificacion && <DiversificacionBadge className="mt-1" />}
              <p className="text-sm text-gray-500">
                {[ficha.titulo?.asignatura, ficha.titulo?.editorial, ficha.titulo?.isbn && `ISBN ${ficha.titulo.isbn}`].filter(Boolean).join(" · ")}
              </p>
            </div>
            <dl className="text-sm grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
              <dt className="text-gray-500">Estado</dt><dd><ConservacionText conservacion={ficha.conservacion} /></dd>
              <dt className="text-gray-500">Alta</dt><dd className="text-gray-800">{fecha(ficha.fecha_alta)}</dd>
              {ficha.alumno && (
                <>
                  <dt className="text-gray-500">Lo tiene</dt>
                  <dd>
                    <button onClick={() => ficha.alumno && cargarAlumno({ ...ficha.alumno, nie: null })} className="text-blue-700 hover:underline text-left font-medium">
                      {ficha.alumno.alumno}
                    </button>
                    <span className="text-gray-500"> · {ficha.alumno.unidad}</span>
                  </dd>
                </>
              )}
              {ficha.observaciones && (<><dt className="text-gray-500">Notas</dt><dd className="text-gray-800">{ficha.observaciones}</dd></>)}
            </dl>
            {incidencias.length > 0 && (
              <div className="border-t pt-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Incidencias</p>
                <ul className="text-sm space-y-1">
                  {incidencias.map((i) => (
                    <li key={i.codigo} className="flex justify-between gap-2">
                      <span><span className="font-mono">{i.codigo}</span> · {i.tipo === "perdida" ? "Pérdida" : i.tipo === "deterioro" ? "Deterioro" : "Otro"}</span>
                      <span className="text-gray-500">{i.estado.replace("_", " ")}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {canManage && (
              <div className="flex flex-wrap gap-2 border-t pt-3">
                <button onClick={abrirEdicion} className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50">
                  <Settings2 size={15} /> Cambiar estado
                </button>
                <Link href={`/gratuidad-libros-v2/etiquetas?codigos=${encodeURIComponent(ficha.codigo)}`} className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50">
                  <Tags size={15} /> Reimprimir etiqueta
                </Link>
              </div>
            )}
          </section>

          <section aria-label="Historial del libro" className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <h2 className="flex items-center gap-2 px-4 py-3 border-b bg-gray-50 text-sm font-semibold text-gray-700"><History size={16} /> Historial</h2>
            <ol className="px-4 py-3 space-y-3">
              {movimientos.map((m) => {
                const det = detalleMovimiento(m);
                return (
                  <li key={m.id} className="flex gap-3">
                    <span className={cn("mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0", MOVIMIENTO_COLOR[m.tipo])} aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">{MOVIMIENTO_LABEL[m.tipo]}</span>
                        {m.alumno && <> · {m.alumno.alumno} <span className="text-gray-400">({m.alumno.unidad})</span></>}
                      </p>
                      <p className="text-xs text-gray-500">
                        {fechaHora(m.created_at)}{m.profesor && ` · ${m.profesor.profesor}`}{det && ` · ${det}`}
                      </p>
                    </div>
                  </li>
                );
              })}
              {movimientos.length === 0 && <li className="text-sm text-gray-400">Sin movimientos.</li>}
            </ol>
          </section>
        </div>
      )}

      {/* ── Student card ── */}
      {!cargando && modo === "alumno" && alumno && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h2 className="font-bold text-gray-900 text-lg">{alumno.alumno}</h2>
            <p className="text-sm text-gray-500">{alumno.unidad || "Sin grupo"}{alumno.nie && ` · NIE ${alumno.nie}`}</p>
          </div>

          <section className="bg-white border border-gray-200 rounded-xl overflow-hidden" aria-label="Libros que tiene ahora">
            <h3 className="px-4 py-3 border-b bg-gray-50 text-sm font-semibold text-gray-700">Tiene ahora ({actuales.length})</h3>
            <ul className="divide-y divide-gray-100">
              {actuales.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-900">
                      {p.ejemplar?.titulo?.titulo}
                      {p.ejemplar?.titulo?.diversificacion && <DiversificacionBadge className="ml-1.5 align-middle" />}
                      {p.ejemplar && !p.ejemplar.titulo?.diversificacion && optativosAlumno.has(p.ejemplar.titulo_id) && <OptativoBadge className="ml-1.5 align-middle" />}
                    </p>
                    <p className="text-xs text-gray-500">Entregado el {fecha(p.fecha_entrega)} · curso {p.curso_escolar} · {ETIQUETAS_CONSERVACION[p.conservacion_entrega]}</p>
                  </div>
                  {p.ejemplar && (
                    <button onClick={() => cargarFicha(p.ejemplar!.codigo)} className="font-mono text-sm text-blue-700 hover:underline">{p.ejemplar.codigo}</button>
                  )}
                </li>
              ))}
              {actuales.length === 0 && <li className="px-4 py-4 text-sm text-gray-400">No tiene libros prestados.</li>}
            </ul>
          </section>

          {historial.length > 0 && (
            <section className="bg-white border border-gray-200 rounded-xl overflow-hidden" aria-label="Historial de préstamos">
              <h3 className="px-4 py-3 border-b bg-gray-50 text-sm font-semibold text-gray-700">Historial ({historial.length})</h3>
              <ul className="divide-y divide-gray-100">
                {historial.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-800">
                        {p.ejemplar?.titulo?.titulo}
                        {p.ejemplar?.titulo?.diversificacion && <DiversificacionBadge className="ml-1.5 align-middle" />}
                      {p.ejemplar && !p.ejemplar.titulo?.diversificacion && optativosAlumno.has(p.ejemplar.titulo_id) && <OptativoBadge className="ml-1.5 align-middle" />}
                      </p>
                      <p className="text-xs text-gray-500">
                        {p.curso_escolar} · {fecha(p.fecha_entrega)} → {p.fecha_devolucion && fecha(p.fecha_devolucion)}
                        {p.resultado && ` · ${RESULTADO_LABEL[p.resultado]}`}
                        {p.conservacion_devolucion && ` (${ETIQUETAS_CONSERVACION[p.conservacion_devolucion]})`}
                      </p>
                    </div>
                    {p.ejemplar && (
                      <button onClick={() => cargarFicha(p.ejemplar!.codigo)} className="font-mono text-xs text-blue-700 hover:underline">{p.ejemplar.codigo}</button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {!cargando && !ficha && !noEncontrado && modo === "ejemplar" && (
        <p className="text-center py-12 text-gray-400 text-sm">Escanea cualquier libro para ver dónde está y todo su historial.</p>
      )}

      {editando && ficha && (
        <Modal
          titulo={`Cambiar estado · ${ficha.codigo}`}
          onClose={() => setEditando(false)}
          footer={
            <>
              <button onClick={() => setEditando(false)} className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button onClick={guardarEdicion} disabled={editGuardando} className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">
                {editGuardando && <Loader2 size={15} className="animate-spin" />} Guardar
              </button>
            </>
          }
        >
          <div className="space-y-4 text-sm">
            <label className="block">
              <span className="block font-medium text-gray-700 mb-1">Situación</span>
              <select value={editSituacion} onChange={(e) => setEditSituacion(e.target.value as SituacionV2 | "")} className={inputCls}>
                <option value="">Sin cambios ({ETIQUETAS_SITUACION[ficha.situacion]})</option>
                {situacionesPosibles.map((s) => (
                  <option key={s} value={s}>{s === "en_centro" ? "Recuperar (vuelve al centro)" : ETIQUETAS_SITUACION[s]}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block font-medium text-gray-700 mb-1">Estado de conservación</span>
              <select value={editConservacion} onChange={(e) => setEditConservacion(e.target.value as ConservacionV2)} className={inputCls}>
                {(Object.keys(ETIQUETAS_CONSERVACION) as ConservacionV2[]).map((c) => <option key={c} value={c}>{ETIQUETAS_CONSERVACION[c]}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="block font-medium text-gray-700 mb-1">Motivo (opcional)</span>
              <input value={editMotivo} onChange={(e) => setEditMotivo(e.target.value)} className={inputCls} />
            </label>
            {editSituacion === "perdido" && ficha.situacion === "prestado" && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={editIncidencia} onChange={(e) => setEditIncidencia(e.target.checked)} className="w-4 h-4 rounded" />
                Crear incidencia de pérdida para {ficha.alumno?.alumno}
              </label>
            )}
            {ficha.situacion === "prestado" && (
              <p className="text-xs text-gray-500">Para registrar que lo ha devuelto, usa la sección Devolución.</p>
            )}
            {editError && <p className="text-red-600">{editError}</p>}
          </div>
        </Modal>
      )}
    </div>
  );
}

const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";

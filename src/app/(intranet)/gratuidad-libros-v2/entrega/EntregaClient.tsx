"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Camera, CheckCircle2, ChevronRight, Circle, FileText, Loader2, Search, Undo2, Users, AlertTriangle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { todayMadrid } from "@/lib/dates";
import { Modal } from "@/components/gratuidad-v2/Modal";
import { ScannerInput, type ScannerInputHandle } from "@/components/gratuidad-v2/ScannerInput";
import { CameraScanner } from "@/components/gratuidad-v2/CameraScanner";
import { useBarcodeScanner, useScanDebounce } from "@/components/gratuidad-v2/useBarcodeScanner";
import { playFeedback, type TipoFeedback } from "@/components/gratuidad-v2/scanFeedback";
import { FeedbackBanner, type Feedback } from "@/components/gratuidad-v2/FeedbackBanner";
import { buildJustificanteEntregaHtml, imprimirHtml } from "@/lib/gratuidadV2/documentos";
import {
  MENSAJES_ERROR_V2,
  type AnularEntregaResult, type AvisoEntregaV2, type ConservacionV2, type EntregarResult,
} from "@/lib/types/gratuidadV2";

export interface TituloLote {
  id: string;
  titulo: string;
  asignatura: string | null;
}

interface AlumnoGrupo {
  id: string;
  alumno: string;
  unidad: string;
  nie: string | null;
}

interface PrestamoActivo {
  id: string;
  alumno_id: string;
  fecha_entrega: string;
  conservacion_entrega: ConservacionV2;
  ejemplar: { codigo: string; titulo_id: string; titulo: { titulo: string } | null } | null;
}

interface EntregaSesion {
  prestamoId: string;
  alumnoId: string;
  alumnoNombre: string;
  codigo: string;
  titulo: string;
}


interface Props {
  grupos: string[];
  lotePorGrupo: Record<string, TituloLote[]>;
  cursoEscolar: string;
  profesorNombre: string;
  inicial: { grupo: string; alumno: string };
}

const AVISOS: Record<AvisoEntregaV2, string> = {
  fuera_de_lote: "Este libro no está en el lote de su curso",
  conservacion_deteriorado: "El ejemplar está marcado como deteriorado",
};

const PRESTAMO_SELECT =
  "id, alumno_id, fecha_entrega, conservacion_entrega, ejemplar:gplv2_ejemplares(codigo, titulo_id, titulo:gplv2_titulos(titulo))";

function esCodigo(s: string): boolean {
  return /\d/.test(s) && !/\s/.test(s);
}

function fechaHoy(): string {
  const [y, m, d] = todayMadrid().split("-");
  return `${d}/${m}/${y}`;
}

export function EntregaClient({ grupos, lotePorGrupo, cursoEscolar, profesorNombre, inicial }: Props) {
  const supabase = useMemo(() => createClient(), []);

  const [grupo, setGrupo] = useState("");
  const [alumnos, setAlumnos] = useState<AlumnoGrupo[]>([]);
  const [prestamos, setPrestamos] = useState<Record<string, PrestamoActivo[]>>({});
  const [cargandoGrupo, setCargandoGrupo] = useState(false);
  const [alumnoId, setAlumnoId] = useState<string | null>(null);

  const [busqueda, setBusqueda] = useState("");
  const [resultadosGlobales, setResultadosGlobales] = useState<AlumnoGrupo[]>([]);

  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [confirmRepetido, setConfirmRepetido] = useState<{ codigo: string; titulo: string } | null>(null);
  const [sesion, setSesion] = useState<EntregaSesion[]>([]);
  const [camara, setCamara] = useState(false);
  const [procesando, setProcesando] = useState(false);

  const scannerRef = useRef<ScannerInputHandle>(null);
  const alumnoActual = alumnos.find((a) => a.id === alumnoId) ?? null;
  // Queued scans read the latest values through refs
  const alumnoRef = useRef<AlumnoGrupo | null>(null);
  useEffect(() => { alumnoRef.current = alumnoActual; }, [alumnoActual]);
  const prestamosRef = useRef(prestamos);
  useEffect(() => { prestamosRef.current = prestamos; }, [prestamos]);

  // ── Data loading ────────────────────────────────────────────────────────────

  const cargarGrupo = useCallback(async (g: string, seleccionar?: string) => {
    setGrupo(g);
    setAlumnoId(null);
    setAlumnos([]);
    setPrestamos({});
    if (!g) return;
    setCargandoGrupo(true);
    const { data: al } = await supabase
      .from("alumnos")
      .select("id, alumno, unidad, nie")
      .eq("unidad", g)
      .is("estado_matricula", null)
      .order("alumno");
    const lista = (al ?? []) as AlumnoGrupo[];
    const ids = lista.map((a) => a.id);
    const map: Record<string, PrestamoActivo[]> = {};
    if (ids.length > 0) {
      const { data: pr } = await supabase.from("gplv2_prestamos").select(PRESTAMO_SELECT).is("fecha_devolucion", null).in("alumno_id", ids);
      for (const p of (pr ?? []) as unknown as PrestamoActivo[]) (map[p.alumno_id] ??= []).push(p);
    }
    setAlumnos(lista);
    setPrestamos(map);
    setCargandoGrupo(false);
    if (seleccionar && lista.some((a) => a.id === seleccionar)) setAlumnoId(seleccionar);
  }, [supabase]);

  const initDone = useRef(false);
  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;
    if (inicial.grupo) cargarGrupo(inicial.grupo, inicial.alumno || undefined);
  }, [inicial, cargarGrupo]);

  // Keep ?grupo=&alumno= in the URL (reload-safe) without a server round trip
  useEffect(() => {
    const params = new URLSearchParams();
    if (grupo) params.set("grupo", grupo);
    if (alumnoId) params.set("alumno", alumnoId);
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [grupo, alumnoId]);

  // Search across the whole school when no group is chosen
  useEffect(() => {
    const q = busqueda.trim();
    if (grupo || q.length < 3 || esCodigo(q)) { setResultadosGlobales([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("alumnos")
        .select("id, alumno, unidad, nie")
        .is("estado_matricula", null)
        .neq("unidad", "")
        .or(`alumno.ilike.%${q.replace(/[,()]/g, " ")}%,nie.ilike.%${q.replace(/[,()]/g, " ")}%`)
        .order("alumno")
        .limit(20);
      setResultadosGlobales((data ?? []) as AlumnoGrupo[]);
    }, 300);
    return () => clearTimeout(t);
  }, [busqueda, grupo, supabase]);

  // ── Derived data ────────────────────────────────────────────────────────────

  const progreso = useCallback((a: AlumnoGrupo) => {
    const lote = lotePorGrupo[a.unidad] ?? [];
    const tiene = new Set((prestamos[a.id] ?? []).map((p) => p.ejemplar?.titulo_id));
    const entregados = lote.filter((t) => tiene.has(t.id)).length;
    return { entregados, total: lote.length, completo: lote.length > 0 && entregados === lote.length };
  }, [lotePorGrupo, prestamos]);

  const alumnosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q || esCodigo(q)) return alumnos;
    return alumnos.filter((a) => a.alumno.toLowerCase().includes(q) || (a.nie ?? "").toLowerCase().includes(q));
  }, [alumnos, busqueda]);

  const completos = useMemo(() => alumnos.filter((a) => progreso(a).completo).length, [alumnos, progreso]);

  // ── Scan handling ───────────────────────────────────────────────────────────

  const mostrar = useCallback((tipo: TipoFeedback, titulo: string, detalle?: string) => {
    playFeedback(tipo);
    setFeedback({ tipo, titulo, detalle, key: Date.now() });
  }, []);

  const entregar = useCallback(async (codigo: string, forzar: boolean) => {
    const alumno = alumnoRef.current;
    if (!alumno) {
      mostrar("error", "Elige primero un alumno", `Código leído: ${codigo}`);
      return;
    }
    setProcesando(true);
    const { data, error } = await supabase.rpc("gplv2_entregar", { p_codigo: codigo, p_alumno_id: alumno.id, p_forzar: forzar });
    setProcesando(false);
    const res = data as EntregarResult | null;

    if (error || !res) {
      mostrar("error", "Error de conexión", error?.message ?? "Vuelve a escanear el libro");
      return;
    }
    if (!res.ok) {
      if (res.error === "titulo_repetido") {
        mostrar("aviso", "Ya tiene este título", res.titulo);
        setConfirmRepetido({ codigo, titulo: res.titulo ?? "" });
      } else if (res.error === "prestado") {
        mostrar("error", "Libro ya prestado", `${res.titulo ?? codigo} → ${res.alumno_actual ?? "otro alumno"}`);
      } else {
        mostrar("error", MENSAJES_ERROR_V2[res.error], res.titulo ?? codigo);
      }
      return;
    }

    const nuevo: PrestamoActivo = {
      id: res.prestamo_id,
      alumno_id: alumno.id,
      fecha_entrega: new Date().toISOString(),
      conservacion_entrega: res.ejemplar.conservacion,
      ejemplar: { codigo: res.ejemplar.codigo, titulo_id: res.ejemplar.titulo_id, titulo: { titulo: res.ejemplar.titulo } },
    };
    setPrestamos((prev) => ({ ...prev, [alumno.id]: [...(prev[alumno.id] ?? []), nuevo] }));
    setSesion((prev) => [
      { prestamoId: res.prestamo_id, alumnoId: alumno.id, alumnoNombre: alumno.alumno, codigo: res.ejemplar.codigo, titulo: res.ejemplar.titulo },
      ...prev,
    ].slice(0, 20));

    // Lot complete after this delivery?
    const lote = lotePorGrupo[alumno.unidad] ?? [];
    const tiene = new Set([...(prestamosRef.current[alumno.id] ?? []).map((p) => p.ejemplar?.titulo_id), res.ejemplar.titulo_id]);
    const completo = lote.length > 0 && lote.every((t) => tiene.has(t.id));

    if (res.avisos.length > 0) {
      mostrar("aviso", `Entregado: ${res.ejemplar.titulo}`, res.avisos.map((a) => AVISOS[a]).join(" · "));
    } else {
      mostrar("ok", `Entregado: ${res.ejemplar.titulo}`, completo ? "¡Lote completo!" : res.ejemplar.codigo);
    }
  }, [supabase, mostrar, lotePorGrupo]);

  // Scans are processed one after another, in the order they arrive
  const colaRef = useRef<Promise<void>>(Promise.resolve());
  const aceptar = useScanDebounce();
  const handleScan = useCallback((codigo: string) => {
    if (!aceptar(codigo)) return;
    colaRef.current = colaRef.current.then(() => entregar(codigo, false));
  }, [aceptar, entregar]);

  useBarcodeScanner(handleScan, !confirmRepetido);

  async function confirmarRepetido() {
    if (!confirmRepetido) return;
    const { codigo } = confirmRepetido;
    setConfirmRepetido(null);
    await entregar(codigo, true);
    scannerRef.current?.focus();
  }

  async function deshacer(s: EntregaSesion) {
    const { data, error } = await supabase.rpc("gplv2_anular_entrega", { p_prestamo_id: s.prestamoId });
    const res = data as AnularEntregaResult | null;
    if (error || !res || !res.ok) {
      mostrar("error", "No se pudo deshacer", res && !res.ok ? MENSAJES_ERROR_V2[res.error] : error?.message);
      return;
    }
    setPrestamos((prev) => ({ ...prev, [s.alumnoId]: (prev[s.alumnoId] ?? []).filter((p) => p.id !== s.prestamoId) }));
    setSesion((prev) => prev.filter((x) => x.prestamoId !== s.prestamoId));
    mostrar("aviso", "Entrega deshecha", `${s.titulo} vuelve al centro`);
  }

  // ── Navigation between students ─────────────────────────────────────────────

  function seleccionar(id: string | null) {
    setAlumnoId(id);
    setFeedback(null);
    setBusqueda("");
  }

  function siguienteAlumno() {
    if (alumnos.length === 0) return;
    const idx = alumnos.findIndex((a) => a.id === alumnoId);
    // Next student without a complete lot, wrapping around; otherwise simply the next one
    for (let i = 1; i <= alumnos.length; i++) {
      const a = alumnos[(idx + i) % alumnos.length];
      if (!progreso(a).completo) { seleccionar(a.id); return; }
    }
    seleccionar(alumnos[(idx + 1) % alumnos.length].id);
  }

  async function elegirGlobal(a: AlumnoGrupo) {
    setBusqueda("");
    setResultadosGlobales([]);
    await cargarGrupo(a.unidad, a.id);
  }

  function onBusquedaKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // A scanner read that landed in the search box is a book, not a name
    if (e.key === "Enter" && esCodigo(busqueda.trim())) {
      e.preventDefault();
      const codigo = busqueda.trim().toUpperCase();
      setBusqueda("");
      handleScan(codigo);
    }
  }

  function imprimirJustificante() {
    if (!alumnoActual) return;
    const libros = (prestamos[alumnoActual.id] ?? [])
      .filter((p) => p.ejemplar)
      .map((p) => ({ codigo: p.ejemplar!.codigo, titulo: p.ejemplar!.titulo?.titulo ?? "", conservacion: p.conservacion_entrega }))
      .sort((a, b) => a.titulo.localeCompare(b.titulo, "es"));
    if (libros.length === 0) { mostrar("aviso", "El alumno no tiene libros entregados"); return; }
    imprimirHtml(buildJustificanteEntregaHtml({
      alumno: alumnoActual.alumno, grupo: alumnoActual.unidad, cursoEscolar, fecha: fechaHoy(), profesor: profesorNombre, libros,
    }));
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const loteActual = alumnoActual ? lotePorGrupo[alumnoActual.unidad] ?? [] : [];
  const prestamosActual = alumnoActual ? prestamos[alumnoActual.id] ?? [] : [];
  const porTitulo = new Map<string, PrestamoActivo[]>();
  for (const p of prestamosActual) if (p.ejemplar) porTitulo.set(p.ejemplar.titulo_id, [...(porTitulo.get(p.ejemplar.titulo_id) ?? []), p]);
  const idsLote = new Set(loteActual.map((t) => t.id));
  const fueraDeLote = prestamosActual.filter((p) => p.ejemplar && !idsLote.has(p.ejemplar.titulo_id));
  const progActual = alumnoActual ? progreso(alumnoActual) : null;

  return (
    <div className="space-y-4">
      {/* Group + search */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 grid sm:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] gap-2">
        <select
          value={grupo}
          onChange={(e) => cargarGrupo(e.target.value)}
          aria-label="Grupo"
          className="border border-gray-300 rounded-lg px-3 py-3 text-base bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Elige un grupo…</option>
          {grupos.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={onBusquedaKeyDown}
            placeholder={grupo ? "Filtrar alumnos del grupo…" : "O busca un alumno en todo el centro (nombre o NIE)"}
            aria-label="Buscar alumno"
            className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {resultadosGlobales.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
              {resultadosGlobales.map((a) => (
                <li key={a.id}>
                  <button onClick={() => elegirGlobal(a)} className="w-full text-left px-3 py-3 hover:bg-blue-50 text-sm">
                    {a.alumno} <span className="text-gray-400">· {a.unidad}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {!grupo ? (
        <div className="text-center py-16 text-gray-400">
          <Users size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">Elige un grupo o busca un alumno para empezar</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] gap-4 items-start">
          {/* Students list (hidden on mobile while a student is open) */}
          <section aria-label="Alumnos del grupo" className={cn("bg-white border border-gray-200 rounded-xl overflow-hidden", alumnoActual && "hidden lg:block")}>
            <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">{grupo}</span>
              <span className="text-xs text-gray-500">{completos}/{alumnos.length} completos</span>
            </div>
            {(lotePorGrupo[grupo] ?? []).length === 0 && !cargandoGrupo && (
              <p className="px-4 py-3 text-sm text-amber-700 bg-amber-50 border-b border-amber-100">
                Este grupo no tiene lote asignado. Asígnalo en Títulos.
              </p>
            )}
            {cargandoGrupo ? (
              <div className="py-10 flex justify-center text-gray-400"><Loader2 className="animate-spin" /></div>
            ) : (
              <ul className="divide-y divide-gray-100 max-h-[65vh] overflow-y-auto">
                {alumnosFiltrados.map((a) => {
                  const p = progreso(a);
                  return (
                    <li key={a.id}>
                      <button
                        onClick={() => seleccionar(a.id)}
                        aria-current={a.id === alumnoId ? "true" : undefined}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-blue-50 transition-colors",
                          a.id === alumnoId && "bg-blue-50 border-l-4 border-blue-600 pl-3",
                        )}
                      >
                        {p.completo
                          ? <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" aria-label="Lote completo" />
                          : <Circle size={18} className="text-gray-300 flex-shrink-0" aria-hidden="true" />}
                        <span className="flex-1 min-w-0 text-sm text-gray-900 truncate">{a.alumno}</span>
                        <span className={cn("text-xs font-semibold tabular-nums", p.completo ? "text-emerald-700" : p.entregados > 0 ? "text-blue-700" : "text-gray-400")}>
                          {p.entregados}/{p.total}
                        </span>
                      </button>
                    </li>
                  );
                })}
                {alumnosFiltrados.length === 0 && <li className="px-4 py-6 text-sm text-gray-400 text-center">Sin alumnos</li>}
              </ul>
            )}
          </section>

          {/* Student panel */}
          {alumnoActual ? (
            <section aria-label={`Entrega a ${alumnoActual.alumno}`} className="space-y-3">
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <button onClick={() => seleccionar(null)} aria-label="Volver a la lista" className="lg:hidden p-2 -m-2 text-gray-500"><ArrowLeft size={20} /></button>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-bold text-gray-900 text-lg leading-tight">{alumnoActual.alumno}</h2>
                    <p className="text-sm text-gray-500">{alumnoActual.unidad}{alumnoActual.nie && ` · NIE ${alumnoActual.nie}`}</p>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-2xl font-bold tabular-nums", progActual?.completo ? "text-emerald-600" : "text-gray-900")}>
                      {progActual?.entregados}/{progActual?.total}
                    </p>
                    <p className="text-xs text-gray-400">libros del lote</p>
                  </div>
                </div>
                {progActual && progActual.total > 0 && (
                  <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden" role="progressbar" aria-valuenow={progActual.entregados} aria-valuemin={0} aria-valuemax={progActual.total} aria-label="Progreso del lote">
                    <div className={cn("h-full transition-all", progActual.completo ? "bg-emerald-500" : "bg-blue-500")} style={{ width: `${(progActual.entregados / progActual.total) * 100}%` }} />
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={imprimirJustificante} className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50">
                    <FileText size={16} /> Justificante
                  </button>
                  <button onClick={siguienteAlumno} className="ml-auto flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-800">
                    Siguiente alumno <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Scanner */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <ScannerInput ref={scannerRef} onScan={handleScan} onEmptyEnter={siguienteAlumno} disabled={!!confirmRepetido} />
                  </div>
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
                <FeedbackBanner feedback={feedback} procesando={procesando} />
                <p className="text-xs text-gray-400 hidden sm:block">Con el campo vacío, pulsa Enter para pasar al siguiente alumno.</p>
              </div>

              {/* Lot checklist */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <h3 className="px-4 py-3 border-b bg-gray-50 text-sm font-semibold text-gray-700">Lote de {alumnoActual.unidad}</h3>
                <ul className="divide-y divide-gray-100">
                  {loteActual.map((t) => {
                    const entregas = porTitulo.get(t.id) ?? [];
                    const ok = entregas.length > 0;
                    return (
                      <li key={t.id} className={cn("flex items-center gap-3 px-4 py-3", !ok && "bg-amber-50/40")}>
                        {ok ? <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0" /> : <Circle size={20} className="text-amber-400 flex-shrink-0" />}
                        <div className="min-w-0 flex-1">
                          <p className={cn("text-sm", ok ? "text-gray-500" : "text-gray-900 font-medium")}>{t.titulo}</p>
                          {t.asignatura && <p className="text-xs text-gray-400">{t.asignatura}</p>}
                        </div>
                        {ok && <span className="font-mono text-xs text-gray-500">{entregas.map((e) => e.ejemplar?.codigo).join(", ")}</span>}
                      </li>
                    );
                  })}
                  {loteActual.length === 0 && <li className="px-4 py-4 text-sm text-gray-400">Sin lote asignado para este curso.</li>}
                </ul>
                {fueraDeLote.length > 0 && (
                  <>
                    <h3 className="px-4 py-2 border-y bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fuera de lote</h3>
                    <ul className="divide-y divide-gray-100">
                      {fueraDeLote.map((p) => (
                        <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                          <AlertTriangle size={18} className="text-amber-500 flex-shrink-0" />
                          <span className="flex-1 text-sm text-gray-700">{p.ejemplar?.titulo?.titulo}</span>
                          <span className="font-mono text-xs text-gray-500">{p.ejemplar?.codigo}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>

              {/* This session: undo */}
              {sesion.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <h3 className="px-4 py-3 border-b bg-gray-50 text-sm font-semibold text-gray-700">Últimas entregas</h3>
                  <ul className="divide-y divide-gray-100">
                    {sesion.slice(0, 8).map((s) => (
                      <li key={s.prestamoId} className="flex items-center gap-3 px-4 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-gray-800 truncate">{s.titulo}</p>
                          <p className="text-xs text-gray-400 truncate"><span className="font-mono">{s.codigo}</span> · {s.alumnoNombre}</p>
                        </div>
                        <button onClick={() => deshacer(s)} className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 rounded-lg hover:bg-red-50 hover:text-red-700">
                          <Undo2 size={15} /> Deshacer
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          ) : (
            <div className="hidden lg:flex flex-col items-center justify-center text-center py-20 text-gray-400 bg-white border border-dashed border-gray-300 rounded-xl">
              <Users size={36} className="mb-2 opacity-40" />
              <p className="text-sm">Elige un alumno de la lista para empezar a escanear sus libros.</p>
            </div>
          )}
        </div>
      )}

      {confirmRepetido && (
        <Modal
          titulo="El alumno ya tiene este título"
          onClose={() => setConfirmRepetido(null)}
          footer={
            <>
              <button onClick={() => setConfirmRepetido(null)} className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">No entregar</button>
              <button onClick={confirmarRepetido} autoFocus className="px-4 py-2.5 text-sm font-medium bg-amber-600 hover:bg-amber-700 text-white rounded-lg">Entregar otro ejemplar</button>
            </>
          }
        >
          <p className="text-sm text-gray-700">
            <b>{alumnoActual?.alumno}</b> ya tiene un ejemplar de <b>{confirmRepetido.titulo}</b>.
            ¿Quieres entregarle también el ejemplar <span className="font-mono">{confirmRepetido.codigo}</span>?
          </p>
        </Modal>
      )}
    </div>
  );
}

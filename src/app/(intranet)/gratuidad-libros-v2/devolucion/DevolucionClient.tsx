"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Camera, CheckCircle2, FileText, Loader2, PackageOpen, Pencil, Undo2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { todayMadrid } from "@/lib/dates";
import { Modal } from "@/components/gratuidad-v2/Modal";
import { ConservacionText, DiversificacionBadge } from "@/components/gratuidad-v2/Badges";
import { ScannerInput } from "@/components/gratuidad-v2/ScannerInput";
import { CameraScanner } from "@/components/gratuidad-v2/CameraScanner";
import { useBarcodeScanner, useScanDebounce } from "@/components/gratuidad-v2/useBarcodeScanner";
import { playFeedback, type TipoFeedback } from "@/components/gratuidad-v2/scanFeedback";
import { FeedbackBanner, type Feedback } from "@/components/gratuidad-v2/FeedbackBanner";
import { buildAlbaranDevolucionHtml, imprimirHtml } from "@/lib/gratuidadV2/documentos";
import {
  ETIQUETAS_CONSERVACION, MENSAJES_ERROR_V2,
  type AnularDevolucionResult, type ConservacionV2, type CorregirDevolucionResult, type DevolverResult,
} from "@/lib/types/gratuidadV2";

interface Props {
  cursoEscolar: string;
  profesorNombre: string;
  /** Ids of Diversificación titles, to tag them */
  titulosDiversificacion: string[];
}

interface Devuelto {
  prestamoId: string;
  codigo: string;
  titulo: string;
  tituloId: string;
  conservacion: ConservacionV2;
  incidencia: string | null;
}

interface Pendiente {
  prestamoId: string;
  codigo: string;
  titulo: string;
  tituloId: string;
}

interface AlumnoDevolucion {
  /** null when the student record no longer exists */
  id: string | null;
  nombre: string;
  grupo: string;
  devueltos: Devuelto[];
  pendientes: Pendiente[];
}


/** Conditions offered when returning (a returned book is no longer "nuevo") */
const OPCIONES: { value: ConservacionV2; cls: string; activeCls: string }[] = [
  { value: "bueno", cls: "border-gray-300 text-gray-700", activeCls: "bg-emerald-600 border-emerald-600 text-white" },
  { value: "regular", cls: "border-gray-300 text-gray-700", activeCls: "bg-amber-500 border-amber-500 text-white" },
  { value: "deteriorado", cls: "border-gray-300 text-gray-700", activeCls: "bg-red-600 border-red-600 text-white" },
];

function claveAlumno(id: string | null, nombre: string): string {
  return id ?? `sin-id:${nombre}`;
}

function fechaHoy(): string {
  const [y, m, d] = todayMadrid().split("-");
  return `${d}/${m}/${y}`;
}

export function DevolucionClient({ cursoEscolar, profesorNombre, titulosDiversificacion }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const esDiversificacion = useMemo(() => new Set(titulosDiversificacion), [titulosDiversificacion]);

  const [conservacion, setConservacion] = useState<ConservacionV2>("bueno");
  const [incidenciaSiDeteriorado, setIncidenciaSiDeteriorado] = useState(true);
  const [alumnos, setAlumnos] = useState<AlumnoDevolucion[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [camara, setCamara] = useState(false);
  const [total, setTotal] = useState(0);

  // Correction modal
  const [corrigiendo, setCorrigiendo] = useState<{ alumnoKey: string; item: Devuelto } | null>(null);
  const [corrConservacion, setCorrConservacion] = useState<ConservacionV2>("bueno");
  const [corrObservaciones, setCorrObservaciones] = useState("");
  const [corrIncidencia, setCorrIncidencia] = useState(true);
  const [corrGuardando, setCorrGuardando] = useState(false);
  const [corrError, setCorrError] = useState<string | null>(null);

  const conservacionRef = useRef(conservacion);
  useEffect(() => { conservacionRef.current = conservacion; }, [conservacion]);
  const incidenciaRef = useRef(incidenciaSiDeteriorado);
  useEffect(() => { incidenciaRef.current = incidenciaSiDeteriorado; }, [incidenciaSiDeteriorado]);

  const mostrar = useCallback((tipo: TipoFeedback, titulo: string, detalle?: string) => {
    playFeedback(tipo);
    setFeedback({ tipo, titulo, detalle, key: Date.now() });
  }, []);

  const cargarPendientes = useCallback(async (alumnoId: string): Promise<Pendiente[]> => {
    const { data } = await supabase
      .from("gplv2_prestamos")
      .select("id, ejemplar:gplv2_ejemplares(codigo, titulo_id, titulo:gplv2_titulos(titulo))")
      .eq("alumno_id", alumnoId)
      .is("fecha_devolucion", null);
    type Row = { id: string; ejemplar: { codigo: string; titulo_id: string; titulo: { titulo: string } | null } | null };
    return ((data ?? []) as unknown as Row[])
      .map((r) => ({ prestamoId: r.id, codigo: r.ejemplar?.codigo ?? "", titulo: r.ejemplar?.titulo?.titulo ?? "", tituloId: r.ejemplar?.titulo_id ?? "" }))
      .sort((a, b) => a.titulo.localeCompare(b.titulo, "es"));
  }, [supabase]);

  const refrescarPendientes = useCallback(async (key: string, alumnoId: string | null) => {
    if (!alumnoId) return;
    const pendientes = await cargarPendientes(alumnoId);
    setAlumnos((prev) => prev.map((a) => (claveAlumno(a.id, a.nombre) === key ? { ...a, pendientes } : a)));
  }, [cargarPendientes]);

  // ── Scan ────────────────────────────────────────────────────────────────────

  const devolver = useCallback(async (codigo: string) => {
    const cons = conservacionRef.current;
    setProcesando(true);
    const { data, error } = await supabase.rpc("gplv2_devolver", {
      p_codigo: codigo,
      p_conservacion: cons,
      p_observaciones: null,
      p_crear_incidencia: cons === "deteriorado" && incidenciaRef.current,
    });
    setProcesando(false);
    const res = data as DevolverResult | null;

    if (error || !res) { mostrar("error", "Error de conexión", error?.message ?? "Vuelve a escanear el libro"); return; }
    if (!res.ok) {
      if (res.error === "en_centro") mostrar("aviso", "Este libro ya estaba en el centro", res.titulo ?? codigo);
      else mostrar("error", MENSAJES_ERROR_V2[res.error], res.titulo ?? codigo);
      return;
    }

    // The chosen condition applies to one book; back to "bueno" for the next
    setConservacion("bueno");
    setTotal((t) => t + 1);

    const item: Devuelto = {
      prestamoId: res.prestamo_id,
      codigo: res.ejemplar.codigo,
      titulo: res.ejemplar.titulo,
      tituloId: res.ejemplar.titulo_id,
      conservacion: res.ejemplar.conservacion,
      incidencia: res.incidencia,
    };
    const key = claveAlumno(res.alumno.id, res.alumno.nombre);
    setAlumnos((prev) => {
      const actual = prev.find((a) => claveAlumno(a.id, a.nombre) === key);
      const actualizado: AlumnoDevolucion = actual
        ? { ...actual, devueltos: [item, ...actual.devueltos], pendientes: actual.pendientes.filter((p) => p.prestamoId !== item.prestamoId) }
        : { id: res.alumno.id, nombre: res.alumno.nombre, grupo: res.alumno.grupo, devueltos: [item], pendientes: [] };
      // Most recent student first
      return [actualizado, ...prev.filter((a) => claveAlumno(a.id, a.nombre) !== key)];
    });
    refrescarPendientes(key, res.alumno.id);

    const quedan = res.pendientes === 0 ? "Lo ha devuelto todo" : `Le quedan ${res.pendientes}`;
    const detalle = `${res.alumno.nombre} (${res.alumno.grupo}) · ${quedan}`;
    if (item.conservacion === "deteriorado") {
      mostrar("aviso", `Devuelto deteriorado: ${item.titulo}`, `${detalle}${item.incidencia ? ` · Incidencia ${item.incidencia}` : ""}`);
    } else {
      mostrar("ok", `Devuelto: ${item.titulo}`, detalle);
    }
  }, [supabase, mostrar, refrescarPendientes]);

  const colaRef = useRef<Promise<void>>(Promise.resolve());
  const aceptar = useScanDebounce();
  const handleScan = useCallback((codigo: string) => {
    if (!aceptar(codigo)) return;
    colaRef.current = colaRef.current.then(() => devolver(codigo));
  }, [aceptar, devolver]);

  useBarcodeScanner(handleScan, !corrigiendo);

  // ── Fix / undo ──────────────────────────────────────────────────────────────

  function abrirCorreccion(alumnoKey: string, item: Devuelto) {
    setCorrigiendo({ alumnoKey, item });
    setCorrConservacion(item.conservacion);
    setCorrObservaciones("");
    setCorrIncidencia(!item.incidencia);
    setCorrError(null);
  }

  async function guardarCorreccion() {
    if (!corrigiendo) return;
    setCorrGuardando(true);
    setCorrError(null);
    const { data, error } = await supabase.rpc("gplv2_corregir_devolucion", {
      p_prestamo_id: corrigiendo.item.prestamoId,
      p_conservacion: corrConservacion,
      p_observaciones: corrObservaciones.trim() || null,
      p_crear_incidencia: corrConservacion === "deteriorado" && corrIncidencia,
    });
    setCorrGuardando(false);
    const res = data as CorregirDevolucionResult | null;
    if (error || !res) { setCorrError(error?.message ?? "Error al guardar"); return; }
    if (!res.ok) { setCorrError(MENSAJES_ERROR_V2[res.error]); return; }

    const { alumnoKey, item } = corrigiendo;
    setAlumnos((prev) => prev.map((a) => claveAlumno(a.id, a.nombre) !== alumnoKey ? a : {
      ...a,
      devueltos: a.devueltos.map((d) => d.prestamoId !== item.prestamoId ? d : {
        ...d, conservacion: res.conservacion, incidencia: res.incidencia ?? d.incidencia,
      }),
    }));
    setCorrigiendo(null);
    if (res.incidencia) mostrar("aviso", `Incidencia ${res.incidencia} creada`, item.titulo);
  }

  async function deshacer(alumno: AlumnoDevolucion, item: Devuelto) {
    const { data, error } = await supabase.rpc("gplv2_anular_devolucion", { p_prestamo_id: item.prestamoId });
    const res = data as AnularDevolucionResult | null;
    if (error || !res || !res.ok) {
      mostrar("error", "No se pudo deshacer", res && !res.ok ? MENSAJES_ERROR_V2[res.error] : error?.message);
      return;
    }
    const key = claveAlumno(alumno.id, alumno.nombre);
    setAlumnos((prev) => prev
      .map((a) => claveAlumno(a.id, a.nombre) !== key ? a : { ...a, devueltos: a.devueltos.filter((d) => d.prestamoId !== item.prestamoId) })
      .filter((a) => a.devueltos.length > 0));
    setTotal((t) => Math.max(0, t - 1));
    refrescarPendientes(key, alumno.id);
    mostrar("aviso", "Devolución deshecha", `${item.titulo} vuelve a estar prestado a ${alumno.nombre}`);
  }

  function imprimirAlbaran(a: AlumnoDevolucion) {
    imprimirHtml(buildAlbaranDevolucionHtml({
      alumno: a.nombre,
      grupo: a.grupo,
      cursoEscolar,
      fecha: fechaHoy(),
      profesor: profesorNombre,
      devueltos: [...a.devueltos].sort((x, y) => x.titulo.localeCompare(y.titulo, "es"))
        .map((d) => ({ codigo: d.codigo, titulo: d.titulo, conservacion: d.conservacion })),
      pendientes: a.pendientes.map((p) => ({ codigo: p.codigo, titulo: p.titulo })),
    }));
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="grid lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] gap-4 items-start">
      {/* Scanner column */}
      <section aria-label="Escanear devoluciones" className="bg-white border border-gray-200 rounded-xl p-4 space-y-4 lg:sticky lg:top-4">
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Estado del próximo libro</p>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Estado de conservación del próximo libro">
            {OPCIONES.map((o) => (
              <button
                key={o.value}
                role="radio"
                aria-checked={conservacion === o.value}
                onClick={() => setConservacion(o.value)}
                className={cn("py-3 rounded-xl border-2 text-sm font-semibold transition-colors", conservacion === o.value ? o.activeCls : o.cls)}
              >
                {ETIQUETAS_CONSERVACION[o.value]}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1.5">Tras cada lectura vuelve a «Bueno». También puedes corregirlo después.</p>
          <label className="flex items-center gap-2 text-sm text-gray-600 mt-2 cursor-pointer">
            <input type="checkbox" checked={incidenciaSiDeteriorado} onChange={(e) => setIncidenciaSiDeteriorado(e.target.checked)} className="w-4 h-4 rounded" />
            Crear incidencia al devolver un libro deteriorado
          </label>
        </div>

        <div className="flex gap-2">
          <div className="flex-1"><ScannerInput onScan={handleScan} disabled={!!corrigiendo} /></div>
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
        <p className="text-sm text-gray-500 text-center">{total} libros devueltos en esta sesión</p>
      </section>

      {/* Students column */}
      <section aria-label="Devoluciones por alumno" className="space-y-3">
        {alumnos.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-20 text-gray-400 bg-white border border-dashed border-gray-300 rounded-xl">
            <PackageOpen size={36} className="mb-2 opacity-40" />
            <p className="text-sm max-w-xs">Escanea los libros que se devuelven. No hace falta elegir alumno: se agrupan solos.</p>
          </div>
        ) : alumnos.map((a) => {
          const key = claveAlumno(a.id, a.nombre);
          const completo = a.pendientes.length === 0;
          return (
            <article key={key} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <header className="flex flex-wrap items-center gap-3 px-4 py-3 border-b bg-gray-50">
                {completo ? <CheckCircle2 size={20} className="text-emerald-600" /> : <AlertTriangle size={20} className="text-amber-500" />}
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-gray-900 truncate">{a.nombre}</h2>
                  <p className="text-xs text-gray-500">
                    {a.grupo} · {a.devueltos.length} devueltos · {completo ? <span className="text-emerald-700 font-medium">no le queda ninguno</span> : <span className="text-amber-700 font-medium">le quedan {a.pendientes.length}</span>}
                  </p>
                </div>
                <button onClick={() => imprimirAlbaran(a)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50">
                  <FileText size={15} /> Albarán
                </button>
              </header>
              <ul className="divide-y divide-gray-100">
                {a.devueltos.map((d) => (
                  <li key={d.prestamoId} className="flex items-center gap-3 px-4 py-2.5">
                    <CheckCircle2 size={17} className="text-emerald-500 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-800 truncate">
                        {d.titulo}
                        {esDiversificacion.has(d.tituloId) && <DiversificacionBadge className="ml-1.5 align-middle" />}
                      </p>
                      <p className="text-xs text-gray-400">
                        <span className="font-mono">{d.codigo}</span> · <ConservacionText conservacion={d.conservacion} />
                        {d.incidencia && <span className="text-red-600"> · Incidencia {d.incidencia}</span>}
                      </p>
                    </div>
                    <button onClick={() => abrirCorreccion(key, d)} title="Corregir estado" aria-label={`Corregir estado de ${d.codigo}`} className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Pencil size={16} /></button>
                    <button onClick={() => deshacer(a, d)} title="Deshacer devolución" aria-label={`Deshacer devolución de ${d.codigo}`} className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Undo2 size={16} /></button>
                  </li>
                ))}
              </ul>
              {a.pendientes.length > 0 && (
                <div className="border-t border-amber-100 bg-amber-50/50 px-4 py-2.5">
                  <p className="text-xs font-semibold text-amber-800 mb-1">Pendientes de devolver</p>
                  <ul className="text-sm text-gray-700 space-y-0.5">
                    {a.pendientes.map((p) => (
                      <li key={p.prestamoId} className="flex justify-between gap-3">
                        <span className="truncate">
                          {p.titulo}
                          {esDiversificacion.has(p.tituloId) && <DiversificacionBadge className="ml-1.5 align-middle" />}
                        </span>
                        <span className="font-mono text-xs text-gray-500">{p.codigo}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          );
        })}
      </section>

      {corrigiendo && (
        <Modal
          titulo="Corregir devolución"
          onClose={() => setCorrigiendo(null)}
          footer={
            <>
              <button onClick={() => setCorrigiendo(null)} className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button onClick={guardarCorreccion} disabled={corrGuardando} className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">
                {corrGuardando && <Loader2 size={15} className="animate-spin" />} Guardar
              </button>
            </>
          }
        >
          <div className="space-y-4 text-sm">
            <p className="font-medium text-gray-900">{corrigiendo.item.titulo} <span className="font-mono text-gray-500">({corrigiendo.item.codigo})</span></p>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Estado de conservación">
              {OPCIONES.map((o) => (
                <button key={o.value} role="radio" aria-checked={corrConservacion === o.value} onClick={() => setCorrConservacion(o.value)}
                  className={cn("py-3 rounded-xl border-2 font-semibold", corrConservacion === o.value ? o.activeCls : o.cls)}>
                  {ETIQUETAS_CONSERVACION[o.value]}
                </button>
              ))}
            </div>
            <label className="block">
              <span className="block font-medium text-gray-700 mb-1">Observaciones</span>
              <textarea value={corrObservaciones} onChange={(e) => setCorrObservaciones(e.target.value)} rows={2} placeholder="p. ej. tapa rota, páginas subrayadas…" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
            {corrConservacion === "deteriorado" && !corrigiendo.item.incidencia && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={corrIncidencia} onChange={(e) => setCorrIncidencia(e.target.checked)} className="w-4 h-4 rounded" />
                Crear incidencia de deterioro
              </label>
            )}
            {corrError && <p className="text-red-600">{corrError}</p>}
          </div>
        </Modal>
      )}
    </div>
  );
}

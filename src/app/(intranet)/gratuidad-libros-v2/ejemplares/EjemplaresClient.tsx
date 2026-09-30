"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookCopy, ChevronLeft, ChevronRight, Download, Loader2, Search, Tags, RefreshCw, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/gratuidad-v2/Modal";
import { descargarCsv } from "@/lib/gratuidadV2/exportar";
import { ConservacionText, SituacionBadge } from "@/components/gratuidad-v2/Badges";
import {
  ETIQUETAS_CONSERVACION, ETIQUETAS_SITUACION, MENSAJES_ERROR_V2, MENSAJES_NO_ELIMINADO_V2,
  type CambiarSituacionResult, type EliminarEjemplaresResult, type ConservacionV2, type EjemplarListadoV2, type SituacionV2,
} from "@/lib/types/gratuidadV2";

interface Props {
  titulos: { id: string; titulo: string }[];
  grupos: string[];
  canManage: boolean;
}

interface Filtros {
  titulo: string;
  situacion: SituacionV2 | "";
  conservacion: ConservacionV2 | "";
  grupo: string;
  busqueda: string;
}

const PAGE_SIZE = 100;
const FILTROS_VACIOS: Filtros = { titulo: "", situacion: "", conservacion: "", grupo: "", busqueda: "" };

/** A search with digits and no spaces is a barcode; anything else is a student name. */
function esCodigo(s: string): boolean {
  return /\d/.test(s) && !/\s/.test(s);
}

type AccionMasiva = "perdido" | "baja" | "en_centro" | "conservacion" | "eliminar";

export function EjemplaresClient({ titulos, grupos, canManage }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS);
  const [busquedaDebounced, setBusquedaDebounced] = useState("");
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<EjemplarListadoV2[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [exportando, setExportando] = useState(false);

  // Bulk action modal
  const [accion, setAccion] = useState<AccionMasiva | null>(null);
  const [accionConservacion, setAccionConservacion] = useState<ConservacionV2>("bueno");
  const [accionMotivo, setAccionMotivo] = useState("");
  const [accionIncidencia, setAccionIncidencia] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [resultadoAccion, setResultadoAccion] = useState<{ ok: number; errores: string[]; eliminar?: boolean } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setBusquedaDebounced(filtros.busqueda.trim()), 300);
    return () => clearTimeout(t);
  }, [filtros.busqueda]);

  const buildQuery = useCallback((withCount: boolean) => {
    const porAlumno = busquedaDebounced !== "" && !esCodigo(busquedaDebounced);
    const alumnoJoin = filtros.grupo || porAlumno ? "alumno:alumnos!inner(alumno, unidad)" : "alumno:alumnos(alumno, unidad)";
    let q = supabase
      .from("gplv2_ejemplares")
      .select(`*, titulo:gplv2_titulos(titulo, asignatura), ${alumnoJoin}`, withCount ? { count: "exact" } : undefined);
    if (filtros.titulo) q = q.eq("titulo_id", filtros.titulo);
    if (filtros.situacion) q = q.eq("situacion", filtros.situacion);
    if (filtros.conservacion) q = q.eq("conservacion", filtros.conservacion);
    if (filtros.grupo) q = q.eq("alumno.unidad", filtros.grupo);
    if (busquedaDebounced) {
      q = porAlumno
        ? q.ilike("alumno.alumno", `%${busquedaDebounced}%`)
        : q.ilike("codigo", `%${busquedaDebounced}%`);
    }
    return q.order("codigo");
  }, [supabase, filtros.titulo, filtros.situacion, filtros.conservacion, filtros.grupo, busquedaDebounced]);

  const cargar = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const { data, count, error } = await buildQuery(true).range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    if (error) {
      setLoadError(error.message);
      setRows([]);
    } else {
      setRows((data ?? []) as EjemplarListadoV2[]);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }, [buildQuery, page]);

  useEffect(() => { cargar(); }, [cargar]);

  function setFiltro<K extends keyof Filtros>(k: K, v: Filtros[K]) {
    setFiltros((prev) => ({ ...prev, [k]: v }));
    setPage(0);
  }

  const hayFiltros = Object.values(filtros).some(Boolean);
  const paginas = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const todosPaginaMarcados = rows.length > 0 && rows.every((r) => seleccion.has(r.codigo));

  function toggleSel(codigo: string) {
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(codigo)) next.delete(codigo); else next.add(codigo);
      return next;
    });
  }

  function toggleSelPagina() {
    setSeleccion((prev) => {
      const next = new Set(prev);
      rows.forEach((r) => (todosPaginaMarcados ? next.delete(r.codigo) : next.add(r.codigo)));
      return next;
    });
  }

  // ── CSV export of the whole filtered set ────────────────────────────────────

  async function exportarCSV() {
    setExportando(true);
    const todos: EjemplarListadoV2[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await buildQuery(false).range(from, from + 999);
      if (error) { window.alert(`Error al exportar: ${error.message}`); setExportando(false); return; }
      todos.push(...((data ?? []) as EjemplarListadoV2[]));
      if (!data || data.length < 1000) break;
    }
    descargarCsv(
      "ejemplares_gratuidad_v2.csv",
      ["Código", "Título", "Asignatura", "Situación", "Conservación", "Alumno", "Grupo", "Fecha alta", "Observaciones"],
      todos.map((r) => [
        r.codigo, r.titulo?.titulo, r.titulo?.asignatura,
        ETIQUETAS_SITUACION[r.situacion], ETIQUETAS_CONSERVACION[r.conservacion],
        r.alumno?.alumno, r.alumno?.unidad, r.fecha_alta, r.observaciones,
      ]),
    );
    setExportando(false);
  }

  // ── Bulk actions ────────────────────────────────────────────────────────────

  function abrirAccion(a: AccionMasiva) {
    setAccion(a);
    setAccionMotivo("");
    setAccionIncidencia(true);
    setAccionConservacion("bueno");
    setResultadoAccion(null);
  }

  /** Leftover labels: one call deletes every selected copy that was never used */
  async function eliminarSinUsar() {
    setProcesando(true);
    const { data, error } = await supabase.rpc("gplv2_eliminar_ejemplares", { p_codigos: [...seleccion] });
    setProcesando(false);
    const res = data as EliminarEjemplaresResult | null;
    if (error || !res) {
      setResultadoAccion({ ok: 0, errores: [error?.message ?? "Error al eliminar"], eliminar: true });
    } else if (!res.ok) {
      setResultadoAccion({ ok: 0, errores: [MENSAJES_ERROR_V2[res.error]], eliminar: true });
    } else {
      setResultadoAccion({
        ok: res.eliminados.length,
        errores: res.rechazados.map((r) => `${r.codigo}: ${MENSAJES_NO_ELIMINADO_V2[r.error]}`),
        eliminar: true,
      });
    }
    setSeleccion(new Set());
    cargar();
  }

  async function ejecutarAccion() {
    if (!accion) return;
    if (accion === "eliminar") { await eliminarSinUsar(); return; }
    setProcesando(true);
    let ok = 0;
    const errores: string[] = [];
    for (const codigo of seleccion) {
      const { data, error } = await supabase.rpc("gplv2_cambiar_situacion", {
        p_codigo: codigo,
        p_situacion: accion === "conservacion" ? null : accion,
        p_conservacion: accion === "conservacion" || accion === "en_centro" ? accionConservacion : null,
        p_motivo: accionMotivo.trim() || null,
        p_crear_incidencia: accion === "perdido" && accionIncidencia,
      });
      const res = data as CambiarSituacionResult | null;
      if (error || !res) errores.push(`${codigo}: ${error?.message ?? "error"}`);
      else if (!res.ok) errores.push(`${codigo}: ${MENSAJES_ERROR_V2[res.error]}`);
      else ok++;
    }
    setProcesando(false);
    setResultadoAccion({ ok, errores });
    setSeleccion(new Set());
    cargar();
  }

  const tituloAccion: Record<AccionMasiva, string> = {
    perdido: "Marcar como perdidos",
    baja: "Dar de baja",
    en_centro: "Recuperar (volver al centro)",
    conservacion: "Cambiar estado de conservación",
    eliminar: "Eliminar etiquetas sobrantes sin usar",
  };

  function imprimirSeleccion() {
    router.push(`/gratuidad-libros-v2/etiquetas?codigos=${encodeURIComponent([...seleccion].join(","))}`);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-2">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={filtros.busqueda}
            onChange={(e) => setFiltro("busqueda", e.target.value)}
            placeholder="Código de barras o nombre del alumno"
            aria-label="Buscar por código o alumno"
            className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <select value={filtros.titulo} onChange={(e) => setFiltro("titulo", e.target.value)} aria-label="Título" className={selectCls}>
            <option value="">Todos los títulos</option>
            {titulos.map((t) => <option key={t.id} value={t.id}>{t.titulo}</option>)}
          </select>
          <select value={filtros.situacion} onChange={(e) => setFiltro("situacion", e.target.value as SituacionV2 | "")} aria-label="Situación" className={selectCls}>
            <option value="">Cualquier situación</option>
            {(Object.keys(ETIQUETAS_SITUACION) as SituacionV2[]).map((s) => <option key={s} value={s}>{ETIQUETAS_SITUACION[s]}</option>)}
          </select>
          <select value={filtros.conservacion} onChange={(e) => setFiltro("conservacion", e.target.value as ConservacionV2 | "")} aria-label="Conservación" className={selectCls}>
            <option value="">Cualquier estado</option>
            {(Object.keys(ETIQUETAS_CONSERVACION) as ConservacionV2[]).map((c) => <option key={c} value={c}>{ETIQUETAS_CONSERVACION[c]}</option>)}
          </select>
          <select value={filtros.grupo} onChange={(e) => setFiltro("grupo", e.target.value)} aria-label="Grupo del alumno" className={selectCls}>
            <option value="">Cualquier grupo</option>
            {grupos.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <p className="text-sm text-gray-500" aria-live="polite">
            {loading ? "Cargando..." : `${total} ejemplares`}
            {hayFiltros && (
              <button onClick={() => { setFiltros(FILTROS_VACIOS); setPage(0); }} className="ml-3 text-blue-600 hover:underline">
                Quitar filtros
              </button>
            )}
          </p>
          <button
            onClick={exportarCSV}
            disabled={exportando || total === 0}
            className="flex items-center gap-1.5 border border-gray-300 text-gray-600 text-sm font-medium px-3 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            {exportando ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            CSV
          </button>
        </div>
      </div>

      {/* Selection bar */}
      {canManage && seleccion.size > 0 && (
        <div className="sticky top-2 z-10 flex flex-wrap items-center gap-2 bg-gray-900 text-white rounded-xl px-3 py-2 shadow-lg">
          <span className="text-sm font-medium mr-auto">{seleccion.size} seleccionados</span>
          <BarButton onClick={imprimirSeleccion}><Tags size={15} /> Etiquetas</BarButton>
          <BarButton onClick={() => abrirAccion("conservacion")}>Estado</BarButton>
          <BarButton onClick={() => abrirAccion("perdido")}>Perdido</BarButton>
          <BarButton onClick={() => abrirAccion("baja")}>Baja</BarButton>
          <BarButton onClick={() => abrirAccion("en_centro")}><RefreshCw size={14} /> Recuperar</BarButton>
          <BarButton onClick={() => abrirAccion("eliminar")} label="Eliminar etiquetas sobrantes sin usar."><Trash2 size={14} /> Eliminar</BarButton>
          <button onClick={() => setSeleccion(new Set())} aria-label="Quitar selección" className="p-2 hover:bg-white/10 rounded-lg"><X size={16} /></button>
        </div>
      )}

      {resultadoAccion && (
        <div className={`text-sm rounded-lg px-3 py-2 border ${resultadoAccion.errores.length ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-emerald-50 border-emerald-200 text-emerald-800"}`}>
          <p>
            {resultadoAccion.ok} ejemplares {resultadoAccion.eliminar ? "eliminados" : "actualizados"}
            {resultadoAccion.errores.length ? `, ${resultadoAccion.errores.length} ${resultadoAccion.eliminar ? "no se han podido eliminar" : "con errores"}:` : "."}
          </p>
          {resultadoAccion.errores.length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-xs">{resultadoAccion.errores.map((e) => <li key={e}>{e}</li>)}</ul>
          )}
        </div>
      )}

      {loadError && <p className="text-sm text-red-600">{loadError}</p>}

      {/* List */}
      {!loading && rows.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <BookCopy size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">{hayFiltros ? "No hay ejemplares con esos filtros" : "Aún no hay ejemplares"}</p>
          {!hayFiltros && canManage && <p className="text-sm mt-1">Dalos de alta desde Títulos → «Añadir ejemplares».</p>}
        </div>
      ) : (
        <div className={`bg-white border border-gray-200 rounded-xl overflow-hidden ${loading ? "opacity-60" : ""}`}>
          <div className="hidden md:flex items-center gap-3 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400 border-b bg-gray-50">
            <span className="w-5">
              {canManage && (
                <input type="checkbox" checked={todosPaginaMarcados} onChange={toggleSelPagina} aria-label="Seleccionar toda la página" className="w-4 h-4 rounded" />
              )}
            </span>
            <div className={`flex-1 ${rowGridCls}`}>
              <span>Código</span><span>Título</span><span>Situación</span><span>Estado</span><span>Alumno</span>
            </div>
          </div>
          <ul className="divide-y divide-gray-100">
            {rows.map((r) => (
              <li key={r.id} className="flex items-start md:items-center gap-3 px-4 py-3">
                <span className="w-5 pt-0.5 md:pt-0">
                  {canManage && (
                    <input
                      type="checkbox"
                      checked={seleccion.has(r.codigo)}
                      onChange={() => toggleSel(r.codigo)}
                      aria-label={`Seleccionar ${r.codigo}`}
                      className="w-5 h-5 md:w-4 md:h-4 rounded"
                    />
                  )}
                </span>
                <div className={`min-w-0 flex-1 gap-y-0.5 ${rowGridCls}`}>
                  <div className="flex items-center justify-between gap-2 md:contents">
                    <Link href={`/gratuidad-libros-v2/consulta?codigo=${encodeURIComponent(r.codigo)}`} className="font-mono text-sm font-semibold text-blue-700 hover:underline">{r.codigo}</Link>
                    <span className="md:hidden"><SituacionBadge situacion={r.situacion} /></span>
                  </div>
                  <span className="text-sm text-gray-700 truncate">{r.titulo?.titulo ?? "—"}</span>
                  <span className="hidden md:block"><SituacionBadge situacion={r.situacion} /></span>
                  <span><ConservacionText conservacion={r.conservacion} /></span>
                  <span className="text-sm text-gray-600 truncate">
                    {r.alumno ? <>{r.alumno.alumno} <span className="text-gray-400">· {r.alumno.unidad}</span></> : <span className="text-gray-300 hidden md:inline">—</span>}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Pagination */}
      {paginas > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} aria-label="Página anterior" className={pageBtnCls}><ChevronLeft size={18} /></button>
          <span className="text-sm text-gray-600">Página {page + 1} de {paginas}</span>
          <button onClick={() => setPage((p) => Math.min(paginas - 1, p + 1))} disabled={page >= paginas - 1} aria-label="Página siguiente" className={pageBtnCls}><ChevronRight size={18} /></button>
        </div>
      )}

      {/* Bulk action modal */}
      {accion && (
        <Modal
          titulo={tituloAccion[accion]}
          onClose={() => !procesando && setAccion(null)}
          footer={
            resultadoAccion ? (
              <button onClick={() => setAccion(null)} className="px-4 py-2.5 text-sm font-medium bg-gray-900 text-white rounded-lg">Cerrar</button>
            ) : (
              <>
                <button onClick={() => setAccion(null)} disabled={procesando} className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button
                  onClick={ejecutarAccion}
                  disabled={procesando}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white rounded-lg disabled:opacity-50 ${accion === "eliminar" ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}`}
                >
                  {procesando && <Loader2 size={15} className="animate-spin" />}
                  {accion === "eliminar" ? `Eliminar ${seleccion.size} definitivamente` : `Aplicar a ${seleccion.size}`}
                </button>
              </>
            )
          }
        >
          {resultadoAccion ? (
            <p className="text-sm text-gray-700">
              {resultadoAccion.ok} {accion === "eliminar" ? "eliminados" : "actualizados"}
              {resultadoAccion.errores.length ? `, ${resultadoAccion.errores.length} ${accion === "eliminar" ? "no se han podido eliminar (el detalle está en la página)" : "con errores"}.` : "."}
            </p>
          ) : accion === "eliminar" ? (
            <div className="space-y-3 text-sm">
              <p className="text-gray-700">
                Se eliminarán definitivamente los ejemplares seleccionados que <b>nunca se hayan prestado</b> ni tengan incidencias.
                Los que tengan historial no se tocan (para esos usa «Baja»).
              </p>
              <p className="font-mono text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-2 max-h-32 overflow-y-auto break-words">
                {[...seleccion].sort().join(", ")}
              </p>
              <p className="text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                Hazlo solo con etiquetas que <b>no estén pegadas en ningún libro</b>. Si se elimina un ejemplar que sí existe,
                al escanear su etiqueta saldrá «código no encontrado». Esta acción no se puede deshacer y los códigos no se reutilizan.
              </p>
            </div>
          ) : (
            <div className="space-y-4 text-sm">
              {accion === "baja" && <p className="text-gray-600">Los ejemplares prestados no se pueden dar de baja: primero hay que devolverlos.</p>}
              {accion === "perdido" && <p className="text-gray-600">Si el ejemplar está prestado, se cierra el préstamo como perdido.</p>}
              {(accion === "conservacion" || accion === "en_centro") && (
                <label className="block">
                  <span className="block font-medium text-gray-700 mb-1">Estado de conservación</span>
                  <select value={accionConservacion} onChange={(e) => setAccionConservacion(e.target.value as ConservacionV2)} className={selectCls}>
                    {(Object.keys(ETIQUETAS_CONSERVACION) as ConservacionV2[]).map((c) => <option key={c} value={c}>{ETIQUETAS_CONSERVACION[c]}</option>)}
                  </select>
                </label>
              )}
              <label className="block">
                <span className="block font-medium text-gray-700 mb-1">Motivo (opcional)</span>
                <input value={accionMotivo} onChange={(e) => setAccionMotivo(e.target.value)} className={selectCls} />
              </label>
              {accion === "perdido" && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={accionIncidencia} onChange={(e) => setAccionIncidencia(e.target.checked)} className="w-4 h-4 rounded" />
                  Crear incidencia de pérdida (si estaba prestado)
                </label>
              )}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

const rowGridCls = "grid md:grid-cols-[7rem_minmax(0,1fr)_7rem_6rem_minmax(0,1fr)] md:items-center gap-x-3";
const selectCls ="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";
const pageBtnCls = "p-2.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-40";

function BarButton({ onClick, children, label }: { onClick: () => void; children: React.ReactNode; label?: string }) {
  return (
    <button onClick={onClick} title={label} aria-label={label} className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20">
      {children}
    </button>
  );
}

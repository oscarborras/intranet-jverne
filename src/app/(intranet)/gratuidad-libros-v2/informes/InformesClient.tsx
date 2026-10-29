"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, Loader2, Printer, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { dateStrMadrid, formatDateMadrid, todayMadrid } from "@/lib/dates";
import { useTextFilter } from "@/lib/useTextFilter";
import { ConservacionText, DiversificacionBadge, OptativoBadge, SituacionBadge } from "@/components/gratuidad-v2/Badges";
import { descargarCsv, type Celda } from "@/lib/gratuidadV2/exportar";
import { buildListadoHtml, imprimirHtml } from "@/lib/gratuidadV2/documentos";
import {
  ETIQUETAS_CONSERVACION, ETIQUETAS_SITUACION,
  type AlumnoPendienteV2, type DevueltoV2, type EjemplarListadoV2, type StockTituloV2,
} from "@/lib/types/gratuidadV2";

export type TabInforme = "pendientes" | "devueltos" | "stock" | "perdidos";

interface Props {
  stock: StockTituloV2[];
  /** Groups with books still to return */
  grupos: string[];
  cursoEscolar: string;
  inicial: { tab: TabInforme; soloBajas: boolean };
}

const TAB_LABEL: Record<TabInforme, string> = {
  pendientes: "Pendientes de devolver",
  devueltos: "Libros devueltos",
  stock: "Stock por título",
  perdidos: "Perdidos y deteriorados",
};

/** Books still needed to give one copy to every student of the lot (optional titles: unknown) */
function faltan(s: StockTituloV2): number | null {
  if (s.optativo) return null;
  return Math.max(0, s.alumnos_lote - (s.en_centro + s.prestado));
}

const DEVUELTO_SELECT =
  "id, alumno_id, alumno_nombre, alumno_grupo, fecha_entrega, fecha_devolucion, conservacion_devolucion, " +
  "ejemplar:gplv2_ejemplares(codigo, titulo:gplv2_titulos(titulo, diversificacion)), recogido:profesores!recogido_por(profesor)";

function textoDevuelto(d: DevueltoV2): string {
  return `${d.alumno_nombre} ${d.alumno_grupo} ${d.ejemplar?.codigo ?? ""} ${d.ejemplar?.titulo?.titulo ?? ""}`;
}

export function InformesClient({ stock, grupos, cursoEscolar, inicial }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [tab, setTab] = useState<TabInforme>(inicial.tab);

  // Pending returns
  const [grupo, setGrupo] = useState("");
  const [soloBajas, setSoloBajas] = useState(inicial.soloBajas);
  const [soloAnteriores, setSoloAnteriores] = useState(false);
  const [pendientes, setPendientes] = useState<AlumnoPendienteV2[]>([]);
  const [cargandoPend, setCargandoPend] = useState(false);

  // Returned books (active school year)
  const [devueltos, setDevueltos] = useState<DevueltoV2[]>([]);
  const [cargandoDev, setCargandoDev] = useState(false);
  const [grupoDev, setGrupoDev] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [busquedaDev, setBusquedaDev] = useState("");

  // Stock
  const [incluirInactivos, setIncluirInactivos] = useState(false);
  const [soloFaltan, setSoloFaltan] = useState(false);

  // Lost / damaged
  const [problemas, setProblemas] = useState<EjemplarListadoV2[]>([]);
  const [cargandoProb, setCargandoProb] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams({ tab });
    if (tab === "pendientes" && soloBajas) params.set("bajas", "1");
    window.history.replaceState(null, "", `?${params}`);
  }, [tab, soloBajas]);

  const cargarPendientes = useCallback(async () => {
    setCargandoPend(true);
    const out: AlumnoPendienteV2[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.rpc("gplv2_alumnos_pendientes", { p_grupo: grupo || null }).range(from, from + 999);
      if (error) break;
      out.push(...((data ?? []) as AlumnoPendienteV2[]));
      if (!data || data.length < 1000) break;
    }
    setPendientes(out);
    setCargandoPend(false);
  }, [supabase, grupo]);

  const cargarProblemas = useCallback(async () => {
    setCargandoProb(true);
    const out: EjemplarListadoV2[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from("gplv2_ejemplares")
        .select("*, titulo:gplv2_titulos(titulo, asignatura, diversificacion), alumno:alumnos(alumno, unidad)")
        .or("situacion.eq.perdido,and(conservacion.eq.deteriorado,situacion.neq.baja)")
        .order("situacion")
        .order("codigo")
        .range(from, from + 999);
      if (error) break;
      out.push(...((data ?? []) as EjemplarListadoV2[]));
      if (!data || data.length < 1000) break;
    }
    setProblemas(out);
    setCargandoProb(false);
  }, [supabase]);

  const cargarDevueltos = useCallback(async () => {
    setCargandoDev(true);
    const out: DevueltoV2[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from("gplv2_prestamos")
        .select(DEVUELTO_SELECT)
        .eq("curso_escolar", cursoEscolar)
        .eq("resultado", "devuelto")
        .order("fecha_devolucion", { ascending: false })
        .range(from, from + 999);
      if (error) break;
      const filas = (data ?? []) as unknown as DevueltoV2[];
      out.push(...filas);
      if (filas.length < 1000) break;
    }
    setDevueltos(out);
    setCargandoDev(false);
  }, [supabase, cursoEscolar]);

  useEffect(() => { if (tab === "pendientes") cargarPendientes(); }, [tab, cargarPendientes]);
  useEffect(() => { if (tab === "devueltos") cargarDevueltos(); }, [tab, cargarDevueltos]);
  useEffect(() => { if (tab === "perdidos") cargarProblemas(); }, [tab, cargarProblemas]);

  const pendientesVisibles = useMemo(
    () => pendientes.filter((p) => (!soloBajas || p.baja) && (!soloAnteriores || p.anteriores > 0)),
    [pendientes, soloBajas, soloAnteriores],
  );
  const gruposDev = useMemo(
    () => [...new Set(devueltos.map((d) => d.alumno_grupo))].sort((a, b) => a.localeCompare(b, "es")),
    [devueltos],
  );
  const devueltosFiltrados = useMemo(() => devueltos.filter((d) => {
    if (grupoDev && d.alumno_grupo !== grupoDev) return false;
    const dia = dateStrMadrid(d.fecha_devolucion);
    return (!desde || dia >= desde) && (!hasta || dia <= hasta);
  }), [devueltos, grupoDev, desde, hasta]);
  const devueltosVisibles = useTextFilter(devueltosFiltrados, textoDevuelto, busquedaDev);

  const stockVisible = useMemo(
    () => stock.filter((s) => (incluirInactivos || s.activo) && (!soloFaltan || (faltan(s) ?? 0) > 0)),
    [stock, incluirInactivos, soloFaltan],
  );

  // ── Export: same columns for CSV and print ──────────────────────────────────

  function datosTab(): { titulo: string; cabeceras: string[]; filas: Celda[][]; archivo: string } {
    if (tab === "pendientes") {
      return {
        titulo: `Alumnos con libros pendientes de devolver${grupo ? ` · ${grupo}` : ""}${soloBajas ? " · dados de baja" : ""}${soloAnteriores ? " · de cursos anteriores" : ""}`,
        cabeceras: ["Alumno", "Grupo", "Baja", "Pendientes", "De cursos anteriores", "Libros"],
        filas: pendientesVisibles.map((p) => [p.alumno, p.grupo, p.baja ? "Sí" : "", p.pendientes, p.anteriores, p.libros]),
        archivo: "pendientes_devolver.csv",
      };
    }
    if (tab === "devueltos") {
      const rango = desde || hasta ? ` · ${desde ? `desde ${formatDateMadrid(`${desde}T12:00:00`)}` : ""}${desde && hasta ? " " : ""}${hasta ? `hasta ${formatDateMadrid(`${hasta}T12:00:00`)}` : ""}` : "";
      return {
        titulo: `Libros devueltos${grupoDev ? ` · ${grupoDev}` : ""}${rango}`,
        cabeceras: ["Fecha devolución", "Alumno", "Grupo", "Código", "Título", "Estado", "Fecha entrega", "Recogido por"],
        filas: devueltosVisibles.map((d) => [
          formatDateMadrid(d.fecha_devolucion), d.alumno_nombre, d.alumno_grupo, d.ejemplar?.codigo ?? "", d.ejemplar?.titulo?.titulo ?? "",
          d.conservacion_devolucion ? ETIQUETAS_CONSERVACION[d.conservacion_devolucion] : "", formatDateMadrid(d.fecha_entrega), d.recogido?.profesor ?? "",
        ]),
        archivo: "libros_devueltos.csv",
      };
    }
    if (tab === "stock") {
      return {
        titulo: "Stock de libros por título",
        cabeceras: ["Título", "Asignatura", "Diversificación", "Alumnos del lote", "Disponibles", "En el centro", "Prestados", "Deteriorados", "Perdidos", "Faltan"],
        filas: stockVisible.map((s) => [s.titulo, s.asignatura ?? "", s.diversificacion ? "Sí" : "No", s.optativo ? "Optativo" : s.alumnos_lote, s.en_centro + s.prestado, s.en_centro, s.prestado, s.deteriorados, s.perdido, faltan(s) ?? ""]),
        archivo: "stock_titulos.csv",
      };
    }
    return {
      titulo: "Ejemplares perdidos y deteriorados",
      cabeceras: ["Código", "Título", "Situación", "Estado", "Alumno", "Grupo"],
      filas: problemas.map((e) => [e.codigo, e.titulo?.titulo ?? "", ETIQUETAS_SITUACION[e.situacion], ETIQUETAS_CONSERVACION[e.conservacion], e.alumno?.alumno ?? "", e.alumno?.unidad ?? ""]),
      archivo: "perdidos_deteriorados.csv",
    };
  }

  function exportarCsv() {
    const d = datosTab();
    descargarCsv(d.archivo, d.cabeceras, d.filas);
  }

  function imprimir() {
    const d = datosTab();
    const [y, m, dd] = todayMadrid().split("-");
    imprimirHtml(buildListadoHtml(d.titulo, `Curso ${cursoEscolar} · ${dd}/${m}/${y} · ${d.filas.length} filas`, d.cabeceras, d.filas.map((f) => f.map((c) => c ?? ""))));
  }

  const cargando = (tab === "pendientes" && cargandoPend) || (tab === "devueltos" && cargandoDev) || (tab === "perdidos" && cargandoProb);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg overflow-x-auto" role="tablist">
          {(Object.keys(TAB_LABEL) as TabInforme[]).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
              className={cn("px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap", tab === t ? "bg-white shadow text-gray-900" : "text-gray-500")}>
              {TAB_LABEL[t]}
            </button>
          ))}
        </div>
        <div className="flex gap-2 sm:ml-auto">
          <button onClick={exportarCsv} className="flex items-center gap-1.5 border border-gray-300 text-gray-600 text-sm font-medium px-3 py-2 rounded-lg hover:bg-gray-50"><Download size={14} /> CSV</button>
          <button onClick={imprimir} className="flex items-center gap-1.5 border border-gray-300 text-gray-600 text-sm font-medium px-3 py-2 rounded-lg hover:bg-gray-50"><Printer size={14} /> Imprimir</button>
        </div>
      </div>

      {/* ── Pending returns ── */}
      {tab === "pendientes" && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <select value={grupo} onChange={(e) => setGrupo(e.target.value)} aria-label="Grupo" className={selectCls}>
              <option value="">Todos los grupos</option>
              {grupos.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={soloBajas} onChange={(e) => setSoloBajas(e.target.checked)} className="w-4 h-4 rounded" />
              Solo alumnos dados de baja
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={soloAnteriores} onChange={(e) => setSoloAnteriores(e.target.checked)} className="w-4 h-4 rounded" />
              Solo con libros de cursos anteriores
            </label>
            <span className="text-sm text-gray-500 ml-auto">
              {pendientesVisibles.length} alumnos · {pendientesVisibles.reduce((s, p) => s + p.pendientes, 0)} libros
            </span>
          </div>
          {cargando ? <Cargando /> : (
            <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
              {pendientesVisibles.map((p, i) => (
                <div key={p.alumno_id ?? `x${i}`} className="px-4 py-3 flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
                  <div className="sm:w-72 flex-shrink-0">
                    {p.alumno_id ? (
                      <Link href={`/gratuidad-libros-v2/consulta?alumno=${p.alumno_id}`} className="text-sm font-medium text-blue-700 hover:underline">{p.alumno}</Link>
                    ) : <span className="text-sm font-medium text-gray-900">{p.alumno}</span>}
                    <p className="text-xs text-gray-500">
                      {p.grupo}
                      {p.baja && <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">Baja</span>}
                      {p.anteriores > 0 && (
                        <span className="ml-2 px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold" title="Libros entregados en un curso anterior">
                          {p.anteriores} de cursos anteriores
                        </span>
                      )}
                    </p>
                  </div>
                  <p className="text-sm text-gray-600 flex-1"><b className="text-gray-900">{p.pendientes}</b> · {p.libros}</p>
                </div>
              ))}
              {pendientesVisibles.length === 0 && <p className="px-4 py-10 text-center text-sm text-gray-400">No hay libros pendientes de devolver.</p>}
            </div>
          )}
        </>
      )}

      {/* ── Returned books ── */}
      {tab === "devueltos" && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="search" value={busquedaDev} onChange={(e) => setBusquedaDev(e.target.value)}
                placeholder="Alumno, código o título" aria-label="Buscar en libros devueltos"
                className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select value={grupoDev} onChange={(e) => setGrupoDev(e.target.value)} aria-label="Grupo" className={selectCls}>
              <option value="">Todos los grupos</option>
              {gruposDev.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              Desde
              <input type="date" value={desde} max={hasta || undefined} onChange={(e) => setDesde(e.target.value)} className={selectCls} />
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              Hasta
              <input type="date" value={hasta} min={desde || undefined} onChange={(e) => setHasta(e.target.value)} className={selectCls} />
            </label>
            <span className="text-sm text-gray-500 ml-auto">{devueltosVisibles.length} libros</span>
          </div>
          <p className="text-xs text-gray-400 -mt-2">Libros devueltos en el curso {cursoEscolar}. El grupo es el que tenía el alumno al recibir el libro.</p>
          {cargando ? <Cargando /> : (
            <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
              {devueltosVisibles.map((d) => (
                <div key={d.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
                  <span className="text-sm tabular-nums text-gray-500 w-24">{formatDateMadrid(d.fecha_devolucion)}</span>
                  {d.ejemplar && (
                    <Link href={`/gratuidad-libros-v2/consulta?codigo=${encodeURIComponent(d.ejemplar.codigo)}`} className="font-mono text-sm font-semibold text-blue-700 hover:underline w-24">{d.ejemplar.codigo}</Link>
                  )}
                  <span className="text-sm text-gray-800 flex-1 min-w-[12rem]">
                    {d.ejemplar?.titulo?.titulo}
                    {d.ejemplar?.titulo?.diversificacion && <DiversificacionBadge className="ml-1.5 align-middle" />}
                  </span>
                  {d.conservacion_devolucion && <ConservacionText conservacion={d.conservacion_devolucion} />}
                  <span className="text-sm text-gray-500 w-full sm:w-auto">
                    {d.alumno_id ? (
                      <Link href={`/gratuidad-libros-v2/consulta?alumno=${d.alumno_id}`} className="text-blue-700 hover:underline">{d.alumno_nombre}</Link>
                    ) : d.alumno_nombre} · {d.alumno_grupo}
                    {d.recogido && <span className="text-gray-400"> · recogido por {d.recogido.profesor}</span>}
                  </span>
                </div>
              ))}
              {devueltosVisibles.length === 0 && <p className="px-4 py-10 text-center text-sm text-gray-400">No hay libros devueltos con estos filtros.</p>}
            </div>
          )}
        </>
      )}

      {/* ── Stock ── */}
      {tab === "stock" && (
        <>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={soloFaltan} onChange={(e) => setSoloFaltan(e.target.checked)} className="w-4 h-4 rounded" />
              Solo títulos con ejemplares insuficientes
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={incluirInactivos} onChange={(e) => setIncluirInactivos(e.target.checked)} className="w-4 h-4 rounded" />
              Incluir títulos archivados
            </label>
          </div>
          <p className="text-xs text-gray-400 -mt-2">«Faltan» = alumnos de los grupos del lote − ejemplares disponibles (en el centro + prestados). En los títulos optativos no se calcula.</p>
          <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th scope="col" className="text-left px-4 py-2">Título</th>
                  <th scope="col" className="text-right px-3 py-2">Alumnos</th>
                  <th scope="col" className="text-right px-3 py-2">Disponibles</th>
                  <th scope="col" className="text-right px-3 py-2 hidden md:table-cell">En centro</th>
                  <th scope="col" className="text-right px-3 py-2 hidden md:table-cell">Prestados</th>
                  <th scope="col" className="text-right px-3 py-2 hidden md:table-cell">Deterior.</th>
                  <th scope="col" className="text-right px-3 py-2 hidden md:table-cell">Perdidos</th>
                  <th scope="col" className="text-right px-4 py-2">Faltan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stockVisible.map((s) => {
                  const f = faltan(s);
                  return (
                    <tr key={s.titulo_id} className={cn(!s.activo && "opacity-50")}>
                      <th scope="row" className="text-left font-normal px-4 py-2.5">
                        <span className="block text-gray-900">{s.titulo}</span>
                        <span className="block text-xs text-gray-400">
                          {s.diversificacion && <DiversificacionBadge className="mr-1.5" />}
                          {s.optativo && !s.diversificacion && <OptativoBadge className="mr-1.5" />}
                          {s.asignatura}
                        </span>
                      </th>
                      <td className="text-right px-3 tabular-nums">{s.optativo ? "—" : s.alumnos_lote}</td>
                      <td className="text-right px-3 tabular-nums font-medium">{s.en_centro + s.prestado}</td>
                      <td className="text-right px-3 tabular-nums hidden md:table-cell">{s.en_centro}</td>
                      <td className="text-right px-3 tabular-nums hidden md:table-cell">{s.prestado}</td>
                      <td className={cn("text-right px-3 tabular-nums hidden md:table-cell", s.deteriorados > 0 && "text-amber-700")}>{s.deteriorados}</td>
                      <td className={cn("text-right px-3 tabular-nums hidden md:table-cell", s.perdido > 0 && "text-red-600")}>{s.perdido}</td>
                      <td className={cn("text-right px-4 tabular-nums font-semibold", f == null ? "text-gray-400" : f > 0 ? "text-red-600" : "text-emerald-700")}>{f ?? "—"}</td>
                    </tr>
                  );
                })}
                {stockVisible.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">Sin títulos.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Lost / damaged ── */}
      {tab === "perdidos" && (cargando ? <Cargando /> : (
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {problemas.map((e) => (
            <div key={e.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
              <Link href={`/gratuidad-libros-v2/consulta?codigo=${encodeURIComponent(e.codigo)}`} className="font-mono text-sm font-semibold text-blue-700 hover:underline w-24">{e.codigo}</Link>
              <span className="text-sm text-gray-800 flex-1 min-w-[12rem]">
                {e.titulo?.titulo}
                {e.titulo?.diversificacion && <DiversificacionBadge className="ml-1.5 align-middle" />}
              </span>
              <SituacionBadge situacion={e.situacion} />
              <ConservacionText conservacion={e.conservacion} />
              {e.alumno && <span className="text-sm text-gray-500 w-full sm:w-auto">{e.alumno.alumno} · {e.alumno.unidad}</span>}
            </div>
          ))}
          {problemas.length === 0 && <p className="px-4 py-10 text-center text-sm text-gray-400">No hay ejemplares perdidos ni deteriorados.</p>}
        </div>
      ))}
    </div>
  );
}

const selectCls = "border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";

function Cargando() {
  return <div className="flex justify-center py-10 text-gray-400"><Loader2 className="animate-spin" /></div>;
}

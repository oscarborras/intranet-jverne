"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ClipboardList, Download, FileText, Loader2, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { todayMadrid } from "@/lib/dates";
import { Modal } from "@/components/gratuidad-v2/Modal";
import { descargarCsv } from "@/lib/gratuidadV2/exportar";
import { useTextFilter } from "@/lib/useTextFilter";
import { buildCartaIncidenciaHtml, imprimirHtml } from "@/lib/gratuidadV2/documentos";
import {
  ETIQUETAS_ESTADO_INCIDENCIA, ETIQUETAS_TIPO_INCIDENCIA,
  type EstadoIncidenciaV2, type IncidenciaV2, type TipoIncidenciaV2,
} from "@/lib/types/gratuidadV2";

export interface IncidenciaListadoV2 extends IncidenciaV2 {
  ejemplar: { codigo: string; titulo: { titulo: string } | null } | null;
}

interface Props {
  incidencias: IncidenciaListadoV2[];
  cursoEscolar: string;
}

type FiltroEstado = "pendientes" | EstadoIncidenciaV2 | "todas";

const estadoCls: Record<EstadoIncidenciaV2, string> = {
  abierta: "bg-red-50 text-red-700 border-red-200",
  en_gestion: "bg-amber-50 text-amber-700 border-amber-200",
  resuelta: "bg-emerald-50 text-emerald-700 border-emerald-200",
  archivada: "bg-gray-100 text-gray-500 border-gray-200",
};

const textoIncidencia = (i: IncidenciaListadoV2) =>
  [i.codigo, i.alumno_nombre, i.alumno_grupo, i.ejemplar?.codigo, i.ejemplar?.titulo?.titulo].filter(Boolean).join(" ");

function fecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "2-digit", year: "numeric" });
}

function euros(v: number | null): string {
  return v == null ? "" : v.toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

export function IncidenciasClient({ incidencias: initial, cursoEscolar }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [incidencias, setIncidencias] = useState<IncidenciaListadoV2[]>(initial);

  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("pendientes");
  const [filtroTipo, setFiltroTipo] = useState<TipoIncidenciaV2 | "">("");
  const [filtroCurso, setFiltroCurso] = useState(cursoEscolar);
  const [busqueda, setBusqueda] = useState("");

  const [editando, setEditando] = useState<IncidenciaListadoV2 | null>(null);
  const [form, setForm] = useState({ estado: "abierta" as EstadoIncidenciaV2, coste: "", descripcion: "", notas: "" });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cursos = useMemo(() => [...new Set(incidencias.map((i) => i.curso_escolar))].sort().reverse(), [incidencias]);

  const porFiltros = useMemo(() => {
    return incidencias.filter((i) => {
      if (filtroEstado === "pendientes" && !(i.estado === "abierta" || i.estado === "en_gestion")) return false;
      if (filtroEstado !== "pendientes" && filtroEstado !== "todas" && i.estado !== filtroEstado) return false;
      if (filtroTipo && i.tipo !== filtroTipo) return false;
      if (filtroCurso && i.curso_escolar !== filtroCurso) return false;
      return true;
    });
  }, [incidencias, filtroEstado, filtroTipo, filtroCurso]);
  const visibles = useTextFilter(porFiltros, textoIncidencia, busqueda);

  const totalCoste = visibles.reduce((s, i) => s + (i.coste ?? 0), 0);

  function abrir(i: IncidenciaListadoV2) {
    setEditando(i);
    setForm({
      estado: i.estado,
      coste: i.coste != null ? String(i.coste).replace(".", ",") : "",
      descripcion: i.descripcion ?? "",
      notas: i.notas_gestion ?? "",
    });
    setError(null);
  }

  async function guardar() {
    if (!editando) return;
    const coste = form.coste.trim() === "" ? null : Number(form.coste.replace(",", "."));
    if (coste != null && (Number.isNaN(coste) || coste < 0)) { setError("El importe no es válido."); return; }
    setGuardando(true);
    setError(null);
    const cerrada = form.estado === "resuelta" || form.estado === "archivada";
    const payload = {
      estado: form.estado,
      coste,
      descripcion: form.descripcion.trim() || null,
      notas_gestion: form.notas.trim() || null,
      // Closing date is set when it is resolved and cleared if it is reopened
      fecha_resolucion: cerrada ? (editando.fecha_resolucion ?? new Date().toISOString()) : null,
    };
    const { data, error: err } = await supabase
      .from("gplv2_incidencias")
      .update(payload)
      .eq("id", editando.id)
      .select("*, ejemplar:gplv2_ejemplares(codigo, titulo:gplv2_titulos(titulo))")
      .single();
    setGuardando(false);
    if (err || !data) { setError(err?.message ?? "Error al guardar"); return; }
    setIncidencias((prev) => prev.map((x) => (x.id === editando.id ? (data as unknown as IncidenciaListadoV2) : x)));
    setEditando(null);
  }

  function carta(i: IncidenciaListadoV2) {
    const [y, m, d] = todayMadrid().split("-");
    imprimirHtml(buildCartaIncidenciaHtml({
      codigoIncidencia: i.codigo,
      tipo: i.tipo,
      alumno: i.alumno_nombre ?? "",
      grupo: i.alumno_grupo ?? "",
      cursoEscolar: i.curso_escolar,
      fecha: `${d}/${m}/${y}`,
      libroCodigo: i.ejemplar?.codigo ?? "",
      libroTitulo: i.ejemplar?.titulo?.titulo ?? "",
      coste: i.coste,
      descripcion: i.descripcion,
    }));
  }

  function exportarCsv() {
    descargarCsv(
      "incidencias_gratuidad_v2.csv",
      ["Código", "Fecha", "Curso", "Tipo", "Estado", "Alumno", "Grupo", "Ejemplar", "Título", "Importe", "Descripción", "Notas", "Resuelta"],
      visibles.map((i) => [
        i.codigo, fecha(i.created_at), i.curso_escolar, ETIQUETAS_TIPO_INCIDENCIA[i.tipo], ETIQUETAS_ESTADO_INCIDENCIA[i.estado],
        i.alumno_nombre, i.alumno_grupo, i.ejemplar?.codigo, i.ejemplar?.titulo?.titulo,
        i.coste != null ? i.coste.toFixed(2).replace(".", ",") : "", i.descripcion, i.notas_gestion,
        i.fecha_resolucion ? fecha(i.fecha_resolucion) : "",
      ]),
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-2">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Código, alumno, grupo o libro" aria-label="Buscar incidencias"
            className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value as FiltroEstado)} aria-label="Estado" className={inputCls}>
            <option value="pendientes">Pendientes (abiertas y en gestión)</option>
            {(Object.keys(ETIQUETAS_ESTADO_INCIDENCIA) as EstadoIncidenciaV2[]).map((e) => <option key={e} value={e}>{ETIQUETAS_ESTADO_INCIDENCIA[e]}</option>)}
            <option value="todas">Todas</option>
          </select>
          <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value as TipoIncidenciaV2 | "")} aria-label="Tipo" className={inputCls}>
            <option value="">Cualquier tipo</option>
            {(Object.keys(ETIQUETAS_TIPO_INCIDENCIA) as TipoIncidenciaV2[]).map((t) => <option key={t} value={t}>{ETIQUETAS_TIPO_INCIDENCIA[t]}</option>)}
          </select>
          <select value={filtroCurso} onChange={(e) => setFiltroCurso(e.target.value)} aria-label="Curso escolar" className={inputCls}>
            <option value="">Todos los cursos</option>
            {[...new Set([cursoEscolar, ...cursos])].filter(Boolean).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={exportarCsv} disabled={visibles.length === 0} className="flex items-center justify-center gap-1.5 border border-gray-300 text-gray-600 text-sm font-medium px-3 py-2.5 rounded-lg hover:bg-gray-50 disabled:opacity-40">
            <Download size={14} /> CSV
          </button>
        </div>
        <p className="text-sm text-gray-500">{visibles.length} incidencias{totalCoste > 0 && ` · ${euros(totalCoste)} en total`}</p>
      </div>

      {visibles.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ClipboardList size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">No hay incidencias con esos filtros</p>
          <p className="text-sm mt-1">Se crean al devolver un libro deteriorado o al marcar uno como perdido.</p>
        </div>
      ) : (
        <ul className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {visibles.map((i) => (
            <li key={i.id}>
              <button onClick={() => abrir(i)} className="w-full text-left flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 px-4 py-3 hover:bg-gray-50">
                <div className="flex items-center gap-2 sm:w-44 flex-shrink-0">
                  <span className="font-mono text-sm font-semibold text-gray-900">{i.codigo}</span>
                  <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", estadoCls[i.estado])}>{ETIQUETAS_ESTADO_INCIDENCIA[i.estado]}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-900 truncate">
                    <span className="font-medium">{ETIQUETAS_TIPO_INCIDENCIA[i.tipo]}</span> · {i.ejemplar?.titulo?.titulo}
                    <span className="font-mono text-xs text-gray-400"> ({i.ejemplar?.codigo})</span>
                  </p>
                  <p className="text-xs text-gray-500 truncate">{i.alumno_nombre ?? "Sin alumno"}{i.alumno_grupo && ` · ${i.alumno_grupo}`} · {fecha(i.created_at)}</p>
                </div>
                {i.coste != null && <span className="text-sm font-semibold text-gray-700 tabular-nums">{euros(i.coste)}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}

      {editando && (
        <Modal
          titulo={`Incidencia ${editando.codigo}`}
          onClose={() => setEditando(null)}
          ancho="lg"
          footer={
            <>
              <button onClick={() => carta(editando)} className="mr-auto flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50">
                <FileText size={15} /> Carta a la familia
              </button>
              <button onClick={() => setEditando(null)} className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button onClick={guardar} disabled={guardando} className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">
                {guardando && <Loader2 size={15} className="animate-spin" />} Guardar
              </button>
            </>
          }
        >
          <div className="space-y-4 text-sm">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
              <dt className="text-gray-500">Tipo</dt><dd className="font-medium">{ETIQUETAS_TIPO_INCIDENCIA[editando.tipo]}</dd>
              <dt className="text-gray-500">Alumno</dt>
              <dd>
                {editando.alumno_id
                  ? <Link href={`/gratuidad-libros-v2/consulta?alumno=${editando.alumno_id}`} className="text-blue-700 hover:underline">{editando.alumno_nombre}</Link>
                  : editando.alumno_nombre ?? "—"}
                {editando.alumno_grupo && <span className="text-gray-500"> · {editando.alumno_grupo}</span>}
              </dd>
              <dt className="text-gray-500">Libro</dt>
              <dd>
                {editando.ejemplar && (
                  <Link href={`/gratuidad-libros-v2/consulta?codigo=${encodeURIComponent(editando.ejemplar.codigo)}`} className="text-blue-700 hover:underline">
                    {editando.ejemplar.titulo?.titulo} ({editando.ejemplar.codigo})
                  </Link>
                )}
              </dd>
              <dt className="text-gray-500">Creada</dt><dd>{fecha(editando.created_at)} · curso {editando.curso_escolar}</dd>
              {editando.fecha_resolucion && (<><dt className="text-gray-500">Cerrada</dt><dd>{fecha(editando.fecha_resolucion)}</dd></>)}
            </dl>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="block font-medium text-gray-700 mb-1">Estado</span>
                <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value as EstadoIncidenciaV2 })} className={inputCls}>
                  {(Object.keys(ETIQUETAS_ESTADO_INCIDENCIA) as EstadoIncidenciaV2[]).map((e) => <option key={e} value={e}>{ETIQUETAS_ESTADO_INCIDENCIA[e]}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="block font-medium text-gray-700 mb-1">Importe de reposición (€)</span>
                <input value={form.coste} onChange={(e) => setForm({ ...form, coste: e.target.value })} inputMode="decimal" placeholder="0,00" className={inputCls} />
              </label>
            </div>
            <label className="block">
              <span className="block font-medium text-gray-700 mb-1">Descripción</span>
              <textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} rows={2} className={inputCls} />
            </label>
            <label className="block">
              <span className="block font-medium text-gray-700 mb-1">Notas de gestión</span>
              <textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} rows={3} placeholder="Contacto con la familia, pago, reposición…" className={inputCls} />
            </label>
            {error && <p className="text-red-600">{error}</p>}
          </div>
        </Modal>
      )}
    </div>
  );
}

const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";

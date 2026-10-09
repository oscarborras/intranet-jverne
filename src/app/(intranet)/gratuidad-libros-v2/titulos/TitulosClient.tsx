"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Library, Plus, Pencil, Archive, ArchiveRestore, Trash2, Search, PackagePlus, Tags, Download, Loader2, CheckCircle2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/gratuidad-v2/Modal";
import { CursosSelector } from "@/components/gratuidad-v2/CursosSelector";
import { DiversificacionBadge, OptativoBadge } from "@/components/gratuidad-v2/Badges";
import { agruparPorNivel, nivelDeCurso, resumenLote } from "@/lib/gratuidadV2/cursos";
import { useTextFilter } from "@/lib/useTextFilter";
import {
  ETIQUETAS_CONSERVACION, MENSAJES_ERROR_V2,
  type ConservacionV2, type CrearEjemplaresResult, type ResumenTituloV2, type TituloCursoV2, type TituloV2,
} from "@/lib/types/gratuidadV2";

interface Props {
  titulos: TituloV2[];
  lotes: TituloCursoV2[];
  resumen: ResumenTituloV2[];
  cursos: string[];
}

interface FormTitulo {
  titulo: string;
  asignatura: string;
  editorial: string;
  isbn: string;
  precio: string;
  diversificacion: boolean;
}

const emptyForm: FormTitulo = { titulo: "", asignatura: "", editorial: "", isbn: "", precio: "", diversificacion: false };

const textoTitulo = (t: TituloV2) => [t.titulo, t.asignatura, t.isbn, t.editorial].filter(Boolean).join(" ");

const RESUMEN_VACIO: Omit<ResumenTituloV2, "titulo_id"> = { total: 0, en_centro: 0, prestado: 0, perdido: 0, baja: 0 };

interface ImportResult {
  importados: number;
  omitidos: number;
  titulos: TituloV2[];
  lotes: TituloCursoV2[];
}

export function TitulosClient({ titulos: initialTitulos, lotes: initialLotes, resumen: initialResumen, cursos }: Props) {
  const supabase = createClient();
  const router = useRouter();

  const [titulos, setTitulos] = useState<TituloV2[]>(initialTitulos);
  const [lotes, setLotes] = useState<Record<string, string[]>>(() => {
    const map: Record<string, string[]> = {};
    for (const l of initialLotes) (map[l.titulo_id] ??= []).push(l.curso);
    return map;
  });
  // Optional title (e.g. Diversificación): same flag on every group of its lot
  const [optativos, setOptativos] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const l of initialLotes) if (l.optativo) map[l.titulo_id] = true;
    return map;
  });
  const [resumen, setResumen] = useState<Record<string, ResumenTituloV2>>(
    () => Object.fromEntries(initialResumen.map((r) => [r.titulo_id, r])),
  );

  const [busqueda, setBusqueda] = useState("");
  const [filtroNivel, setFiltroNivel] = useState("todos");
  const [mostrarArchivados, setMostrarArchivados] = useState(false);

  // Title modal
  const [editing, setEditing] = useState<TituloV2 | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormTitulo>(emptyForm);
  const [formCursos, setFormCursos] = useState<Set<string>>(new Set());
  const [formOptativo, setFormOptativo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add copies modal
  const [altaTitulo, setAltaTitulo] = useState<TituloV2 | null>(null);
  const [altaCantidad, setAltaCantidad] = useState("1");
  const [altaConservacion, setAltaConservacion] = useState<ConservacionV2>("nuevo");
  const [altaCreados, setAltaCreados] = useState<string[] | null>(null);

  // v1 import
  const [importando, setImportando] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const niveles = useMemo(() => agruparPorNivel(cursos).map((n) => n.nivel), [cursos]);

  const porFiltros = useMemo(() => {
    return titulos.filter((t) => {
      if (!mostrarArchivados && !t.activo) return false;
      if (filtroNivel !== "todos" && !(lotes[t.id] ?? []).some((c) => nivelDeCurso(c) === filtroNivel)) return false;
      return true;
    });
  }, [titulos, lotes, filtroNivel, mostrarArchivados]);
  const visibles = useTextFilter(porFiltros, textoTitulo, busqueda);

  const stats = useMemo(() => {
    const activos = titulos.filter((t) => t.activo);
    const sum = (k: keyof typeof RESUMEN_VACIO) => activos.reduce((s, t) => s + (resumen[t.id]?.[k] ?? 0), 0);
    return {
      titulos: activos.length,
      sinLote: activos.filter((t) => (lotes[t.id] ?? []).length === 0).length,
      ejemplares: sum("total") - sum("baja"),
      enCentro: sum("en_centro"),
    };
  }, [titulos, lotes, resumen]);

  // ── Title CRUD ──────────────────────────────────────────────────────────────

  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setFormCursos(new Set());
    setFormOptativo(false);
    setError(null);
    setShowForm(true);
  }

  function openEdit(t: TituloV2) {
    setEditing(t);
    setForm({
      titulo: t.titulo,
      asignatura: t.asignatura ?? "",
      editorial: t.editorial ?? "",
      isbn: t.isbn ?? "",
      precio: t.precio != null ? String(t.precio) : "",
      diversificacion: t.diversificacion,
    });
    setFormCursos(new Set(lotes[t.id] ?? []));
    setFormOptativo(optativos[t.id] ?? false);
    setError(null);
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.titulo.trim()) {
      setError("El título es obligatorio.");
      return;
    }
    const precio = form.precio.trim() === "" ? null : Number(form.precio.replace(",", "."));
    if (precio != null && (Number.isNaN(precio) || precio < 0)) {
      setError("El precio no es válido.");
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      titulo: form.titulo.trim(),
      asignatura: form.asignatura.trim() || null,
      editorial: form.editorial.trim() || null,
      isbn: form.isbn.replace(/[\s-]/g, "") || null,
      precio,
      diversificacion: form.diversificacion,
    };

    let tituloId: string;
    if (editing) {
      const { data, error: err } = await supabase.from("gplv2_titulos").update(payload).eq("id", editing.id).select().single();
      if (err || !data) { setError(err?.message ?? "Error al guardar"); setSaving(false); return; }
      setTitulos((prev) => prev.map((t) => (t.id === editing.id ? (data as TituloV2) : t)));
      tituloId = editing.id;
    } else {
      const { data, error: err } = await supabase.from("gplv2_titulos").insert(payload).select().single();
      if (err || !data) { setError(err?.message ?? "Error al guardar"); setSaving(false); return; }
      setTitulos((prev) => [...prev, data as TituloV2].sort((a, b) => a.titulo.localeCompare(b.titulo, "es")));
      tituloId = (data as TituloV2).id;
    }

    // Sync the lot (only the differences)
    const antes = new Set(lotes[tituloId] ?? []);
    const añadir = [...formCursos].filter((c) => !antes.has(c));
    const quitar = [...antes].filter((c) => !formCursos.has(c));
    if (quitar.length > 0) {
      const { error: err } = await supabase.from("gplv2_titulo_cursos").delete().eq("titulo_id", tituloId).in("curso", quitar);
      if (err) { setError(`Título guardado, pero no se pudo actualizar el lote: ${err.message}`); setSaving(false); return; }
    }
    if (añadir.length > 0) {
      const { error: err } = await supabase
        .from("gplv2_titulo_cursos")
        .insert(añadir.map((curso) => ({ titulo_id: tituloId, curso, optativo: formOptativo })));
      if (err) { setError(`Título guardado, pero no se pudo actualizar el lote: ${err.message}`); setSaving(false); return; }
    }
    const conservados = [...antes].filter((c) => formCursos.has(c));
    if (conservados.length > 0 && formOptativo !== (optativos[tituloId] ?? false)) {
      const { error: err } = await supabase.from("gplv2_titulo_cursos").update({ optativo: formOptativo }).eq("titulo_id", tituloId);
      if (err) { setError(`Título guardado, pero no se pudo marcar como optativo: ${err.message}`); setSaving(false); return; }
    }
    setLotes((prev) => ({ ...prev, [tituloId]: [...formCursos].sort() }));
    setOptativos((prev) => ({ ...prev, [tituloId]: formOptativo }));

    setSaving(false);
    setShowForm(false);
  }

  async function toggleArchive(t: TituloV2) {
    const { error: err } = await supabase.from("gplv2_titulos").update({ activo: !t.activo }).eq("id", t.id);
    if (!err) setTitulos((prev) => prev.map((x) => (x.id === t.id ? { ...x, activo: !t.activo } : x)));
  }

  async function handleDelete(t: TituloV2) {
    if (!window.confirm(`¿Eliminar definitivamente «${t.titulo}»?`)) return;
    const { error: err } = await supabase.from("gplv2_titulos").delete().eq("id", t.id);
    if (err) {
      window.alert("No se puede eliminar: el título tiene ejemplares. Archívalo en su lugar.");
      return;
    }
    setTitulos((prev) => prev.filter((x) => x.id !== t.id));
  }

  // ── Add copies ──────────────────────────────────────────────────────────────

  function openAlta(t: TituloV2) {
    setAltaTitulo(t);
    setAltaCantidad("1");
    setAltaConservacion("nuevo");
    setAltaCreados(null);
    setError(null);
  }

  async function handleAlta() {
    if (!altaTitulo) return;
    const cantidad = parseInt(altaCantidad, 10);
    if (!cantidad || cantidad < 1 || cantidad > 500) {
      setError("Indica una cantidad entre 1 y 500.");
      return;
    }
    setSaving(true);
    setError(null);
    const { data, error: err } = await supabase.rpc("gplv2_crear_ejemplares", {
      p_titulo_id: altaTitulo.id,
      p_cantidad: cantidad,
      p_conservacion: altaConservacion,
    });
    setSaving(false);
    const res = data as CrearEjemplaresResult | null;
    if (err || !res) { setError(err?.message ?? "Error al crear los ejemplares"); return; }
    if (!res.ok) { setError(MENSAJES_ERROR_V2[res.error]); return; }

    const codigos = res.ejemplares.map((e) => e.codigo);
    setAltaCreados(codigos);
    setResumen((prev) => {
      const r = prev[altaTitulo.id] ?? { titulo_id: altaTitulo.id, ...RESUMEN_VACIO };
      return { ...prev, [altaTitulo.id]: { ...r, total: r.total + codigos.length, en_centro: r.en_centro + codigos.length } };
    });
  }

  function imprimirCreados() {
    if (!altaTitulo || !altaCreados?.length) return;
    const params = new URLSearchParams({
      titulo: altaTitulo.id,
      desde: altaCreados[0],
      hasta: altaCreados[altaCreados.length - 1],
    });
    router.push(`/gratuidad-libros-v2/etiquetas?${params}`);
  }

  // ── v1 import ───────────────────────────────────────────────────────────────

  async function handleImport() {
    if (!window.confirm("Se copiarán los títulos activos del módulo de Gratuidad v1 que aún no existan aquí, con su lote por nivel. ¿Continuar?")) return;
    setImportando(true);
    setImportMsg(null);
    try {
      const res = await fetch("/api/gratuidad-v2/importar-titulos", { method: "POST" });
      const body = (await res.json()) as ImportResult | { error: string };
      if (!res.ok || "error" in body) {
        setImportMsg("error" in body ? body.error : "Error al importar");
        return;
      }
      setTitulos((prev) => [...prev, ...body.titulos].sort((a, b) => a.titulo.localeCompare(b.titulo, "es")));
      setLotes((prev) => {
        const next = { ...prev };
        for (const l of body.lotes) next[l.titulo_id] = [...(next[l.titulo_id] ?? []), l.curso];
        return next;
      });
      setOptativos((prev) => {
        const next = { ...prev };
        for (const l of body.lotes) if (l.optativo) next[l.titulo_id] = true;
        return next;
      });
      setImportMsg(`${body.importados} títulos importados${body.omitidos ? `, ${body.omitidos} ya existían` : ""}.`);
    } catch {
      setImportMsg("Error de conexión al importar");
    } finally {
      setImportando(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Títulos" value={stats.titulos} hint="activos" />
        <Stat label="Sin lote" value={stats.sinLote} hint="sin cursos asignados" warn={stats.sinLote > 0} />
        <Stat label="Ejemplares" value={stats.ejemplares} hint="sin contar bajas" />
        <Stat label="En el centro" value={stats.enCentro} hint="disponibles" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
        <div className="relative flex-1 min-w-[12rem]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por título, asignatura, ISBN..."
            aria-label="Buscar títulos"
            className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filtroNivel}
          onChange={(e) => setFiltroNivel(e.target.value)}
          aria-label="Filtrar por nivel"
          className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white"
        >
          <option value="todos">Todos los niveles</option>
          {niveles.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <div className="flex gap-2">
          <button
            onClick={handleImport}
            disabled={importando}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 border border-gray-300 text-gray-600 text-sm font-medium px-3 py-2.5 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            {importando ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            Importar de v1
          </button>
          <button
            onClick={openNew}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg"
          >
            <Plus size={16} />
            Nuevo título
          </button>
        </div>
      </div>

      {importMsg && <p className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">{importMsg}</p>}

      <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer select-none w-fit -mt-2">
        <input type="checkbox" checked={mostrarArchivados} onChange={(e) => setMostrarArchivados(e.target.checked)} className="rounded" />
        Mostrar archivados
      </label>

      {/* List */}
      {visibles.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Library size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">{titulos.length === 0 ? "Aún no hay títulos" : "No hay resultados"}</p>
          {titulos.length === 0 && <p className="text-sm mt-1">Crea el primero o impórtalos del módulo v1.</p>}
        </div>
      ) : (
        <ul className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {visibles.map((t) => {
            const r = resumen[t.id] ?? { titulo_id: t.id, ...RESUMEN_VACIO };
            const lote = resumenLote(lotes[t.id] ?? [], cursos);
            return (
              <li key={t.id} className={`flex flex-col md:flex-row md:items-center gap-3 px-4 py-3 ${!t.activo ? "opacity-50" : ""}`}>
                <div className="min-w-0 flex-1">
                  <p className={`font-medium text-gray-900 text-sm ${!t.activo ? "line-through" : ""}`}>{t.titulo}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {[t.asignatura, t.editorial, t.isbn && `ISBN ${t.isbn}`, t.precio != null && `${t.precio.toFixed(2)} €`]
                      .filter(Boolean).join(" · ")}
                  </p>
                  <p className={`text-xs mt-1 ${lote ? "text-blue-700" : "text-amber-600"}`}>
                    {t.diversificacion && <DiversificacionBadge className="mr-1.5" />}
                    {optativos[t.id] && lote && <OptativoBadge className="mr-1.5" />}
                    {lote || "Sin lote asignado"}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs flex-wrap" aria-label="Ejemplares">
                  <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 font-semibold" title="Ejemplares (sin bajas)">
                    {r.total - r.baja} ej.
                  </span>
                  <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700" title="En el centro">{r.en_centro} centro</span>
                  <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700" title="Prestados">{r.prestado} prest.</span>
                  {r.perdido > 0 && <span className="px-2 py-1 rounded-full bg-red-50 text-red-700">{r.perdido} perd.</span>}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 -ml-2 md:ml-0">
                  <IconButton label="Añadir ejemplares" onClick={() => openAlta(t)} disabled={!t.activo} color="teal"><PackagePlus size={17} /></IconButton>
                  <IconButton label="Imprimir etiquetas" onClick={() => router.push(`/gratuidad-libros-v2/etiquetas?titulo=${t.id}`)} disabled={r.total === 0}><Tags size={17} /></IconButton>
                  <IconButton label="Editar" onClick={() => openEdit(t)}><Pencil size={16} /></IconButton>
                  <IconButton label={t.activo ? "Archivar" : "Restaurar"} onClick={() => toggleArchive(t)} color="amber">
                    {t.activo ? <Archive size={16} /> : <ArchiveRestore size={16} />}
                  </IconButton>
                  {r.total === 0 && (
                    <IconButton label="Eliminar" onClick={() => handleDelete(t)} color="red"><Trash2 size={16} /></IconButton>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Title modal */}
      {showForm && (
        <Modal
          titulo={editing ? "Editar título" : "Nuevo título"}
          onClose={() => setShowForm(false)}
          ancho="lg"
          footer={
            <>
              <button onClick={() => setShowForm(false)} className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <Field label="Título *">
              <input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} className={inputCls} autoFocus />
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Asignatura">
                <input value={form.asignatura} onChange={(e) => setForm({ ...form, asignatura: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Editorial">
                <input value={form.editorial} onChange={(e) => setForm({ ...form, editorial: e.target.value })} className={inputCls} />
              </Field>
              <Field label="ISBN">
                <input value={form.isbn} onChange={(e) => setForm({ ...form, isbn: e.target.value })} className={inputCls} inputMode="numeric" />
              </Field>
              <Field label="Precio (€)">
                <input value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} className={inputCls} inputMode="decimal" placeholder="0,00" />
              </Field>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Lote: cursos que usan este libro</p>
              <p className="text-xs text-gray-400 mb-2">Pulsa el nivel para marcar todos sus grupos, o elige grupos sueltos.</p>
              <CursosSelector cursos={cursos} seleccion={formCursos} onChange={setFormCursos} />
              <label className="flex items-start gap-2 mt-3 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.diversificacion}
                  onChange={(e) => {
                    setForm({ ...form, diversificacion: e.target.checked });
                    // A Diversificación book is only for some students of the course
                    if (e.target.checked) setFormOptativo(true);
                  }}
                  className="w-4 h-4 rounded mt-0.5"
                />
                <span>
                  Diversificación
                  <span className="block text-xs text-gray-400">Libro del programa de Diversificación curricular. Al marcarlo, también se marca como optativo.</span>
                </span>
              </label>
              <label className="flex items-start gap-2 mt-3 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={formOptativo} onChange={(e) => setFormOptativo(e.target.checked)} className="w-4 h-4 rounded mt-0.5" />
                <span>
                  Libro optativo
                  <span className="block text-xs text-gray-400">Solo lo usan algunos alumnos del curso (p. ej. Diversificación). No cuenta para completar el lote.</span>
                </span>
              </label>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        </Modal>
      )}

      {/* Add copies modal */}
      {altaTitulo && (
        <Modal
          titulo="Añadir ejemplares"
          onClose={() => setAltaTitulo(null)}
          footer={
            altaCreados ? (
              <>
                <button onClick={() => setAltaTitulo(null)} className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">Cerrar</button>
                <button onClick={imprimirCreados} className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-lg">
                  <Tags size={15} /> Imprimir etiquetas
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setAltaTitulo(null)} className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button onClick={handleAlta} disabled={saving} className="px-4 py-2.5 text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-lg disabled:opacity-50">
                  {saving ? "Creando..." : "Crear ejemplares"}
                </button>
              </>
            )
          }
        >
          <p className="text-sm font-medium text-gray-900 mb-4">{altaTitulo.titulo}</p>
          {altaCreados ? (
            <div className="flex items-start gap-3 text-sm">
              <CheckCircle2 className="text-emerald-600 flex-shrink-0" size={22} />
              <div>
                <p className="font-medium text-gray-900">{altaCreados.length} ejemplares creados</p>
                <p className="text-gray-500 mt-0.5 font-mono">
                  {altaCreados[0]}{altaCreados.length > 1 && ` … ${altaCreados[altaCreados.length - 1]}`}
                </p>
                <p className="text-gray-500 mt-2">Imprime ahora sus etiquetas y pégalas en los libros.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Cantidad">
                <input
                  type="number" min={1} max={500} value={altaCantidad}
                  onChange={(e) => setAltaCantidad(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAlta(); }}
                  className={inputCls} inputMode="numeric" autoFocus
                />
              </Field>
              <Field label="Estado">
                <select value={altaConservacion} onChange={(e) => setAltaConservacion(e.target.value as ConservacionV2)} className={inputCls}>
                  {(Object.keys(ETIQUETAS_CONSERVACION) as ConservacionV2[]).map((c) => (
                    <option key={c} value={c}>{ETIQUETAS_CONSERVACION[c]}</option>
                  ))}
                </select>
              </Field>
              {error && <p className="col-span-2 text-sm text-red-600">{error}</p>}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

// ─── Small UI pieces ──────────────────────────────────────────────────────────

const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
      {children}
    </label>
  );
}

function Stat({ label, value, hint, warn }: { label: string; value: number; hint: string; warn?: boolean }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase mb-2">{label}</p>
      <p className={`text-3xl font-bold ${warn ? "text-amber-600" : "text-gray-900"}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-1">{hint}</p>
    </div>
  );
}

const iconColors = {
  blue: "hover:text-blue-600 hover:bg-blue-50",
  teal: "hover:text-teal-700 hover:bg-teal-50",
  amber: "hover:text-amber-600 hover:bg-amber-50",
  red: "hover:text-red-600 hover:bg-red-50",
};

function IconButton({
  label, onClick, children, disabled, color = "blue",
}: { label: string; onClick: () => void; children: React.ReactNode; disabled?: boolean; color?: keyof typeof iconColors }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`p-2.5 text-gray-400 rounded-lg transition-colors disabled:opacity-30 disabled:pointer-events-none ${iconColors[color]}`}
    >
      {children}
    </button>
  );
}

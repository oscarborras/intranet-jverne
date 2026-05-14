"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { BookOpen, Plus, Pencil, Archive, ArchiveRestore, X, ChevronDown, ChevronUp, Download, Search } from "lucide-react";
import type { LibroCatalogo, PrestamoLibro } from "@/lib/types";

const NIVELES = [
  "1º ESO", "2º ESO", "3º ESO", "4º ESO",
  "1º Bach", "2º Bach",
  "FP Básica", "Otros",
];

const STOCK_BAJO_UMBRAL = 5;

interface Props {
  libros: LibroCatalogo[];
  prestamos: PrestamoLibro[];
}

const emptyForm = {
  titulo: "",
  editorial: "",
  isbn: "",
  asignatura: "",
  nivel: NIVELES[0],
  stock_total: 0,
  precio: "",
  diversificacion: false,
};

export function CatalogoLibrosClient({ libros: initial, prestamos }: Props) {
  const supabase = createClient();
  const [libros, setLibros] = useState<LibroCatalogo[]>(initial);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<LibroCatalogo | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtroNivel, setFiltroNivel] = useState<string>("todos");
  const [busqueda, setBusqueda] = useState("");
  const [mostrarArchivados, setMostrarArchivados] = useState(false);
  const [expandedNiveles, setExpandedNiveles] = useState<Set<string>>(new Set(NIVELES));

  // Niveles que realmente tienen libros (activos), en orden canónico
  const nivelesDisponibles = useMemo(() => {
    const set = new Set(libros.filter((l) => l.activo).map((l) => l.nivel));
    return NIVELES.filter((n) => set.has(n));
  }, [libros]);

  const librosVisibles = useMemo(() => {
    return libros.filter((l) => {
      if (!mostrarArchivados && !l.activo) return false;
      if (filtroNivel !== "todos" && l.nivel !== filtroNivel) return false;
      if (busqueda) {
        const q = busqueda.toLowerCase();
        return (
          l.titulo.toLowerCase().includes(q) ||
          (l.isbn ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [libros, filtroNivel, busqueda, mostrarArchivados]);

  // Active loans count per libro_id
  const loanCountsPerLibro = useMemo(() =>
    prestamos.reduce<Record<string, number>>((acc, p) => {
      acc[p.libro_id] = (acc[p.libro_id] ?? 0) + 1;
      return acc;
    }, {}),
  [prestamos]);

  // ── Stats ────────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const activos = librosVisibles.filter((l) => l.activo);
    const totalEjemplares = activos.reduce((sum, l) => sum + l.stock_total, 0);
    const stockBajo = activos.filter((l) => l.stock_total < STOCK_BAJO_UMBRAL).length;
    const totalEntregados = activos.reduce((sum, l) => sum + (loanCountsPerLibro[l.id] ?? 0), 0);

    return { titulos: activos.length, totalEjemplares, stockBajo, totalEntregados };
  }, [librosVisibles, loanCountsPerLibro]);

  const porNivel = useMemo(() => {
    return librosVisibles.reduce<Record<string, LibroCatalogo[]>>((acc, l) => {
      if (!acc[l.nivel]) acc[l.nivel] = [];
      acc[l.nivel].push(l);
      return acc;
    }, {});
  }, [librosVisibles]);

  const nivelesConLibros = Object.keys(porNivel).sort(
    (a, b) => NIVELES.indexOf(a) - NIVELES.indexOf(b)
  );

  // ── CSV export ───────────────────────────────────────────────────────────────
  function exportarCSV() {
    const headers = ["Título", "Asignatura", "Nivel", "Editorial", "ISBN", "Precio (€)", "Ejemplares", "Diversificación", "Activo"];
    const rows = librosVisibles.map((l) => [
      l.titulo, l.asignatura, l.nivel, l.editorial ?? "", l.isbn ?? "",
      l.precio != null ? l.precio.toFixed(2) : "",
      l.stock_total, l.diversificacion ? "Sí" : "No", l.activo ? "Sí" : "No",
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventario_libros.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── CRUD helpers ─────────────────────────────────────────────────────────────
  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setShowModal(true);
  }

  function openEdit(libro: LibroCatalogo) {
    setEditing(libro);
    setForm({
      titulo: libro.titulo,
      editorial: libro.editorial ?? "",
      isbn: libro.isbn ?? "",
      asignatura: libro.asignatura,
      nivel: libro.nivel,
      stock_total: libro.stock_total,
      precio: libro.precio != null ? String(libro.precio) : "",
      diversificacion: libro.diversificacion,
    });
    setError(null);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditing(null);
    setError(null);
  }

  async function handleSave() {
    if (!form.titulo.trim() || !form.asignatura.trim() || !form.nivel) {
      setError("Título, asignatura y nivel son obligatorios.");
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      titulo: form.titulo.trim(),
      editorial: form.editorial.trim() || null,
      isbn: form.isbn.trim() || null,
      asignatura: form.asignatura.trim(),
      nivel: form.nivel,
      stock_total: Number(form.stock_total),
      precio: form.precio.trim() !== "" ? Number(form.precio) : null,
      diversificacion: form.diversificacion,
    };

    if (editing) {
      const { error: err } = await supabase
        .from("libros_catalogo")
        .update(payload)
        .eq("id", editing.id);
      if (err) { setError(err.message); setSaving(false); return; }
      setLibros((prev) => prev.map((l) => l.id === editing.id ? { ...l, ...payload } : l));
    } else {
      const { data, error: err } = await supabase
        .from("libros_catalogo")
        .insert(payload)
        .select()
        .single();
      if (err || !data) { setError(err?.message ?? "Error al guardar"); setSaving(false); return; }
      setLibros((prev) => [...prev, data as LibroCatalogo]);
    }

    setSaving(false);
    closeModal();
  }

  async function toggleArchive(libro: LibroCatalogo) {
    const { error: err } = await supabase
      .from("libros_catalogo")
      .update({ activo: !libro.activo })
      .eq("id", libro.id);
    if (!err) {
      setLibros((prev) => prev.map((l) => l.id === libro.id ? { ...l, activo: !libro.activo } : l));
    }
  }

  function toggleNivel(nivel: string) {
    setExpandedNiveles((prev) => {
      const next = new Set(prev);
      if (next.has(nivel)) next.delete(nivel);
      else next.add(nivel);
      return next;
    });
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Cabecera */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Inventario de libros</h1>
        <p className="text-sm text-gray-500 mt-0.5">Ejemplares del centro por curso y materia.</p>
      </div>

      {/* Widgets de stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase mb-2">Títulos</p>
          <p className="text-3xl font-bold text-gray-900">{stats.titulos}</p>
          <p className="text-xs text-gray-400 mt-1">en el catálogo{filtroNivel !== "todos" ? " filtrado" : ""}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase mb-2">Ejemplares</p>
          <p className="text-3xl font-bold text-gray-900">{stats.totalEjemplares}</p>
          <p className="text-xs text-gray-400 mt-1">total en el centro</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase mb-2">Stock bajo</p>
          <p className={`text-3xl font-bold ${stats.stockBajo > 0 ? "text-red-600" : "text-gray-900"}`}>
            {stats.stockBajo}
          </p>
          <p className="text-xs text-gray-400 mt-1">títulos por debajo de {STOCK_BAJO_UMBRAL} ejemplares</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase mb-2">Entregados</p>
          <p className="text-3xl font-bold text-gray-900">{stats.totalEntregados}</p>
          <p className="text-xs text-gray-400 mt-1">préstamos activos este curso</p>
        </div>
      </div>

      {/* Barra de filtros */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Pills de nivel */}
        <div className="flex flex-wrap gap-1.5 flex-1">
          <button
            onClick={() => setFiltroNivel("todos")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filtroNivel === "todos"
                ? "bg-gray-900 text-white"
                : "bg-white border border-gray-300 text-gray-600 hover:border-gray-400"
            }`}
          >
            Todos los cursos
          </button>
          {nivelesDisponibles.map((n) => (
            <button
              key={n}
              onClick={() => setFiltroNivel(n)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filtroNivel === n
                  ? "bg-gray-900 text-white"
                  : "bg-white border border-gray-300 text-gray-600 hover:border-gray-400"
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        {/* Buscador */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="ISBN, título..."
            className="border border-gray-300 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-44"
          />
        </div>

        {/* CSV */}
        <button
          onClick={exportarCSV}
          title="Exportar CSV"
          className="flex items-center gap-1.5 border border-gray-300 text-gray-600 text-sm font-medium px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Download size={14} />
          CSV
        </button>

        {/* Añadir libro */}
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={15} />
          Nuevo libro
        </button>
      </div>

      {/* Mostrar archivados (opción secundaria) */}
      <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer select-none w-fit -mt-2">
        <input
          type="checkbox"
          checked={mostrarArchivados}
          onChange={(e) => setMostrarArchivados(e.target.checked)}
          className="rounded"
        />
        Mostrar archivados
      </label>

      {/* Lista por nivel */}
      {nivelesConLibros.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <BookOpen size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">
            {libros.length === 0 ? "No hay libros en el inventario" : "No hay resultados para la búsqueda"}
          </p>
          {libros.length === 0 && (
            <p className="text-sm mt-1">Añade el primer libro con el botón «Nuevo libro»</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {nivelesConLibros.map((nivel) => {
            const isExpanded = expandedNiveles.has(nivel);
            const items = porNivel[nivel];
            return (
              <div key={nivel} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleNivel(nivel)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left bg-blue-100 hover:bg-blue-200 transition-colors"
                >
                  <span className="font-semibold text-blue-900">{nivel}</span>
                  <span className="flex items-center gap-2 text-sm text-blue-600">
                    {items.length} {items.length === 1 ? "título" : "títulos"}
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </span>
                </button>
                {isExpanded && (
                  <div className="divide-y divide-gray-100">
                    {items.map((libro) => (
                      <div
                        key={libro.id}
                        className={`flex items-start justify-between gap-3 px-4 py-3 ${!libro.activo ? "opacity-50" : ""}`}
                      >
                        <div className="min-w-0">
                          <p className={`font-medium text-gray-900 text-sm ${!libro.activo ? "line-through" : ""}`}>
                            {libro.titulo}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {libro.asignatura}
                            {libro.editorial && <> · {libro.editorial}</>}
                            {libro.isbn && <> · ISBN: {libro.isbn}</>}
                            {libro.precio != null && <> · <span className="font-medium">{libro.precio.toFixed(2)} €</span></>}
                          </p>
                          {libro.diversificacion && (
                            <span className="inline-block mt-1 text-[10px] font-semibold tracking-wide uppercase px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                              Diversificación
                            </span>
                          )}
                          <p className={`text-xs mt-0.5 font-medium ${libro.stock_total < STOCK_BAJO_UMBRAL && libro.activo ? "text-red-500" : "text-gray-400"}`}>
                            Stock: {libro.stock_total - (loanCountsPerLibro[libro.id] ?? 0)} / {libro.stock_total}
                            {libro.stock_total < STOCK_BAJO_UMBRAL && libro.activo && " · stock bajo"}
                          </p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => openEdit(libro)}
                            title="Editar"
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => toggleArchive(libro)}
                            title={libro.activo ? "Archivar" : "Restaurar"}
                            className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          >
                            {libro.activo ? <Archive size={15} /> : <ArchiveRestore size={15} />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="font-semibold text-gray-900">
                {editing ? "Editar libro" : "Nuevo libro"}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={20} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
                <input
                  type="text"
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nombre del libro"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Asignatura *</label>
                  <input
                    type="text"
                    value={form.asignatura}
                    onChange={(e) => setForm({ ...form, asignatura: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Matemáticas"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nivel *</label>
                  <select
                    value={form.nivel}
                    onChange={(e) => setForm({ ...form, nivel: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {NIVELES.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Editorial</label>
                  <input
                    type="text"
                    value={form.editorial}
                    onChange={(e) => setForm({ ...form, editorial: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Oxford"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ISBN</label>
                  <input
                    type="text"
                    value={form.isbn}
                    onChange={(e) => setForm({ ...form, isbn: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="978-..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nº de ejemplares
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.stock_total}
                    onChange={(e) => setForm({ ...form, stock_total: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Precio (€)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.precio}
                    onChange={(e) => setForm({ ...form, precio: e.target.value })}
                    placeholder="0.00"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.diversificacion}
                  onChange={(e) => setForm({ ...form, diversificacion: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span className="text-sm font-medium text-gray-700">Libro de diversificación</span>
              </label>
            </div>

            <div className="flex gap-3 px-5 py-4 border-t">
              <button
                onClick={closeModal}
                className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

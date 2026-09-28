"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { Wrench, Plus, Camera, X, BarChart3, MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { KanbanFilters } from "@/components/kanban/KanbanFilters";
import { useKanbanFilters } from "@/components/kanban/useKanbanFilters";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import { filterKanbanItems, isKanbanFilterActive } from "@/lib/kanbanFilters";
import { VerFotoButton } from "@/components/VerFotoButton";
import { uploadIncidenciaFoto } from "@/lib/uploadIncidenciaFoto";
import { applyFinalizadaAt, finalizadasColumnInfo } from "@/lib/peticiones";
import type { PeticionMantenimiento, PeticionMantenimientoEstado, PeticionPrioridad } from "@/lib/types";
import type { KanbanItem, ColumnConfig } from "@/components/kanban/KanbanBoard";

const COLUMNS: ColumnConfig<PeticionMantenimientoEstado>[] = [
  { key: "por_validar", label: "Por Validar", color: "bg-gray-50", headerColor: "bg-gray-500" },
  { key: "abierta", label: "Abiertas", color: "bg-red-50", headerColor: "bg-red-500" },
  { key: "en_progreso", label: "En Progreso", color: "bg-yellow-50", headerColor: "bg-yellow-500" },
  { key: "finalizada", label: "Finalizadas", color: "bg-green-50", headerColor: "bg-green-600", sortBy: "finalizada_at" },
];

interface Props {
  initialPeticiones: PeticionMantenimiento[];
  canValidate: boolean;
  userId: string;
  myDisplayName: string;
  diasVistaFinalizadas: number;
  finalizadasAntiguas: number;
}

interface FormState {
  titulo: string;
  descripcion: string;
  ubicacion: string;
  prioridad: PeticionPrioridad;
}

const EMPTY_FORM: FormState = { titulo: "", descripcion: "", ubicacion: "", prioridad: "normal" };

// Notes written by external technicians from their portal (read-only here)
interface NotaMantenimiento {
  id: number;
  autor_nombre: string;
  contenido: string;
  created_at: string;
}

const notaDateFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid",
});

export function PeticionesMantenimientoClient({
  initialPeticiones, canValidate, userId, myDisplayName, diasVistaFinalizadas, finalizadasAntiguas,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [peticiones, setPeticiones] = useState<PeticionMantenimiento[]>(initialPeticiones);

  // Keep the board current (e.g. changes made by the external technician from the portal):
  // refresh the server data every minute and when coming back to the tab, then adopt it
  useAutoRefresh();
  useEffect(() => {
    setPeticiones(initialPeticiones);
  }, [initialPeticiones]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PeticionMantenimiento | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [foto, setFoto] = useState<File | null>(null);
  const fotoInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [notas, setNotas] = useState<NotaMantenimiento[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  // Status chosen in the edit modal (only shown to Admin/Directiva)
  const [estado, setEstado] = useState<PeticionMantenimientoEstado>("por_validar");

  useEffect(() => {
    if (searchParams.get("nueva") === "1") {
      setEditing(null);
      setForm(EMPTY_FORM);
      setShowForm(true);
      router.replace(pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function closeForm() {
    setFormError(null);
    setShowForm(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setFoto(null);
    if (fotoInputRef.current) fotoInputRef.current.value = "";
  }

  function canEditItem(item: KanbanItem): boolean {
    return canValidate || item.autor_id === userId;
  }

  function openEdit(item: PeticionMantenimiento) {
    setEditing(item);
    setForm({ titulo: item.titulo, descripcion: item.descripcion, ubicacion: item.ubicacion, prioridad: item.prioridad });
    setEstado(item.estado);
    setNotas([]);
    setShowForm(true);
    createClient()
      .from("peticiones_mantenimiento_notas")
      .select("id, autor_nombre, contenido, created_at")
      .eq("peticion_id", item.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => setNotas((data ?? []) as NotaMantenimiento[]));
  }

  const [filters, setFilters] = useKanbanFilters();
  const filtrosActivos = isKanbanFilterActive(filters);
  const enTablero = peticiones.filter((p) => COLUMNS.some((c) => c.key === p.estado));
  const filtradas = filterKanbanItems(
    enTablero, filters, userId,
    (p) => `${p.codigo} ${p.titulo} ${p.descripcion ?? ""} ${p.ubicacion ?? ""}`
  );
  const items: KanbanItem[] = filtradas.map((p) => ({ ...p, tipo: "MNT" as const }));
  // The history has its own search: pass the typed text on
  const busqueda = filters.q.trim();
  const recientes = peticiones.filter((p) => p.estado === "finalizada").length;
  const columnInfo = {
    finalizada: finalizadasColumnInfo(diasVistaFinalizadas, recientes, finalizadasAntiguas, `/peticiones-mantenimiento/historial${busqueda ? `?q=${encodeURIComponent(busqueda)}` : ""}`),
  };

  async function handleStatusChange(id: number, newStatus: PeticionMantenimientoEstado) {
    const supabase = createClient();
    const updates: Partial<PeticionMantenimiento> = { estado: newStatus };
    if (newStatus === "abierta") updates.validado_por = userId;
    await supabase.from("peticiones_mantenimiento").update(updates).eq("id", id);
    setPeticiones((prev) =>
      prev.map((p) => (p.id === id ? applyFinalizadaAt(p, { ...p, ...updates }) : p))
    );
  }

  function canDeleteItem(item: KanbanItem): boolean {
    return canValidate || item.autor_id === userId;
  }

  async function handleDelete(item: KanbanItem) {
    const supabase = createClient();
    await supabase.from("peticiones_mantenimiento").update({ estado: "eliminada" }).eq("id", item.id);
    setPeticiones((prev) => prev.map((p) => (p.id === item.id ? { ...p, estado: "eliminada" } : p)));
  }

  async function handleSave() {
    // Both fields are required by the API: say so instead of silently ignoring the click
    if (!form.titulo.trim() || !form.ubicacion.trim()) {
      setFormError("El título y la ubicación son obligatorios.");
      return;
    }
    setFormError(null);
    setSaving(true);
    const supabase = createClient();

    let fotoUpdate: { foto_path: string; foto_nombre: string } | null = null;
    if (foto) {
      fotoUpdate = await uploadIncidenciaFoto(supabase, userId, foto);
    }

    if (editing) {
      // Same side effects as moving the card on the board
      const estadoUpdate: Partial<PeticionMantenimiento> = {};
      if (canValidate && estado !== editing.estado) {
        estadoUpdate.estado = estado;
        if (estado === "abierta") estadoUpdate.validado_por = userId;
      }
      const { data, error } = await supabase
        .from("peticiones_mantenimiento")
        .update({ ...form, ...(fotoUpdate ?? {}), ...estadoUpdate })
        .eq("id", editing.id)
        .select()
        .single();
      if (error || !data) {
        setFormError("No se han podido guardar los cambios. Inténtalo de nuevo.");
        setSaving(false);
        return;
      }
      // The returned row already carries finalizada_at, set by the DB trigger
      setPeticiones((prev) => prev.map((p) => (p.id === editing.id ? { ...p, ...(data as PeticionMantenimiento) } : p)));
    } else {
      // Created server-side so the configured profiles get the email notification
      const res = await fetch("/api/peticiones-mantenimiento/crear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, foto_path: fotoUpdate?.foto_path ?? null, foto_nombre: fotoUpdate?.foto_nombre ?? null }),
      });
      if (!res.ok) {
        // Keep the form open with what was typed, and show why it failed
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setFormError(data.error ?? "No se ha podido crear la petición. Inténtalo de nuevo.");
        setSaving(false);
        return;
      }
      const { peticion } = (await res.json()) as { peticion: PeticionMantenimiento };
      setPeticiones((prev) => [{ ...peticion, autor: { full_name: myDisplayName } }, ...prev]);
    }

    setSaving(false);
    closeForm();
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Wrench size={24} className="text-red-500" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Peticiones Mantenimiento</h1>
            <p className="text-sm text-gray-500">Sistema de peticiones de mantenimiento</p>
          </div>
        </div>
        <div className="flex gap-2">
          {canValidate && (
            <Link
              href="/peticiones-mantenimiento/estadisticas"
              className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <BarChart3 size={16} />
              Estadísticas
            </Link>
          )}
          <Link
            href="/nueva-incidencia"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            Nueva Petición
          </Link>
        </div>
      </div>

      <KanbanFilters
        value={filters}
        onChange={setFilters}
        shown={filtradas.length}
        total={enTablero.length}
        searchPlaceholder="Buscar por código, título, descripción o ubicación"
      />

      {/* Kanban */}
      <KanbanBoard
        columns={COLUMNS}
        items={items}
        emptyMessage={filtrosActivos ? "Ninguna petición coincide con los filtros" : undefined}
        onStatusChange={handleStatusChange}
        showStatusChange={canValidate}
        canDeleteItem={canDeleteItem}
        onDeleteItem={handleDelete}
        columnInfo={columnInfo}
        onItemClick={(item) => { if (canEditItem(item)) openEdit(item as PeticionMantenimiento); }}
      />

      {/* New petición modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">
                {editing ? "Editar Petición de Mantenimiento" : "Nueva Petición de Mantenimiento"}
              </h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título <span className="text-red-500">*</span></label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.titulo}
                  onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                  placeholder="Describe el problema brevemente"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación <span className="text-red-500">*</span></label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.ubicacion}
                  onChange={(e) => setForm((f) => ({ ...f, ubicacion: e.target.value }))}
                  placeholder="Aula, planta, zona..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  value={form.descripcion}
                  onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                  placeholder="Explica el problema con detalle..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.prioridad}
                  onChange={(e) => setForm((f) => ({ ...f, prioridad: e.target.value as PeticionPrioridad }))}
                >
                  <option value="baja">Baja</option>
                  <option value="normal">Normal</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>
              {editing && canValidate && (
                <div>
                  <label htmlFor="estado-mantenimiento" className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <select
                    id="estado-mantenimiento"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={estado}
                    onChange={(e) => setEstado(e.target.value as PeticionMantenimientoEstado)}
                  >
                    {COLUMNS.map((c) => (
                      <option key={c.key} value={c.key}>{c.label}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Foto <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                {editing?.foto_path && !foto && (
                  <div className="mb-2">
                    <VerFotoButton path={editing.foto_path} nombre={editing.foto_nombre ?? undefined} />
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                    <Camera size={14} className="text-gray-400" />
                    {foto ? foto.name : editing?.foto_path ? "Sustituir foto" : "Hacer foto o elegir imagen"}
                    <input
                      ref={fotoInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  {foto && (
                    <button
                      type="button"
                      onClick={() => { setFoto(null); if (fotoInputRef.current) fotoInputRef.current.value = ""; }}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
              {editing && notas.length > 0 && (
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                    <MessageSquare size={14} className="text-gray-400" /> Notas del técnico externo
                  </p>
                  <ul className="space-y-2 max-h-48 overflow-y-auto">
                    {notas.map((n) => (
                      <li key={n.id} className="bg-gray-50 rounded-lg px-3 py-2">
                        <p className="text-sm text-gray-800 whitespace-pre-line">{n.contenido}</p>
                        <p className="text-[11px] text-gray-400 mt-1">{n.autor_nombre} · {notaDateFormatter.format(new Date(n.created_at))}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {formError && (
              <p role="alert" className="mx-6 mb-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {formError}
              </p>
            )}
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={closeForm} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium"
              >
                {saving ? "Guardando..." : editing ? "Guardar Cambios" : "Crear Petición"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

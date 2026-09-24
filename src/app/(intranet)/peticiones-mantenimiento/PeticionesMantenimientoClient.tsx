"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { Wrench, Plus, Camera, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { VerFotoButton } from "@/components/VerFotoButton";
import { uploadIncidenciaFoto } from "@/lib/uploadIncidenciaFoto";
import { applyFinalizadaAt, finalizadasColumnInfo } from "@/lib/peticiones";
import type { PeticionMantenimiento, PeticionMantenimientoEstado, PeticionPrioridad } from "@/lib/types";
import type { KanbanItem, ColumnConfig } from "@/components/kanban/KanbanBoard";

const COLUMNS: ColumnConfig<PeticionMantenimientoEstado>[] = [
  { key: "por_validar", label: "Por Validar", color: "bg-gray-50", headerColor: "bg-gray-500" },
  { key: "abierta", label: "Abiertas", color: "bg-red-50", headerColor: "bg-red-500" },
  { key: "en_progreso", label: "En Progreso", color: "bg-yellow-50", headerColor: "bg-yellow-500" },
  { key: "finalizada", label: "Finalizadas", color: "bg-green-50", headerColor: "bg-green-600" },
];

interface Props {
  initialPeticiones: PeticionMantenimiento[];
  canValidate: boolean;
  isAdmin: boolean;
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

export function PeticionesMantenimientoClient({
  initialPeticiones, canValidate, isAdmin, userId, myDisplayName, diasVistaFinalizadas, finalizadasAntiguas,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [peticiones, setPeticiones] = useState<PeticionMantenimiento[]>(initialPeticiones);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PeticionMantenimiento | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [foto, setFoto] = useState<File | null>(null);
  const fotoInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);

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
    setShowForm(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setFoto(null);
    if (fotoInputRef.current) fotoInputRef.current.value = "";
  }

  function canEditItem(item: KanbanItem): boolean {
    return isAdmin || item.autor_id === userId;
  }

  function openEdit(item: PeticionMantenimiento) {
    setEditing(item);
    setForm({ titulo: item.titulo, descripcion: item.descripcion, ubicacion: item.ubicacion, prioridad: item.prioridad });
    setShowForm(true);
  }

  const items: KanbanItem[] = peticiones.map((p) => ({ ...p, tipo: "MNT" as const }));
  const recientes = peticiones.filter((p) => p.estado === "finalizada").length;
  const columnInfo = {
    finalizada: finalizadasColumnInfo(diasVistaFinalizadas, recientes, finalizadasAntiguas, "/peticiones-mantenimiento/historial"),
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
    if (!form.titulo.trim() || !form.ubicacion.trim()) return;
    setSaving(true);
    const supabase = createClient();

    let fotoUpdate: { foto_path: string; foto_nombre: string } | null = null;
    if (foto) {
      fotoUpdate = await uploadIncidenciaFoto(supabase, userId, foto);
    }

    if (editing) {
      const { data } = await supabase
        .from("peticiones_mantenimiento")
        .update({ ...form, ...(fotoUpdate ?? {}) })
        .eq("id", editing.id)
        .select()
        .single();
      if (data) {
        setPeticiones((prev) => prev.map((p) => (p.id === editing.id ? { ...p, ...(data as PeticionMantenimiento) } : p)));
      }
    } else {
      // Created server-side so the configured profiles get the email notification
      const res = await fetch("/api/peticiones-mantenimiento/crear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, foto_path: fotoUpdate?.foto_path ?? null, foto_nombre: fotoUpdate?.foto_nombre ?? null }),
      });
      if (res.ok) {
        const { peticion } = (await res.json()) as { peticion: PeticionMantenimiento };
        setPeticiones((prev) => [{ ...peticion, autor: { full_name: myDisplayName } }, ...prev]);
      }
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
            <button className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              Reportes
            </button>
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

      {/* Kanban */}
      <KanbanBoard
        columns={COLUMNS}
        items={items}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.titulo}
                  onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                  placeholder="Describe el problema brevemente"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
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
            </div>
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

"use client";

import { useState } from "react";
import { Wrench, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
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
  userId: string;
}

interface FormState {
  titulo: string;
  descripcion: string;
  ubicacion: string;
  prioridad: PeticionPrioridad;
}

export function PeticionesMantenimientoClient({ initialPeticiones, canValidate, userId }: Props) {
  const [peticiones, setPeticiones] = useState<PeticionMantenimiento[]>(initialPeticiones);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>({ titulo: "", descripcion: "", ubicacion: "", prioridad: "normal" });
  const [saving, setSaving] = useState(false);

  const items: KanbanItem[] = peticiones.map((p) => ({ ...p, tipo: "MNT" as const }));

  async function handleStatusChange(id: number, newStatus: PeticionMantenimientoEstado) {
    const supabase = createClient();
    const updates: Partial<PeticionMantenimiento> = { estado: newStatus };
    if (newStatus === "abierta") updates.validado_por = userId;
    await supabase.from("peticiones_mantenimiento").update(updates).eq("id", id);
    setPeticiones((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  }

  async function handleCreate() {
    if (!form.titulo.trim() || !form.ubicacion.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("peticiones_mantenimiento")
      .insert({ ...form, autor_id: userId })
      .select()
      .single();
    if (data) setPeticiones((prev) => [data as PeticionMantenimiento, ...prev]);
    setSaving(false);
    setShowForm(false);
    setForm({ titulo: "", descripcion: "", ubicacion: "", prioridad: "normal" });
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
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            Nueva Petición
          </button>
        </div>
      </div>

      {/* Kanban */}
      <KanbanBoard
        columns={COLUMNS}
        items={items}
        onStatusChange={handleStatusChange}
      />

      {/* New petición modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Nueva Petición de Mantenimiento</h2>
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
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium"
              >
                {saving ? "Creando..." : "Crear Petición"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

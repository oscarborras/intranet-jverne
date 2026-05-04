"use client";

import { useState } from "react";
import { Plus, Edit2, Trash2, Megaphone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Anuncio, AnuncioPrioridad } from "@/lib/types";

const priorityConfig: Record<AnuncioPrioridad, { label: string; cls: string }> = {
  normal: { label: "Normal", cls: "bg-blue-100 text-blue-700 border-blue-200" },
  importante: { label: "Importante", cls: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  urgente: { label: "Urgente", cls: "bg-red-100 text-red-700 border-red-200" },
};

interface Props {
  initialAnuncios: Anuncio[];
  canManage: boolean;
  userId: string;
}

interface FormState {
  titulo: string;
  contenido: string;
  prioridad: AnuncioPrioridad;
  visible_hasta: string;
}

const emptyForm: FormState = { titulo: "", contenido: "", prioridad: "normal", visible_hasta: "" };

export function AnunciosClient({ initialAnuncios, canManage, userId }: Props) {
  const [anuncios, setAnuncios] = useState<Anuncio[]>(initialAnuncios);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Anuncio | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(a: Anuncio) {
    setEditing(a);
    setForm({
      titulo: a.titulo,
      contenido: a.contenido,
      prioridad: a.prioridad,
      visible_hasta: a.visible_hasta ?? "",
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.titulo.trim() || !form.contenido.trim()) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();

    if (editing) {
      const { error: err } = await supabase
        .from("anuncios")
        .update({
          titulo: form.titulo,
          contenido: form.contenido,
          prioridad: form.prioridad,
          visible_hasta: form.visible_hasta || null,
        })
        .eq("id", editing.id);

      if (err) { setError("Error al actualizar el anuncio"); setSaving(false); return; }
      setAnuncios((prev) =>
        prev.map((a) => a.id === editing.id ? { ...a, ...form } : a)
      );
    } else {
      const { data, error: err } = await supabase
        .from("anuncios")
        .insert({
          titulo: form.titulo,
          contenido: form.contenido,
          prioridad: form.prioridad,
          visible_hasta: form.visible_hasta || null,
          autor_id: userId,
        })
        .select()
        .single();

      if (err || !data) { setError("Error al crear el anuncio"); setSaving(false); return; }
      setAnuncios((prev) => [data as Anuncio, ...prev]);
    }

    setSaving(false);
    setShowForm(false);
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar este anuncio?")) return;
    const supabase = createClient();
    await supabase.from("anuncios").delete().eq("id", id);
    setAnuncios((prev) => prev.filter((a) => a.id !== id));
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Megaphone size={24} className="text-blue-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Tablón de Anuncios</h1>
            <p className="text-sm text-gray-500">Noticias y comunicados del centro</p>
          </div>
        </div>
        {canManage && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            Nuevo Anuncio
          </button>
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">{editing ? "Editar anuncio" : "Nuevo anuncio"}</h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.titulo}
                  onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                  placeholder="Título del anuncio"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contenido</label>
                <textarea
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  value={form.contenido}
                  onChange={(e) => setForm((f) => ({ ...f, contenido: e.target.value }))}
                  placeholder="Contenido del anuncio..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.prioridad}
                    onChange={(e) => setForm((f) => ({ ...f, prioridad: e.target.value as AnuncioPrioridad }))}
                  >
                    <option value="normal">Normal</option>
                    <option value="importante">Importante</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Visible hasta</label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.visible_hasta}
                    onChange={(e) => setForm((f) => ({ ...f, visible_hasta: e.target.value }))}
                  />
                </div>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {anuncios.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 py-16 text-center text-gray-400">
          No hay anuncios publicados
        </div>
      ) : (
        <div className="space-y-3">
          {anuncios.map((a) => {
            const pc = priorityConfig[a.prioridad];
            return (
              <div key={a.id} className="bg-white rounded-xl border border-gray-100 px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium flex-shrink-0 ${pc.cls}`}>
                      {pc.label}
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm">{a.titulo}</h3>
                      <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{a.contenido}</p>
                      <p className="text-xs text-gray-400 mt-2">{formatDate(a.created_at)}</p>
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => openEdit(a)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

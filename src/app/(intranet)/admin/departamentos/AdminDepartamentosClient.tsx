"use client";

import { useState } from "react";
import { Building, Plus, Edit2, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Departamento } from "@/lib/types";

interface Props {
  initialDepartamentos: Departamento[];
  initialMiembros: { user_id: string; departamento_id: number }[];
  users: { id: string; full_name: string; email: string }[];
}

export function AdminDepartamentosClient({ initialDepartamentos, initialMiembros, users }: Props) {
  const [departamentos, setDepartamentos] = useState<Departamento[]>(initialDepartamentos);
  const [miembros, setMiembros] = useState(initialMiembros);
  const [showForm, setShowForm] = useState(false);
  const [editDept, setEditDept] = useState<Departamento | null>(null);
  const [showMiembros, setShowMiembros] = useState<number | null>(null);
  const [form, setForm] = useState({ nombre: "", codigo: "" });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.nombre.trim() || !form.codigo.trim()) return;
    setSaving(true);
    const supabase = createClient();

    if (editDept) {
      const { data } = await supabase
        .from("departamentos")
        .update({ nombre: form.nombre, codigo: form.codigo })
        .eq("id", editDept.id)
        .select()
        .single();
      if (data) setDepartamentos((prev) => prev.map((d) => d.id === editDept.id ? data as Departamento : d));
    } else {
      const { data } = await supabase
        .from("departamentos")
        .insert({ nombre: form.nombre, codigo: form.codigo })
        .select()
        .single();
      if (data) setDepartamentos((prev) => [...prev, data as Departamento]);
    }
    setSaving(false);
    setShowForm(false);
    setEditDept(null);
    setForm({ nombre: "", codigo: "" });
  }

  async function toggleMiembro(deptId: number, userId: string) {
    const supabase = createClient();
    const existing = miembros.find((m) => m.departamento_id === deptId && m.user_id === userId);
    if (existing) {
      await supabase.from("departamento_miembros").delete()
        .eq("departamento_id", deptId).eq("user_id", userId);
      setMiembros((prev) => prev.filter((m) => !(m.departamento_id === deptId && m.user_id === userId)));
    } else {
      await supabase.from("departamento_miembros").insert({ departamento_id: deptId, user_id: userId });
      setMiembros((prev) => [...prev, { departamento_id: deptId, user_id: userId }]);
    }
  }

  function getDeptMiembros(deptId: number) {
    return miembros.filter((m) => m.departamento_id === deptId);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building size={24} className="text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900">Gestión de Departamentos</h1>
        </div>
        <button
          onClick={() => { setEditDept(null); setForm({ nombre: "", codigo: "" }); setShowForm(true); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          <Plus size={16} />
          Nuevo Departamento
        </button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold">{editDept ? "Editar departamento" : "Nuevo departamento"}</h2>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Informática" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.codigo} onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))} placeholder="Ej: INF" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:bg-blue-400">
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Departments grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {departamentos.length === 0 ? (
          <p className="col-span-full text-center text-gray-400 py-12">No hay departamentos creados</p>
        ) : (
          departamentos.map((d) => {
            const deptMiembros = getDeptMiembros(d.id);
            return (
              <div key={d.id} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="mb-3">
                  <h3 className="font-semibold text-gray-900">{d.nombre}</h3>
                  <p className="text-xs text-gray-500">{d.codigo}</p>
                  <div className="flex items-center gap-1 mt-2 text-sm text-gray-500">
                    <Users size={14} />
                    <span>{deptMiembros.length} miembros</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowMiembros(showMiembros === d.id ? null : d.id)}
                  className="w-full flex items-center justify-center gap-2 border border-gray-200 hover:border-blue-400 hover:text-blue-600 rounded-lg py-2 text-sm transition-colors"
                >
                  <Edit2 size={13} />
                  Editar y Miembros
                </button>

                {showMiembros === d.id && (
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-1 max-h-48 overflow-y-auto">
                    {users.map((u) => {
                      const isMember = deptMiembros.some((m) => m.user_id === u.id);
                      return (
                        <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 px-1 py-1 rounded">
                          <input
                            type="checkbox"
                            checked={isMember}
                            onChange={() => toggleMiembro(d.id, u.id)}
                            className="rounded"
                          />
                          <span className="truncate">{u.full_name || u.email}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

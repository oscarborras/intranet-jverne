"use client";

import { useState } from "react";
import { BookOpen, Settings, Plus, Pencil, Trash2, X, Check, CalendarRange } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ReservaGrid, type Reservation, type ReservationClickData } from "@/components/calendar/ReservaGrid";
import { ReservaDetailModal } from "@/components/calendar/ReservaDetailModal";
import { ReservaBulkModal, type BulkSlot } from "@/components/calendar/ReservaBulkModal";
import type { Recurso, ReservaRecurso, TramoHorario } from "@/lib/types";

interface Props {
  recursos: Recurso[];
  initialReservas: ReservaRecurso[];
  tramos: TramoHorario[];
  userId: string;
  isAdmin: boolean;
  canBulkReserve: boolean;
  userNames: Record<string, string>;
  currentUserName: string;
}

interface RecursoForm {
  nombre: string;
  ubicacion: string;
  descripcion: string;
  activo: boolean;
}

const emptyForm: RecursoForm = { nombre: "", ubicacion: "", descripcion: "", activo: true };

export function ReservaRecursosClient({
  recursos: initialRecursos, initialReservas, tramos,
  userId, isAdmin, canBulkReserve, userNames, currentUserName,
}: Props) {
  const [reservas, setReservas] = useState<ReservaRecurso[]>(initialReservas);
  const [localUserNames, setLocalUserNames] = useState<Record<string, string>>(userNames);
  const [recursos, setRecursos] = useState<Recurso[]>(initialRecursos);
  const [selectedRes, setSelectedRes] = useState<ReservationClickData | null>(null);
  const [showBulk, setShowBulk] = useState(false);

  // Manage modal
  const [managing, setManaging] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<RecursoForm>(emptyForm);
  const [addForm, setAddForm] = useState<RecursoForm>(emptyForm);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [manageError, setManageError] = useState<string | null>(null);

  const resources = recursos.filter((r) => r.activo).map((r) => ({
    id: r.id,
    nombre: r.nombre,
    subtitulo: r.ubicacion ?? undefined,
  }));

  async function handleMonthChange(yr: number, mo: number) {
    const supabase = createClient();
    const firstDay = `${yr}-${String(mo).padStart(2, "0")}-01`;
    const daysInMonth = new Date(yr, mo, 0).getDate();
    const lastDay = `${yr}-${String(mo).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;
    const { data } = await supabase
      .from("reservas_recursos")
      .select("*")
      .gte("fecha", firstDay)
      .lte("fecha", lastDay);
    if (!data) return;
    const unknownIds = [...new Set(data.map((r) => r.user_id as string))].filter(
      (id) => id !== userId && !localUserNames[id]
    );
    if (unknownIds.length > 0) {
      const { data: profiles } = await supabase
        .from("users_view")
        .select("id, full_name")
        .in("id", unknownIds);
      if (profiles) {
        setLocalUserNames((prev) => ({
          ...prev,
          ...Object.fromEntries(profiles.map((p) => [p.id, p.full_name as string])),
        }));
      }
    }
    setReservas(data as ReservaRecurso[]);
  }

  const reservations: Reservation[] = reservas.map((r) => ({
    id: r.id,
    resource_id: r.recurso_id,
    tramo_id: r.tramo_id,
    fecha: r.fecha,
    user_id: r.user_id,
    label: r.aula ?? undefined,
    user_name: r.user_id === userId ? currentUserName : (localUserNames[r.user_id] ?? "Otro usuario"),
  }));

  async function handleReserve(resourceId: number, tramoId: number, fecha: string, aula: string): Promise<boolean> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("reservas_recursos")
      .insert({ recurso_id: resourceId, tramo_id: tramoId, fecha, aula: aula || null, user_id: userId })
      .select()
      .single();
    if (error || !data) return false;
    setLocalUserNames((prev) => ({ ...prev, [userId]: currentUserName }));
    setReservas((prev) => [...prev, data as ReservaRecurso]);
    return true;
  }

  async function handleCancel(id: number) {
    const supabase = createClient();
    const { error } = await supabase.from("reservas_recursos").delete().eq("id", id);
    if (!error) setReservas((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleBulkReserve(slots: BulkSlot[], aula: string) {
    const supabase = createClient();
    const rows = slots.map(s => ({
      recurso_id: s.resourceId,
      tramo_id: s.tramoId,
      fecha: s.fecha,
      aula: aula || null,
      user_id: userId,
    }));
    const { data } = await supabase
      .from("reservas_recursos")
      .upsert(rows, { onConflict: "recurso_id,fecha,tramo_id", ignoreDuplicates: true })
      .select();
    if (data) {
      setLocalUserNames(prev => ({ ...prev, [userId]: currentUserName }));
      setReservas(prev => [...prev, ...(data as ReservaRecurso[])]);
    }
  }

  function startEdit(recurso: Recurso) {
    setEditingId(recurso.id);
    setEditForm({
      nombre: recurso.nombre,
      ubicacion: recurso.ubicacion ?? "",
      descripcion: recurso.descripcion ?? "",
      activo: recurso.activo,
    });
  }

  async function saveEdit() {
    if (!editingId) return;
    setSaving(true);
    setManageError(null);
    const supabase = createClient();
    const payload = {
      nombre: editForm.nombre,
      ubicacion: editForm.ubicacion || null,
      descripcion: editForm.descripcion || null,
      activo: editForm.activo,
    };
    const { data, error } = await supabase.from("recursos").update(payload).eq("id", editingId).select().single();
    if (error) { setManageError("No se pudo guardar el recurso."); }
    else if (data) { setRecursos((prev) => prev.map((r) => (r.id === editingId ? (data as Recurso) : r))); setEditingId(null); }
    setSaving(false);
  }

  async function handleDelete(id: number) {
    setSaving(true);
    setManageError(null);
    const supabase = createClient();
    const { error } = await supabase.from("recursos").update({ activo: false }).eq("id", id);
    if (error) { setManageError("No se pudo desactivar el recurso."); }
    else { setRecursos((prev) => prev.map((r) => (r.id === id ? { ...r, activo: false } : r))); }
    setSaving(false);
    setDeletingId(null);
  }

  async function handleAdd() {
    if (!addForm.nombre.trim()) return;
    setSaving(true);
    setManageError(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("recursos")
      .insert({
        nombre: addForm.nombre,
        ubicacion: addForm.ubicacion || null,
        descripcion: addForm.descripcion || null,
        activo: true,
      })
      .select()
      .single();
    if (error) { setManageError("No se pudo añadir el recurso."); }
    else if (data) { setRecursos((prev) => [...prev, data as Recurso]); setAddForm(emptyForm); setShowAdd(false); }
    setSaving(false);
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BookOpen size={24} className="text-gray-700" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Reserva de Recursos</h1>
            <p className="text-sm text-gray-500">Reserva de otros recursos</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canBulkReserve && (
            <button
              onClick={() => setShowBulk(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
            >
              <CalendarRange size={16} />
              <span className="hidden sm:inline">Reserva múltiple</span>
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setManaging(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <Settings size={16} />
              <span className="hidden sm:inline">Gestionar recursos</span>
            </button>
          )}
        </div>
      </div>

      <ReservaGrid
        title=""
        subtitle=""
        resources={resources}
        tramos={tramos}
        reservations={reservations}
        userId={userId}
        onReserve={handleReserve}
        onMonthChange={handleMonthChange}
        reserveExtraLabel="Aula"
        onReservationClick={setSelectedRes}
      />

      {selectedRes && (
        <ReservaDetailModal
          data={{ ...selectedRes, tipo: "recurso" }}
          onClose={() => setSelectedRes(null)}
          onCancel={(selectedRes.isOwn || isAdmin) ? async () => {
            await handleCancel(selectedRes.id);
            setSelectedRes(null);
          } : undefined}
        />
      )}

      {showBulk && (
        <ReservaBulkModal
          table="reservas_recursos"
          resourceKey="recurso_id"
          resources={resources}
          tramos={tramos}
          extraLabel="Aula"
          onConfirm={handleBulkReserve}
          onClose={() => setShowBulk(false)}
        />
      )}

      {/* Management modal */}
      {managing && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 bg-black/40 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Gestionar Recursos</h2>
              <button onClick={() => { setManaging(false); setEditingId(null); setShowAdd(false); setManageError(null); }}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>
            {manageError && (
              <div className="mx-6 mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {manageError}
              </div>
            )}

            <div className="divide-y divide-gray-50">
              {recursos.map((recurso) => (
                <div key={recurso.id} className="px-6 py-3">
                  {editingId === recurso.id ? (
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Nombre</label>
                        <input
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={editForm.nombre}
                          onChange={(e) => setEditForm((f) => ({ ...f, nombre: e.target.value }))}
                          placeholder="Ej: Carro 1"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Ubicación</label>
                        <input
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={editForm.ubicacion}
                          onChange={(e) => setEditForm((f) => ({ ...f, ubicacion: e.target.value }))}
                          placeholder="Ej: Planta 1"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Descripción</label>
                        <textarea
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                          rows={2}
                          value={editForm.descripcion}
                          onChange={(e) => setEditForm((f) => ({ ...f, descripcion: e.target.value }))}
                          placeholder="Ej: cargador incluido"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                          <input type="checkbox" checked={editForm.activo}
                            onChange={(e) => setEditForm((f) => ({ ...f, activo: e.target.checked }))}
                            className="rounded" />
                          Activo
                        </label>
                        <div className="flex gap-2">
                          <button onClick={() => setEditingId(null)}
                            className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                            Cancelar
                          </button>
                          <button onClick={saveEdit} disabled={saving}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                            <Check size={14} /> Guardar
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{recurso.nombre}</p>
                        <p className="text-xs text-gray-400">
                          {recurso.ubicacion ?? "Sin ubicación"}
                          {!recurso.activo && <span className="text-orange-500 ml-1">· Inactivo</span>}
                        </p>
                        {recurso.descripcion && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{recurso.descripcion}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => startEdit(recurso)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Pencil size={15} />
                        </button>
                        {deletingId === recurso.id ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-red-600">¿Borrar?</span>
                            <button onClick={() => handleDelete(recurso.id)} disabled={saving}
                              className="px-2 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">Sí</button>
                            <button onClick={() => setDeletingId(null)}
                              className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded-lg">No</button>
                          </div>
                        ) : (
                          <button onClick={() => setDeletingId(recurso.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add new */}
            <div className="px-6 py-4 border-t border-gray-100">
              {showAdd ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Nuevo recurso</p>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Nombre</label>
                    <input
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={addForm.nombre}
                      onChange={(e) => setAddForm((f) => ({ ...f, nombre: e.target.value }))}
                      placeholder="Ej: Altavoces"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Ubicación</label>
                    <input
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={addForm.ubicacion}
                      onChange={(e) => setAddForm((f) => ({ ...f, ubicacion: e.target.value }))}
                      placeholder="Ej: Aula E2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Descripción</label>
                    <textarea
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      rows={2}
                      value={addForm.descripcion}
                      onChange={(e) => setAddForm((f) => ({ ...f, descripcion: e.target.value }))}
                      placeholder="Ej: cargador incluido"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => { setShowAdd(false); setAddForm(emptyForm); }}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                      Cancelar
                    </button>
                    <button onClick={handleAdd} disabled={saving || !addForm.nombre.trim()}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                      <Plus size={14} /> Añadir
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowAdd(true)}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  <Plus size={16} /> Añadir recurso
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

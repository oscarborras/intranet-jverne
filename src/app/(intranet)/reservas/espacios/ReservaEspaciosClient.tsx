"use client";

import { useState } from "react";
import { Building2, Settings, Plus, Pencil, Trash2, X, Check, CalendarRange } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ReservaGrid, type Reservation, type ReservationClickData } from "@/components/calendar/ReservaGrid";
import { ReservaDetailModal } from "@/components/calendar/ReservaDetailModal";
import { ReservaBulkModal, type BulkSlot } from "@/components/calendar/ReservaBulkModal";
import type { Espacio, ReservaEspacio, TramoHorario, EspacioTipo } from "@/lib/types";

interface Props {
  espacios: Espacio[];
  initialReservas: ReservaEspacio[];
  tramos: TramoHorario[];
  userId: string;
  userNames: Record<string, string>;
  currentUserName: string;
  isAdmin: boolean;
  canBulkReserve: boolean;
}

const TIPO_LABELS: Record<EspacioTipo, string> = {
  sum: "Salón de Actos (SUM)",
  sala_visitas: "Sala de Visitas",
  otro: "Otro",
};

interface EspacioForm {
  nombre: string;
  tipo: EspacioTipo;
  capacidad: string;
  activo: boolean;
}

const emptyForm: EspacioForm = { nombre: "", tipo: "otro", capacidad: "", activo: true };

export function ReservaEspaciosClient({
  espacios: initialEspacios, initialReservas, tramos,
  userId, userNames, currentUserName, isAdmin, canBulkReserve,
}: Props) {
  const [reservas, setReservas] = useState<ReservaEspacio[]>(initialReservas);
  const [localUserNames, setLocalUserNames] = useState<Record<string, string>>(userNames);
  const [espacios, setEspacios] = useState<Espacio[]>(initialEspacios);
  const [selectedRes, setSelectedRes] = useState<ReservationClickData | null>(null);
  const [showBulk, setShowBulk] = useState(false);

  // Manage modal
  const [managing, setManaging] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EspacioForm>(emptyForm);
  const [addForm, setAddForm] = useState<EspacioForm>(emptyForm);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [manageError, setManageError] = useState<string | null>(null);

  const resources = espacios.filter((e) => e.activo).map((e) => ({ id: e.id, nombre: e.nombre }));

  async function handleMonthChange(yr: number, mo: number) {
    const supabase = createClient();
    const firstDay = `${yr}-${String(mo).padStart(2, "0")}-01`;
    const daysInMonth = new Date(yr, mo, 0).getDate();
    const lastDay = `${yr}-${String(mo).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;
    const { data } = await supabase
      .from("reservas_espacios")
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
    setReservas(data as ReservaEspacio[]);
  }

  const reservations: Reservation[] = reservas.map((r) => ({
    id: r.id,
    resource_id: r.espacio_id,
    tramo_id: r.tramo_id,
    fecha: r.fecha,
    user_id: r.user_id,
    label: r.motivo,
    user_name: r.user_id === userId ? currentUserName : (localUserNames[r.user_id] ?? "Otro usuario"),
  }));

  async function handleReserve(resourceId: number, tramoId: number, fecha: string, motivo: string) {
    const supabase = createClient();
    const { data } = await supabase
      .from("reservas_espacios")
      .insert({ espacio_id: resourceId, tramo_id: tramoId, fecha, motivo: motivo || "Sin motivo", user_id: userId })
      .select()
      .single();
    if (data) {
      setLocalUserNames((prev) => ({ ...prev, [userId]: currentUserName }));
      setReservas((prev) => [...prev, data as ReservaEspacio]);
    }
  }

  async function handleCancel(id: number) {
    const supabase = createClient();
    const { error } = await supabase.from("reservas_espacios").delete().eq("id", id);
    if (!error) setReservas((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleBulkReserve(slots: BulkSlot[], motivo: string) {
    const supabase = createClient();
    const rows = slots.map(s => ({
      espacio_id: s.resourceId,
      tramo_id: s.tramoId,
      fecha: s.fecha,
      motivo: motivo || "Sin motivo",
      user_id: userId,
    }));
    const { data } = await supabase
      .from("reservas_espacios")
      .upsert(rows, { onConflict: "espacio_id,fecha,tramo_id", ignoreDuplicates: true })
      .select();
    if (data) {
      setLocalUserNames(prev => ({ ...prev, [userId]: currentUserName }));
      setReservas(prev => [...prev, ...(data as ReservaEspacio[])]);
    }
  }

  function startEdit(espacio: Espacio) {
    setEditingId(espacio.id);
    setEditForm({
      nombre: espacio.nombre,
      tipo: espacio.tipo,
      capacidad: espacio.capacidad != null ? String(espacio.capacidad) : "",
      activo: espacio.activo,
    });
  }

  async function saveEdit() {
    if (!editingId) return;
    setSaving(true);
    setManageError(null);
    const supabase = createClient();
    const payload = {
      nombre: editForm.nombre,
      tipo: editForm.tipo,
      capacidad: editForm.capacidad ? parseInt(editForm.capacidad) : null,
      activo: editForm.activo,
    };
    const { data, error } = await supabase.from("espacios").update(payload).eq("id", editingId).select().single();
    if (error) { setManageError("No se pudo guardar el espacio."); }
    else if (data) { setEspacios((prev) => prev.map((e) => (e.id === editingId ? (data as Espacio) : e))); setEditingId(null); }
    setSaving(false);
  }

  async function handleDelete(id: number) {
    setSaving(true);
    setManageError(null);
    const supabase = createClient();
    const { error } = await supabase.from("espacios").update({ activo: false }).eq("id", id);
    if (error) { setManageError("No se pudo desactivar el espacio."); }
    else { setEspacios((prev) => prev.map((e) => (e.id === id ? { ...e, activo: false } : e))); }
    setSaving(false);
    setDeletingId(null);
  }

  async function handleAdd() {
    if (!addForm.nombre.trim()) return;
    setSaving(true);
    setManageError(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("espacios")
      .insert({
        nombre: addForm.nombre,
        tipo: addForm.tipo,
        capacidad: addForm.capacidad ? parseInt(addForm.capacidad) : null,
        activo: true,
      })
      .select()
      .single();
    if (error) { setManageError("No se pudo añadir el espacio."); }
    else if (data) { setEspacios((prev) => [...prev, data as Espacio]); setAddForm(emptyForm); setShowAdd(false); }
    setSaving(false);
  }

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Building2 size={24} className="text-emerald-500" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Reserva de Espacios</h1>
            <p className="text-sm text-gray-500">Reserva espacios del Centro por horas</p>
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
              <span className="hidden sm:inline">Gestionar espacios</span>
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
        reserveExtraLabel="Motivo"
        onReservationClick={setSelectedRes}
      />

      {selectedRes && (
        <ReservaDetailModal
          data={{ ...selectedRes, tipo: "espacio" }}
          onClose={() => setSelectedRes(null)}
          onCancel={(selectedRes.isOwn || isAdmin) ? async () => {
            await handleCancel(selectedRes.id);
            setSelectedRes(null);
          } : undefined}
        />
      )}

      {showBulk && (
        <ReservaBulkModal
          table="reservas_espacios"
          resourceKey="espacio_id"
          resources={resources}
          tramos={tramos}
          extraLabel="Motivo"
          onConfirm={handleBulkReserve}
          onClose={() => setShowBulk(false)}
        />
      )}

      {/* Management modal */}
      {managing && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 bg-black/40 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Gestionar Espacios</h2>
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
              {espacios.map((espacio) => (
                <div key={espacio.id} className="px-6 py-3">
                  {editingId === espacio.id ? (
                    <div className="space-y-2">
                      <input
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={editForm.nombre}
                        onChange={(e) => setEditForm((f) => ({ ...f, nombre: e.target.value }))}
                        placeholder="Nombre"
                      />
                      <div className="flex gap-2">
                        <select
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={editForm.tipo}
                          onChange={(e) => setEditForm((f) => ({ ...f, tipo: e.target.value as EspacioTipo }))}
                        >
                          {(Object.keys(TIPO_LABELS) as EspacioTipo[]).map((t) => (
                            <option key={t} value={t}>{TIPO_LABELS[t]}</option>
                          ))}
                        </select>
                        <input
                          className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={editForm.capacidad}
                          onChange={(e) => setEditForm((f) => ({ ...f, capacidad: e.target.value }))}
                          placeholder="Aforo"
                          type="number"
                          min="0"
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
                        <p className="text-sm font-medium text-gray-900 truncate">{espacio.nombre}</p>
                        <p className="text-xs text-gray-400">
                          {TIPO_LABELS[espacio.tipo]}
                          {espacio.capacidad ? ` · Aforo: ${espacio.capacidad}` : ""}
                          {!espacio.activo && <span className="text-orange-500 ml-1">· Inactivo</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => startEdit(espacio)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Pencil size={15} />
                        </button>
                        {deletingId === espacio.id ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-red-600">¿Borrar?</span>
                            <button onClick={() => handleDelete(espacio.id)} disabled={saving}
                              className="px-2 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">Sí</button>
                            <button onClick={() => setDeletingId(null)}
                              className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded-lg">No</button>
                          </div>
                        ) : (
                          <button onClick={() => setDeletingId(espacio.id)}
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
                  <p className="text-sm font-medium text-gray-700">Nuevo espacio</p>
                  <input
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={addForm.nombre}
                    onChange={(e) => setAddForm((f) => ({ ...f, nombre: e.target.value }))}
                    placeholder="Nombre del espacio"
                  />
                  <div className="flex gap-2">
                    <select
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={addForm.tipo}
                      onChange={(e) => setAddForm((f) => ({ ...f, tipo: e.target.value as EspacioTipo }))}
                    >
                      {(Object.keys(TIPO_LABELS) as EspacioTipo[]).map((t) => (
                        <option key={t} value={t}>{TIPO_LABELS[t]}</option>
                      ))}
                    </select>
                    <input
                      className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={addForm.capacidad}
                      onChange={(e) => setAddForm((f) => ({ ...f, capacidad: e.target.value }))}
                      placeholder="Aforo"
                      type="number"
                      min="0"
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
                  <Plus size={16} /> Añadir espacio
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

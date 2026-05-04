"use client";

import { useState, useEffect, useCallback } from "react";
import type { LucideIcon } from "lucide-react";
import {
  X, Monitor, ArrowLeftRight, UserCheck, FileEdit,
  MessageCircle, Plus, Clock, User, Loader2, Send,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { PeticionTIC, PeticionTICEstado, PeticionTICActividadTipo } from "@/lib/types";

interface ActivityEntry {
  id: number;
  tipo: PeticionTICActividadTipo;
  contenido: string;
  created_at: string;
  user_full_name: string;
}

interface UserOption {
  id: string;
  full_name: string;
}

const PRIORITY_CLASSES: Record<string, string> = {
  baja: "bg-gray-100 text-gray-600",
  normal: "bg-blue-100 text-blue-700",
  alta: "bg-yellow-100 text-yellow-700",
  urgente: "bg-red-100 text-red-700",
};

const PRIORITY_LABELS: Record<string, string> = {
  baja: "Baja",
  normal: "Normal",
  alta: "Alta",
  urgente: "Urgente",
};

const ESTADO_LABELS: Record<PeticionTICEstado, string> = {
  pendiente: "Pendiente",
  en_progreso: "En Progreso",
  finalizada: "Finalizada",
};

const ACTIVITY_CONFIG: Record<PeticionTICActividadTipo, { icon: LucideIcon; color: string; bg: string }> = {
  creacion:           { icon: Plus,            color: "text-blue-600",   bg: "bg-blue-100"   },
  observacion:        { icon: MessageCircle,   color: "text-yellow-600", bg: "bg-yellow-100" },
  cambio_estado:      { icon: ArrowLeftRight,  color: "text-purple-600", bg: "bg-purple-100" },
  cambio_asignado:    { icon: UserCheck,       color: "text-green-600",  bg: "bg-green-100"  },
  cambio_descripcion: { icon: FileEdit,        color: "text-gray-500",   bg: "bg-gray-100"   },
};

interface Props {
  peticion: PeticionTIC;
  canManage: boolean;
  userId: string;
  onClose: () => void;
  onUpdate: (updated: PeticionTIC) => void;
}

export function PeticionTICModal({ peticion, canManage, userId, onClose, onUpdate }: Props) {
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [users, setUsers] = useState<UserOption[]>([]);

  const [editDesc, setEditDesc] = useState(peticion.descripcion);
  const [editEstado, setEditEstado] = useState<PeticionTICEstado>(peticion.estado);
  const [editAsignadoId, setEditAsignadoId] = useState<string>(peticion.asignado_id ?? "");
  const [newObs, setNewObs] = useState("");
  const [saving, setSaving] = useState(false);
  const [addingObs, setAddingObs] = useState(false);

  const isAuthor = peticion.autor_id === userId;

  const loadActivity = useCallback(async () => {
    const supabase = createClient();
    const { data: acts } = await supabase
      .from("peticiones_tic_actividad")
      .select("id, tipo, contenido, created_at, user_id")
      .eq("peticion_id", peticion.id)
      .order("created_at", { ascending: true });

    if (!acts || acts.length === 0) {
      setActivity([]);
      setLoadingActivity(false);
      return;
    }

    const uniqueIds = [...new Set(acts.map((a) => a.user_id as string))];
    const { data: profiles } = await supabase
      .from("users_view")
      .select("id, full_name")
      .in("id", uniqueIds);

    const nameMap: Record<string, string> = Object.fromEntries(
      (profiles ?? []).map((p) => [p.id, p.full_name as string])
    );

    setActivity(
      acts.map((a) => ({
        id: a.id as number,
        tipo: a.tipo as PeticionTICActividadTipo,
        contenido: a.contenido as string,
        created_at: a.created_at as string,
        user_full_name: nameMap[a.user_id as string] ?? "—",
      }))
    );
    setLoadingActivity(false);
  }, [peticion.id]);

  useEffect(() => {
    loadActivity();
    if (canManage) {
      createClient()
        .from("users_view")
        .select("id, full_name")
        .order("full_name")
        .then(({ data }) => setUsers((data ?? []) as UserOption[]));
    }
  }, [canManage, loadActivity]);

  async function handleAddObservation() {
    if (!newObs.trim()) return;
    setAddingObs(true);
    await createClient().from("peticiones_tic_actividad").insert({
      peticion_id: peticion.id,
      user_id: userId,
      tipo: "observacion",
      contenido: newObs.trim(),
    });
    setNewObs("");
    await loadActivity();
    setAddingObs(false);
  }

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();
    const updates: Record<string, string | null> = {};
    const actRecords: {
      peticion_id: number;
      user_id: string;
      tipo: string;
      contenido: string;
    }[] = [];

    if (editDesc !== peticion.descripcion) {
      updates.descripcion = editDesc;
      actRecords.push({
        peticion_id: peticion.id,
        user_id: userId,
        tipo: "cambio_descripcion",
        contenido: "Descripción actualizada",
      });
    }

    if (editEstado !== peticion.estado) {
      updates.estado = editEstado;
      actRecords.push({
        peticion_id: peticion.id,
        user_id: userId,
        tipo: "cambio_estado",
        contenido: `Estado cambiado de ${ESTADO_LABELS[peticion.estado]} a ${ESTADO_LABELS[editEstado]}`,
      });
    }

    const newAsignadoId = editAsignadoId || null;
    if (newAsignadoId !== peticion.asignado_id) {
      updates.asignado_id = newAsignadoId;
      const assignedName = newAsignadoId
        ? (users.find((u) => u.id === newAsignadoId)?.full_name ?? newAsignadoId)
        : null;
      actRecords.push({
        peticion_id: peticion.id,
        user_id: userId,
        tipo: "cambio_asignado",
        contenido: assignedName ? `Asignado a ${assignedName}` : "Asignación eliminada",
      });
    }

    if (newObs.trim()) {
      actRecords.push({
        peticion_id: peticion.id,
        user_id: userId,
        tipo: "observacion",
        contenido: newObs.trim(),
      });
    }

    if (Object.keys(updates).length > 0) {
      await supabase.from("peticiones_tic").update(updates).eq("id", peticion.id);
    }
    if (actRecords.length > 0) {
      await supabase.from("peticiones_tic_actividad").insert(actRecords);
    }

    setNewObs("");
    await loadActivity();

    const asignadoUser = newAsignadoId ? users.find((u) => u.id === newAsignadoId) : undefined;
    onUpdate({
      ...peticion,
      descripcion: editDesc,
      estado: editEstado,
      asignado_id: newAsignadoId,
      asignado: asignadoUser
        ? { full_name: asignadoUser.full_name }
        : newAsignadoId
        ? peticion.asignado
        : undefined,
    });

    setSaving(false);
    onClose();
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <Monitor size={18} className="text-blue-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-gray-900 truncate">
              <span className="text-blue-600">{peticion.codigo}</span>
              <span className="text-gray-400 mx-2">·</span>
              {peticion.titulo}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-0">

          {/* Left panel */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">

            {/* Description */}
            <section>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
                Descripción
              </p>
              {canManage ? (
                <textarea
                  rows={3}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-gray-50"
                />
              ) : (
                <div className="bg-gray-50 rounded-xl px-3 py-2.5 text-sm text-gray-700 min-h-[60px] whitespace-pre-wrap">
                  {peticion.descripcion}
                </div>
              )}
            </section>

            {/* Activity history */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Clock size={13} className="text-gray-400" />
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
                  Historial de Actividad
                </p>
              </div>

              {loadingActivity ? (
                <div className="flex justify-center py-8">
                  <Loader2 size={20} className="animate-spin text-gray-300" />
                </div>
              ) : activity.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Sin actividad registrada</p>
              ) : (
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  {activity.map((act, i) => {
                    const cfg = ACTIVITY_CONFIG[act.tipo];
                    const Icon = cfg.icon;
                    return (
                      <div
                        key={act.id}
                        className={cn("flex gap-3 px-4 py-3", i > 0 && "border-t border-gray-50")}
                      >
                        <div
                          className={cn(
                            "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                            cfg.bg
                          )}
                        >
                          <Icon size={13} className={cfg.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mb-0.5">
                            <span className="text-sm font-semibold text-gray-900">
                              {act.user_full_name}
                            </span>
                            <span className="text-xs text-gray-300">·</span>
                            <span className="text-xs text-gray-400">{formatDate(act.created_at)}</span>
                          </div>
                          <p className="text-sm text-gray-600">{act.contenido}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* New observation */}
            {(isAuthor || canManage) && (
              <section>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
                  Nueva Observación
                </p>
                <textarea
                  rows={3}
                  value={newObs}
                  onChange={(e) => setNewObs(e.target.value)}
                  placeholder="Escribe una observación..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                {!canManage && (
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={handleAddObservation}
                      disabled={addingObs || !newObs.trim()}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                    >
                      {addingObs ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Send size={13} />
                      )}
                      Añadir
                    </button>
                  </div>
                )}
              </section>
            )}
          </div>

          {/* Right panel — details */}
          <div className="w-full md:w-60 border-t md:border-t-0 md:border-l border-gray-100 flex-shrink-0 p-5 space-y-5 bg-gray-50/40 overflow-y-auto">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
              Detalles
            </p>

            {/* Solicitante */}
            <div className="space-y-1.5">
              <p className="text-xs text-gray-500">Solicitante</p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <User size={14} className="text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate leading-tight">
                    {peticion.autor?.full_name ?? "—"}
                  </p>
                  <p className="text-xs text-gray-400">Sin departamento</p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100" />

            {/* Prioridad */}
            <div className="space-y-1.5">
              <p className="text-xs text-gray-500">Prioridad</p>
              <span
                className={cn(
                  "inline-block text-xs px-2.5 py-1 rounded-full font-semibold",
                  PRIORITY_CLASSES[peticion.prioridad]
                )}
              >
                {PRIORITY_LABELS[peticion.prioridad]}
              </span>
            </div>

            {/* Estado */}
            <div className="space-y-1.5">
              <p className="text-xs text-gray-500">Estado</p>
              {canManage ? (
                <select
                  value={editEstado}
                  onChange={(e) => setEditEstado(e.target.value as PeticionTICEstado)}
                  className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="en_progreso">En Progreso</option>
                  <option value="finalizada">Finalizada</option>
                </select>
              ) : (
                <p className="text-sm font-medium text-gray-700">{ESTADO_LABELS[peticion.estado]}</p>
              )}
            </div>

            {/* Asignado a */}
            <div className="space-y-1.5">
              <p className="text-xs text-gray-500">Asignado a</p>
              {canManage ? (
                <select
                  value={editAsignadoId}
                  onChange={(e) => setEditAsignadoId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sin asignar</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm font-medium text-gray-700">
                  {peticion.asignado?.full_name ?? "Sin asignar"}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-white">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
          >
            Cerrar
          </button>
          {canManage && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-semibold transition-colors"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              Guardar Cambios
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

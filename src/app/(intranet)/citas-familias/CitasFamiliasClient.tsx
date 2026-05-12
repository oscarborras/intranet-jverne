"use client";

import { useState } from "react";
import { Users, Plus, CalendarCheck, Clock, MapPin, User, Phone, Mail, BookOpen, X, Check, ChevronDown } from "lucide-react";
import type { CitaFamilia, CitaFamiliaEstado, LUGARES_CITA } from "@/lib/types";
import { LUGARES_CITA as LUGARES } from "@/lib/types";
import type { ProfesorOption } from "./page";

type Tab = "pendiente" | "confirmada" | "completada" | "cancelada";

const TAB_LABELS: Record<Tab, string> = {
  pendiente: "Pendientes",
  confirmada: "Confirmadas",
  completada: "Completadas",
  cancelada: "Canceladas",
};

const ESTADO_COLORS: Record<CitaFamiliaEstado, string> = {
  pendiente: "#f59e0b",
  confirmada: "#10b981",
  completada: "#6366f1",
  cancelada: "#ef4444",
};

interface Props {
  initialCitas: CitaFamilia[];
  userId: string;
  currentProfesorId: string | null;
  isAdmin: boolean;
  profesores: ProfesorOption[];
}

interface RegistrarForm {
  fecha: string;
  hora_inicio: string;
  lugar: string;
}

interface NuevaCitaForm {
  alumno_nombre: string;
  alumno_curso: string;
  familiar_nombre: string;
  familiar_parentesco: string;
  familiar_email: string;
  familiar_telefono: string;
  motivo: string;
  fecha: string;
  hora_inicio: string;
  lugar: string;
}

const EMPTY_NUEVA: NuevaCitaForm = {
  alumno_nombre: "",
  alumno_curso: "",
  familiar_nombre: "",
  familiar_parentesco: "padre",
  familiar_email: "",
  familiar_telefono: "",
  motivo: "",
  fecha: "",
  hora_inicio: "",
  lugar: LUGARES[0],
};

function formatFecha(fecha: string | null): string {
  if (!fecha) return "—";
  return new Date(fecha + "T00:00:00").toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

export default function CitasFamiliasClient({ initialCitas, userId, currentProfesorId, isAdmin, profesores }: Props) {
  const [citas, setCitas] = useState<CitaFamilia[]>(initialCitas);
  const [activeTab, setActiveTab] = useState<Tab>("pendiente");
  const [saving, setSaving] = useState(false);
  const [registrarId, setRegistrarId] = useState<number | null>(null);
  const [registrarForm, setRegistrarForm] = useState<RegistrarForm>({ fecha: "", hora_inicio: "", lugar: LUGARES[0] });
  const [showNueva, setShowNueva] = useState(false);
  const [nuevaForm, setNuevaForm] = useState<NuevaCitaForm>(EMPTY_NUEVA);
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [cancelMotivo, setCancelMotivo] = useState("");
  const [selectedCita, setSelectedCita] = useState<CitaFamilia | null>(null);
  const [filtroProfesorId, setFiltroProfesorId] = useState<string>(currentProfesorId ?? "");

  const tabs: Tab[] = ["pendiente", "confirmada", "completada", "cancelada"];
  const citasFiltradas = isAdmin && filtroProfesorId
    ? citas.filter((c) => c.profesor_id === filtroProfesorId)
    : citas;
  const filtered = citasFiltradas.filter((c) => c.estado === activeTab);
  const pendienteCount = citasFiltradas.filter((c) => c.estado === "pendiente").length;

  const efectiveProfesorId = isAdmin ? (filtroProfesorId || userId) : userId;

  async function handleRegistrar(citaId: number) {
    if (!registrarForm.fecha || !registrarForm.hora_inicio || !registrarForm.lugar) return;
    setSaving(true);
    try {
      const res = await fetch("/api/citas/confirmar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ citaId, fecha: registrarForm.fecha, hora_inicio: registrarForm.hora_inicio, lugar: registrarForm.lugar }),
      });
      if (!res.ok) throw new Error();
      const { cita } = await res.json();
      setCitas((prev) => prev.map((c) => (c.id === citaId ? { ...c, ...cita } : c)));
      setRegistrarId(null);
      setRegistrarForm({ fecha: "", hora_inicio: "", lugar: LUGARES[0] });
    } catch {
      alert("Error al confirmar la cita. Inténtelo de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCompletar(citaId: number) {
    setSaving(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await supabase.from("citas_familias").update({ estado: "completada" }).eq("id", citaId);
      setCitas((prev) => prev.map((c) => (c.id === citaId ? { ...c, estado: "completada" } : c)));
    } catch {
      alert("Error al marcar como completada.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelar() {
    if (!cancelId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/citas/cancelar-profesor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ citaId: cancelId, motivo_cancelacion: cancelMotivo }),
      });
      if (!res.ok) throw new Error();
      setCitas((prev) => prev.map((c) => (c.id === cancelId ? { ...c, estado: "cancelada", cancelada_por: "profesor", motivo_cancelacion: cancelMotivo || null } : c)));
      setCancelId(null);
      setCancelMotivo("");
    } catch {
      alert("Error al cancelar la cita.");
    } finally {
      setSaving(false);
    }
  }

  async function handleNuevaCita() {
    if (!nuevaForm.alumno_nombre.trim() || !nuevaForm.alumno_curso.trim() || !nuevaForm.familiar_nombre.trim() || !nuevaForm.fecha || !nuevaForm.hora_inicio) {
      alert("Complete los campos obligatorios.");
      return;
    }
    setSaving(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: inserted } = await supabase
        .from("citas_familias")
        .insert({
          codigo: "CF-TEMP",
          profesor_id: efectiveProfesorId,
          alumno_nombre: nuevaForm.alumno_nombre.trim(),
          alumno_curso: nuevaForm.alumno_curso.trim(),
          familiar_nombre: nuevaForm.familiar_nombre.trim(),
          familiar_parentesco: nuevaForm.familiar_parentesco,
          familiar_email: nuevaForm.familiar_email.trim() || null,
          familiar_telefono: nuevaForm.familiar_telefono.trim() || null,
          motivo: nuevaForm.motivo.trim() || null,
          fecha: nuevaForm.fecha,
          hora_inicio: nuevaForm.hora_inicio,
          lugar: nuevaForm.lugar,
          estado: "confirmada",
        })
        .select("id, token_familia")
        .single();
      if (inserted) {
        const year = new Date().getFullYear();
        const codigo = `CF-${year}-${String(inserted.id).padStart(4, "0")}`;
        await supabase.from("citas_familias").update({ codigo }).eq("id", inserted.id);
        const { data: full } = await supabase.from("citas_familias").select("*").eq("id", inserted.id).single();
        if (full) {
          const profesorNombre = profesores.find((p) => p.id === efectiveProfesorId)?.nombre ?? "—";
          setCitas((prev) => [{ ...full, codigo, profesor: { full_name: profesorNombre, email: "" } }, ...prev]);
        }
      }
      setShowNueva(false);
      setNuevaForm(EMPTY_NUEVA);
      setActiveTab("confirmada");
    } catch {
      alert("Error al crear la cita.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <Users className="w-5 h-5 text-red-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Citas con Familias</h1>
            <p className="text-sm text-gray-500">Gestión de visitas y reuniones</p>
          </div>
        </div>
        <button
          onClick={() => setShowNueva(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-700 text-white rounded-lg text-sm font-medium hover:bg-red-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nueva cita</span>
        </button>
      </div>

      {/* Selector de profesor (solo admin/directiva) */}
      {isAdmin && profesores.length > 0 && (
        <div className="mb-5">
          <div className="relative">
            <select
              value={filtroProfesorId}
              onChange={(e) => setFiltroProfesorId(e.target.value)}
              className="w-full appearance-none border border-gray-300 rounded-xl px-4 py-2.5 pr-10 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900"
            >
              {currentProfesorId && (
                <option value={currentProfesorId}>
                  Mis citas ({profesores.find((p) => p.id === currentProfesorId)?.nombre ?? "yo"})
                </option>
              )}
              <option value="">— Todos los profesores —</option>
              {profesores
                .filter((p) => p.id !== currentProfesorId)
                .map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 min-w-max px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
          >
            {TAB_LABELS[tab]}
            {tab === "pendiente" && pendienteCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">
                {pendienteCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Lista de citas */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No hay citas en este estado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((cita) => (
            <div
              key={cita.id}
              className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-mono text-gray-400">{cita.codigo}</span>
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ background: ESTADO_COLORS[cita.estado] + "20", color: ESTADO_COLORS[cita.estado] }}
                    >
                      {TAB_LABELS[cita.estado]}
                    </span>
                    {cita.cancelada_por && (
                      <span className="text-xs text-gray-400">({cita.cancelada_por})</span>
                    )}
                  </div>
                  <p className="font-semibold text-gray-900">{cita.alumno_nombre} <span className="text-sm font-normal text-gray-500">({cita.alumno_curso})</span></p>
                  <p className="text-sm text-gray-600 mt-0.5">
                    <User className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                    {cita.familiar_nombre} · <span className="capitalize">{cita.familiar_parentesco}</span>
                  </p>
                  {isAdmin && cita.profesor && (
                    <p className="text-xs text-gray-400 mt-0.5">Profesor/a: {cita.profesor.full_name}</p>
                  )}
                  {cita.fecha && (
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="text-sm text-gray-600 flex items-center gap-1">
                        <CalendarCheck className="w-3.5 h-3.5 text-gray-400" />
                        {formatFecha(cita.fecha)}
                      </span>
                      {cita.hora_inicio && (
                        <span className="text-sm text-gray-600 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          {cita.hora_inicio.slice(0, 5)}
                        </span>
                      )}
                      {cita.lugar && (
                        <span className="text-sm text-gray-600 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                          {cita.lugar}
                        </span>
                      )}
                    </div>
                  )}
                  {cita.motivo && (
                    <p className="text-xs text-gray-500 mt-1 flex items-start gap-1">
                      <BookOpen className="w-3.5 h-3.5 mt-0.5 text-gray-300 shrink-0" />
                      {cita.motivo}
                    </p>
                  )}
                  {cita.estado === "cancelada" && cita.motivo_cancelacion && (
                    <p className="text-xs text-red-400 mt-1 flex items-start gap-1">
                      <X className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span><span className="font-medium">Motivo cancelación:</span> {cita.motivo_cancelacion}</span>
                    </p>
                  )}
                  {cita.familiar_email && (
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <Mail className="w-3 h-3" />{cita.familiar_email}
                      {cita.familiar_telefono && <><Phone className="w-3 h-3 ml-2" />{cita.familiar_telefono}</>}
                    </p>
                  )}
                </div>

                {/* Acciones */}
                {(isAdmin || cita.profesor_id === userId) && (
                  <div className="flex flex-col gap-1 shrink-0">
                    {cita.estado === "pendiente" && (
                      <button
                        onClick={() => { setRegistrarId(cita.id); setSelectedCita(cita); }}
                        className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors flex items-center gap-1"
                      >
                        <CalendarCheck className="w-3.5 h-3.5" />
                        Registrar cita
                      </button>
                    )}
                    {cita.estado === "confirmada" && (
                      <button
                        onClick={() => handleCompletar(cita.id)}
                        disabled={saving}
                        className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Completada
                      </button>
                    )}
                    {(cita.estado === "pendiente" || cita.estado === "confirmada") && (
                      <button
                        onClick={() => { setCancelId(cita.id); setCancelMotivo(""); }}
                        className="px-3 py-1.5 bg-gray-100 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50 transition-colors flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        Cancelar
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Registrar fecha/hora */}
      {registrarId !== null && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="font-bold text-gray-900 mb-1">Registrar cita</h2>
            {selectedCita && (
              <p className="text-sm text-gray-500 mb-4">
                {selectedCita.alumno_nombre} · {selectedCita.familiar_nombre}
              </p>
            )}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha <span className="text-red-500">*</span></label>
                <input type="date" value={registrarForm.fecha} onChange={(e) => setRegistrarForm((f) => ({ ...f, fecha: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Hora <span className="text-red-500">*</span></label>
                <input type="time" value={registrarForm.hora_inicio} onChange={(e) => setRegistrarForm((f) => ({ ...f, hora_inicio: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Lugar <span className="text-red-500">*</span></label>
                <select value={registrarForm.lugar} onChange={(e) => setRegistrarForm((f) => ({ ...f, lugar: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white">
                  {LUGARES.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => handleRegistrar(registrarId)}
                disabled={saving || !registrarForm.fecha || !registrarForm.hora_inicio}
                className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {saving ? "Guardando..." : "Confirmar cita"}
              </button>
              <button onClick={() => setRegistrarId(null)}
                className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Cancelar */}
      {cancelId !== null && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="font-bold text-gray-900 mb-3">¿Cancelar esta cita?</h2>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Motivo (opcional)</label>
              <textarea rows={3} value={cancelMotivo} onChange={(e) => setCancelMotivo(e.target.value)}
                placeholder="Indique el motivo de la cancelación..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none" />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleCancelar} disabled={saving}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors">
                {saving ? "Cancelando..." : "Sí, cancelar"}
              </button>
              <button onClick={() => setCancelId(null)}
                className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                Volver
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nueva cita directa */}
      {showNueva && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 my-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900">Nueva cita</h2>
              <button onClick={() => setShowNueva(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              {([
                ["alumno_nombre", "Alumno/a (nombre y apellidos)", true],
                ["alumno_curso", "Curso", true, "text", "Ej: 2º ESO A"],
                ["familiar_nombre", "Nombre del familiar", true],
              ] as [keyof NuevaCitaForm, string, boolean, string?, string?][]).map(([field, label, req, type = "text", ph = ""]) => (
                <div key={field}>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{label}{req && <span className="text-red-500"> *</span>}</label>
                  <input type={type} placeholder={ph} value={nuevaForm[field] as string}
                    onChange={(e) => setNuevaForm((f) => ({ ...f, [field]: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Parentesco</label>
                <select value={nuevaForm.familiar_parentesco} onChange={(e) => setNuevaForm((f) => ({ ...f, familiar_parentesco: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white">
                  {["padre", "madre", "tutor/a legal", "otro"].map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Email familiar</label>
                <input type="email" value={nuevaForm.familiar_email} onChange={(e) => setNuevaForm((f) => ({ ...f, familiar_email: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Teléfono</label>
                <input type="tel" value={nuevaForm.familiar_telefono} onChange={(e) => setNuevaForm((f) => ({ ...f, familiar_telefono: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha <span className="text-red-500">*</span></label>
                <input type="date" value={nuevaForm.fecha} onChange={(e) => setNuevaForm((f) => ({ ...f, fecha: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Hora <span className="text-red-500">*</span></label>
                <input type="time" value={nuevaForm.hora_inicio} onChange={(e) => setNuevaForm((f) => ({ ...f, hora_inicio: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Lugar</label>
                <select value={nuevaForm.lugar} onChange={(e) => setNuevaForm((f) => ({ ...f, lugar: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white">
                  {LUGARES.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Motivo (opcional)</label>
                <textarea rows={2} value={nuevaForm.motivo} onChange={(e) => setNuevaForm((f) => ({ ...f, motivo: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={handleNuevaCita} disabled={saving}
                className="flex-1 py-2 bg-red-700 text-white rounded-lg text-sm font-medium hover:bg-red-800 disabled:opacity-50 transition-colors">
                {saving ? "Guardando..." : "Crear cita"}
              </button>
              <button onClick={() => setShowNueva(false)}
                className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

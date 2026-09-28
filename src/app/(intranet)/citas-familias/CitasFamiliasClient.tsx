"use client";

import { useRef, useState } from "react";
import { Users, Plus, Forward, CalendarCheck, Pencil, Loader2, X, Check, ChevronDown } from "lucide-react";
import type { CitaFamilia } from "@/lib/types";
import type { ProfesorOption } from "./page";
import type { CargoDirectivoClave } from "@/lib/types";
import SolicitudCitaForm from "./SolicitudCitaForm";
import RegistrarCitaForm, { type RegistrarCitaData } from "./RegistrarCitaForm";
import CitaCard from "./CitaCard";

/** Status tabs plus "derivada": appointments the user referred to someone else (read-only) */
type Tab = "pendiente" | "confirmada" | "completada" | "derivada" | "cancelada";

const TAB_LABELS: Record<Tab, string> = {
  pendiente: "Pendientes",
  confirmada: "Confirmadas",
  completada: "Completadas",
  derivada: "Derivadas",
  cancelada: "Canceladas",
};

interface Props {
  initialCitas: CitaFamilia[];
  /** Appointments the user referred to another teacher (not their own), read-only */
  initialDerivadas: CitaFamilia[];
  userId: string;
  currentProfesorId: string | null;
  isAdmin: boolean;
  profesores: ProfesorOption[];
  /** User's profiles have the "citas-familias" module enabled */
  canSolicitar: boolean;
  /** Leadership roles with an active holder, for the request form */
  cargos: { cargo: CargoDirectivoClave; nombre: string }[];
}

interface RegistrarForm {
  fecha: string;
  hora_inicio: string;
  lugar: string;
}


export default function CitasFamiliasClient({ initialCitas, initialDerivadas, userId, currentProfesorId, isAdmin, profesores, canSolicitar, cargos }: Props) {
  const [citas, setCitas] = useState<CitaFamilia[]>(initialCitas);
  const [derivadasAjenas, setDerivadasAjenas] = useState<CitaFamilia[]>(initialDerivadas);
  const [refreshing, setRefreshing] = useState(false);
  // Only the latest refresh may update the list (tabs can be switched quickly)
  const refreshSeq = useRef(0);
  const [activeTab, setActiveTab] = useState<Tab>("pendiente");
  const [saving, setSaving] = useState(false);
  const [registrarId, setRegistrarId] = useState<number | null>(null);
  const [registrarForm, setRegistrarForm] = useState<RegistrarForm>({ fecha: "", hora_inicio: "", lugar: "" });
  const [showNueva, setShowNueva] = useState(false);
  const [showSolicitar, setShowSolicitar] = useState(false);
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [cancelMotivo, setCancelMotivo] = useState("");
  const [selectedCita, setSelectedCita] = useState<CitaFamilia | null>(null);
  const [filtroProfesorId, setFiltroProfesorId] = useState<string>(currentProfesorId ?? "");

  const tabs: Tab[] = ["pendiente", "confirmada", "completada", "derivada", "cancelada"];
  const citasFiltradas = isAdmin && filtroProfesorId
    ? citas.filter((c) => c.profesor_id === filtroProfesorId)
    : citas;
  // Referred by the selected teacher (admin filter) or by the user, whoever it went to
  const derivadorId = isAdmin ? filtroProfesorId : currentProfesorId;
  const derivadas = [...citas, ...derivadasAjenas]
    .filter((c) => c.derivada_por && (isAdmin && !filtroProfesorId ? true : c.derivada_por === derivadorId))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const isDerivadasTab = activeTab === "derivada";
  const filtered = isDerivadasTab ? derivadas : citasFiltradas.filter((c) => c.estado === activeTab);
  const pendienteCount = citasFiltradas.filter((c) => c.estado === "pendiente").length;
  const confirmadaCount = citasFiltradas.filter((c) => c.estado === "confirmada").length;

  const efectiveProfesorId = isAdmin ? (filtroProfesorId || userId) : userId;

  // Reload the list from the server so changes made by others (e.g. the recipient of a
  // referred appointment, or a family cancelling) show up without leaving the page
  async function refreshCitas() {
    const seq = ++refreshSeq.current;
    setRefreshing(true);
    try {
      const res = await fetch("/api/citas/listado", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { citas: CitaFamilia[]; derivadas: CitaFamilia[] };
      if (seq !== refreshSeq.current) return;
      setCitas(data.citas);
      setDerivadasAjenas(data.derivadas);
    } catch {
      // Keep the current list if the network fails; the next tab change retries
    } finally {
      if (seq === refreshSeq.current) setRefreshing(false);
    }
  }

  function changeTab(tab: Tab) {
    setActiveTab(tab);
    void refreshCitas();
  }

  // "Registrar cita" (pending) and "Modificar" (confirmed) share the date/time/place modal
  function openRegistrar(cita: CitaFamilia) {
    setSelectedCita(cita);
    setRegistrarForm(
      cita.estado === "confirmada"
        ? { fecha: cita.fecha ?? "", hora_inicio: cita.hora_inicio?.slice(0, 5) ?? "", lugar: cita.lugar ?? "" }
        : { fecha: "", hora_inicio: "", lugar: "" }
    );
    setRegistrarId(cita.id);
  }

  function closeRegistrar() {
    setRegistrarId(null);
    setRegistrarForm({ fecha: "", hora_inicio: "", lugar: "" });
  }

  async function handleRegistrar(citaId: number) {
    const lugar = registrarForm.lugar.trim();
    if (!registrarForm.fecha || !registrarForm.hora_inicio || !lugar) return;
    setSaving(true);
    try {
      const res = await fetch("/api/citas/confirmar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ citaId, fecha: registrarForm.fecha, hora_inicio: registrarForm.hora_inicio, lugar }),
      });
      const data = (await res.json().catch(() => ({}))) as { cita?: Partial<CitaFamilia>; error?: string };
      if (!res.ok || !data.cita) throw new Error(data.error);
      const cita = data.cita;
      setCitas((prev) => prev.map((c) => (c.id === citaId ? { ...c, ...cita } : c)));
      closeRegistrar();
    } catch (err) {
      alert(err instanceof Error && err.message ? err.message : "Error al guardar la cita. Inténtelo de nuevo.");
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

  async function handleNuevaCita(data: RegistrarCitaData) {
    const res = await fetch("/api/citas/registrar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, profesor_id: isAdmin ? efectiveProfesorId : undefined }),
    });
    const json = (await res.json().catch(() => ({}))) as { cita?: Omit<CitaFamilia, "profesor">; profesorNombre?: string; error?: string };
    if (!res.ok || !json.cita) throw new Error(json.error ?? "Error al registrar la cita. Inténtelo de nuevo.");
    const cita = json.cita;
    setCitas((prev) => [{ ...cita, profesor: { full_name: json.profesorNombre ?? "—", email: "" } }, ...prev]);
    setShowNueva(false);
    setActiveTab("confirmada");
  }

  function handleSolicitudCreada(cita: CitaFamilia) {
    // Admins see every appointment and teachers their own; otherwise it is someone
    // else's appointment and only shows up in the read-only "Derivadas" tab
    if (isAdmin || cita.profesor_id === currentProfesorId) {
      setCitas((prev) => [cita, ...prev]);
    } else {
      setDerivadasAjenas((prev) => [cita, ...prev]);
    }
    setActiveTab("derivada");
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
        <div className="flex items-center gap-2">
          {canSolicitar && (
            <button
              onClick={() => setShowSolicitar(true)}
              aria-label="Derivar cita a otro profesor/a o cargo directivo"
              className="flex items-center gap-2 px-4 py-2 min-h-[44px] bg-blue-700 text-white rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors"
            >
              <Forward className="w-4 h-4" />
              <span className="hidden sm:inline">Derivar cita</span>
            </button>
          )}
          <button
            onClick={() => setShowNueva(true)}
            aria-label="Registrar mi cita con una familia"
            className="flex items-center gap-2 px-4 py-2 min-h-[44px] bg-red-700 text-white rounded-lg text-sm font-medium hover:bg-red-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Registrar mi cita</span>
          </button>
        </div>
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
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => changeTab(tab)}
            className={`flex-1 min-w-max px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
          >
            {TAB_LABELS[tab]}
            {tab === "pendiente" && pendienteCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">
                {pendienteCount}
              </span>
            )}
            {tab === "confirmada" && confirmadaCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                {confirmadaCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Fixed height so the list does not jump while refreshing */}
      <p aria-live="polite" className="h-5 mb-2 text-xs text-gray-400 flex items-center justify-end gap-1">
        {refreshing && <><Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> Actualizando…</>}
      </p>

      {isDerivadasTab && (
        <p className="text-sm text-blue-900 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-start gap-2">
          <Forward className="w-4 h-4 mt-0.5 shrink-0 text-blue-600" aria-hidden="true" />
          <span>
            Citas que {isAdmin && !filtroProfesorId ? "se han derivado" : "has derivado"} a otro profesor/a o cargo directivo.
            Aquí puedes consultar su estado; solo las gestiona la persona que las recibe.
          </span>
        </p>
      )}

      {/* Lista de citas */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{isDerivadasTab ? "No hay citas derivadas" : "No hay citas en este estado"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((cita) => (
            <CitaCard
              key={cita.id}
              cita={cita}
              showProfesor={isAdmin || isDerivadasTab}
              actions={!isDerivadasTab && (isAdmin || cita.profesor_id === userId) && (
                <>
                  {cita.estado === "pendiente" && (
                    <button
                      onClick={() => openRegistrar(cita)}
                      className="px-3 py-2 min-h-[40px] bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-1.5"
                    >
                      <CalendarCheck className="w-4 h-4" />
                      Registrar cita
                    </button>
                  )}
                  {cita.estado === "confirmada" && (
                    <button
                      onClick={() => openRegistrar(cita)}
                      aria-label={`Modificar la cita ${cita.codigo}`}
                      className="px-3 py-2 min-h-[40px] bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors flex items-center gap-1.5"
                    >
                      <Pencil className="w-4 h-4" />
                      Modificar
                    </button>
                  )}
                  {cita.estado === "confirmada" && (
                    <button
                      onClick={() => handleCompletar(cita.id)}
                      disabled={saving}
                      className="px-3 py-2 min-h-[40px] bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      Completada
                    </button>
                  )}
                  {(cita.estado === "pendiente" || cita.estado === "confirmada") && (
                    <button
                      onClick={() => { setCancelId(cita.id); setCancelMotivo(""); }}
                      className="px-3 py-2 min-h-[40px] bg-gray-100 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors flex items-center gap-1.5"
                    >
                      <X className="w-4 h-4" />
                      Cancelar
                    </button>
                  )}
                </>
              )}
            />
          ))}
        </div>
      )}

      {/* Modal: Registrar fecha/hora (pending) or Modificar (confirmed) */}
      {registrarId !== null && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="font-bold text-gray-900 mb-1">
              {selectedCita?.estado === "confirmada" ? "Modificar cita" : "Registrar cita"}
            </h2>
            {selectedCita && (
              <p className="text-sm text-gray-500 mb-4">
                {selectedCita.alumno_nombre} · {selectedCita.familiar_nombre}
              </p>
            )}
            {selectedCita?.estado === "confirmada" && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
                {selectedCita.familiar_email
                  ? "La familia recibirá un email con la nueva fecha, hora y lugar."
                  : "Esta familia no tiene email: avísela del cambio por teléfono."}
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
                <input type="text" value={registrarForm.lugar} onChange={(e) => setRegistrarForm((f) => ({ ...f, lugar: e.target.value }))}
                  placeholder="Ej: Sala de visitas" maxLength={100}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => handleRegistrar(registrarId)}
                disabled={saving || !registrarForm.fecha || !registrarForm.hora_inicio || !registrarForm.lugar.trim()}
                className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {saving ? "Guardando..." : selectedCita?.estado === "confirmada" ? "Guardar cambios" : "Confirmar cita"}
              </button>
              <button onClick={closeRegistrar}
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

      {/* Modal: Derivar cita — refer a family to another teacher or leadership role */}
      {showSolicitar && canSolicitar && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl my-4">
            <div className="flex items-center justify-between px-6 py-4 bg-blue-800 rounded-t-xl">
              <h2 className="font-bold text-white">Derivar cita a otro profesor/a o cargo directivo</h2>
              <button onClick={() => setShowSolicitar(false)} aria-label="Cerrar" className="p-2 -m-2 text-blue-100 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-6">
              <SolicitudCitaForm
                cargos={cargos}
                onCreated={handleSolicitudCreada}
                onClose={() => setShowSolicitar(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal: Registrar mi cita — the user's own appointment, created as confirmed */}
      {showNueva && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl my-4">
            <div className="flex items-center justify-between px-6 py-4 bg-red-800 rounded-t-xl">
              <h2 className="font-bold text-white">Registrar mi cita con una familia</h2>
              <button onClick={() => setShowNueva(false)} aria-label="Cerrar" className="p-2 -m-2 text-red-100 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-6">
              <RegistrarCitaForm onSubmit={handleNuevaCita} onClose={() => setShowNueva(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

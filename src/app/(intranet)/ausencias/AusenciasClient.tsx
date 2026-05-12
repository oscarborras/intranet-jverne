"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  UserX, Plus, X, ChevronDown, ChevronUp,
  Calendar, Clock, BookOpen, MapPin, AlertCircle,
  Loader2, ShieldCheck, Users, CheckCircle2, Paperclip, Download,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { AusenciaProfesorado, TramoHorario, Curso } from "@/lib/types";

interface Props {
  misAusencias: AusenciaProfesorado[];
  guardiaAusencias: AusenciaProfesorado[] | null;
  tramos: TramoHorario[];
  cursos: Curso[];
  userId: string;
  canViewGuardia: boolean;
}

type Tab = "mis" | "guardia";

function localDateISO(): string {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}

const EMPTY_FORM = {
  fecha: localDateISO(),
  tramo_id: "",
  curso_id: "",
  aula: "",
  tareas: "",
  observaciones: "",
};

function getTramoPositionLabel(tramo: TramoHorario, allTramos: TramoHorario[]): string {
  if (tramo.es_recreo) return "R";
  const sorted = [...allTramos].sort((a, b) => a.orden - b.orden);
  const ordinals = ["1ª", "2ª", "3ª", "4ª", "5ª", "6ª", "7ª", "8ª"];
  let count = 0;
  for (const t of sorted) {
    if (!t.es_recreo) {
      count++;
      if (t.id === tramo.id) return `${ordinals[count - 1] ?? count + "ª"} hora`;
    }
  }
  return "";
}

function formatFecha(fecha: string) {
  return new Date(fecha + "T00:00:00").toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function BadgeEstado({ estado }: { estado: string }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full",
      estado === "activa"
        ? "bg-amber-100 text-amber-700"
        : "bg-gray-100 text-gray-500 line-through"
    )}>
      {estado === "activa" ? "Activa" : "Cancelada"}
    </span>
  );
}

// ─── Download button ──────────────────────────────────────────────────────────

function DownloadButton({ path, nombre }: { path: string; nombre: string }) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.storage.from("ausencias").createSignedUrl(path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    setLoading(false);
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
    >
      {loading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
      {nombre}
    </button>
  );
}

// ─── Guardia view ─────────────────────────────────────────────────────────────

function GuardiaView({ initial, initialFecha, tramos }: { initial: AusenciaProfesorado[]; initialFecha: string; tramos: TramoHorario[] }) {
  const [fecha, setFecha] = useState(initialFecha);
  const [ausencias, setAusencias] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const loadFecha = useCallback(async (f: string) => {
    setLoading(true);
    const supabase = createClient();
    const { data: rows } = await supabase
      .from("ausencias_profesorado")
      .select("*, tramos_horarios(id, nombre, hora_inicio, hora_fin, es_recreo, orden), cursos(id, nombre, email_tutor)")
      .eq("fecha", f)
      .eq("estado", "activa")
      .order("tramo_id");

    if (rows && rows.length > 0) {
      const ids = [...new Set(rows.map((r) => r.profesor_id as string))];
      const { data: profiles } = await supabase
        .from("users_view")
        .select("id, full_name")
        .in("id", ids);
      const nameMap = Object.fromEntries(
        (profiles ?? []).map((p) => [p.id, p.full_name as string])
      );
      setAusencias(rows.map((r) => ({
        ...r,
        profesor: { full_name: nameMap[r.profesor_id as string] ?? "—" },
      })));
    } else {
      setAusencias([]);
    }
    setLoading(false);
    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    const id = setInterval(() => loadFecha(fecha), 2 * 60 * 1000);
    return () => clearInterval(id);
  }, [fecha, loadFecha]);

  function handleFechaChange(f: string) {
    setFecha(f);
    loadFecha(f);
  }

  const isToday = fecha === localDateISO();

  return (
    <div className="space-y-4">
      {/* Date selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Calendar size={15} className="text-gray-400" />
          <input
            type="date"
            value={fecha}
            onChange={(e) => handleFechaChange(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {isToday && (
          <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">Hoy</span>
        )}
        {loading
          ? <Loader2 size={15} className="animate-spin text-gray-400" />
          : <span className="text-xs text-gray-400">Actualizado a las {lastUpdated.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}</span>
        }
      </div>

      {/* Table / empty state */}
      {!loading && ausencias.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-xl px-6 py-10 text-center">
          <CheckCircle2 size={32} className="text-green-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-green-700">
            No hay ausencias registradas para este día
          </p>
          <p className="text-xs text-green-600 mt-1">Todo el profesorado está presente</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Profesor/a</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tramo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Curso / Grupo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Aula</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tareas para el alumnado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Adjunto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {ausencias.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {a.profesor?.full_name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <div className="text-sm">{a.tramos_horarios?.nombre ?? "—"}</div>
                      <div className="text-xs text-gray-400">
                        {a.tramos_horarios ? getTramoPositionLabel(a.tramos_horarios, tramos) : "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{a.cursos?.nombre ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 text-gray-600">{a.aula ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3">
                      {a.tareas ? (
                        <p className="text-gray-700 text-sm whitespace-pre-wrap">{a.tareas}</p>
                      ) : (
                        <span className="text-gray-300 text-sm">Sin tareas indicadas</span>
                      )}
                      {a.observaciones && (
                        <p className="text-xs text-gray-400 mt-1 italic">{a.observaciones}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {a.adjunto_path && a.adjunto_nombre
                        ? <DownloadButton path={a.adjunto_path} nombre={a.adjunto_nombre} />
                        : <span className="text-gray-300 text-sm">—</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-50">
            {ausencias.map((a) => (
              <div key={a.id} className="p-4 space-y-2">
                <p className="font-semibold text-gray-900 text-sm">{a.profesor?.full_name ?? "—"}</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                    <Clock size={11} /> {a.tramos_horarios?.nombre}
                  </span>
                  {a.cursos?.nombre && (
                    <span className="flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                      <Users size={11} /> {a.cursos.nombre}
                    </span>
                  )}
                  {a.aula && (
                    <span className="flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      <MapPin size={11} /> {a.aula}
                    </span>
                  )}
                </div>
                {a.tareas && (
                  <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs text-amber-900">
                    <p className="font-semibold mb-0.5">Tareas:</p>
                    <p className="whitespace-pre-wrap">{a.tareas}</p>
                  </div>
                )}
                {a.adjunto_path && a.adjunto_nombre && (
                  <DownloadButton path={a.adjunto_path} nombre={a.adjunto_nombre} />
                )}
                {a.observaciones && (
                  <p className="text-xs text-gray-400 italic">{a.observaciones}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AusenciasClient({
  misAusencias: initialAusencias,
  guardiaAusencias,
  tramos,
  cursos,
  userId,
  canViewGuardia,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>(canViewGuardia ? "guardia" : "mis");
  const [misAusencias, setMisAusencias] = useState(initialAusencias);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [adjunto, setAdjunto] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const today = localDateISO();

  function resetForm() {
    setForm(EMPTY_FORM);
    setAdjunto(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setFormError(null);
  }

  async function handleCreate() {
    if (!form.fecha || !form.tramo_id || !form.curso_id) {
      setFormError("Fecha, tramo y curso / grupo son obligatorios.");
      return;
    }
    setSaving(true);
    setFormError(null);

    let adjunto_path: string | null = null;
    let adjunto_nombre: string | null = null;

    if (adjunto) {
      const supabase = createClient();
      const safeName = adjunto.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `${userId}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("ausencias")
        .upload(storagePath, adjunto);
      if (uploadError) {
        setFormError("Error al subir el fichero adjunto. Inténtalo de nuevo.");
        setSaving(false);
        return;
      }
      adjunto_path = storagePath;
      adjunto_nombre = adjunto.name;
    }

    const res = await fetch("/api/ausencias/crear", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fecha: form.fecha,
        tramo_id: Number(form.tramo_id),
        curso_id: Number(form.curso_id),
        aula: form.aula || null,
        tareas: form.tareas || null,
        observaciones: form.observaciones || null,
        adjunto_path,
        adjunto_nombre,
      }),
    });

    const json = await res.json() as { success?: boolean; id?: number; codigo?: string; error?: string };

    if (!res.ok || !json.success) {
      setFormError(json.error ?? "Error al registrar la ausencia.");
      setSaving(false);
      return;
    }

    const tramo = tramos.find((t) => t.id === Number(form.tramo_id));
    const curso = cursos.find((c) => c.id === Number(form.curso_id)) ?? null;

    const newAusencia: AusenciaProfesorado = {
      id: json.id!,
      codigo: json.codigo ?? null,
      profesor_id: userId,
      fecha: form.fecha,
      tramo_id: Number(form.tramo_id),
      curso_id: Number(form.curso_id),
      aula: form.aula || null,
      tareas: form.tareas || null,
      observaciones: form.observaciones || null,
      adjunto_path,
      adjunto_nombre,
      estado: "activa",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tramos_horarios: tramo,
      cursos: curso,
    };

    setMisAusencias((prev) => [newAusencia, ...prev]);
    resetForm();
    setShowForm(false);
    setSaving(false);
    setActiveTab("mis");
  }

  async function handleCancel(id: number) {
    setCancellingId(id);
    const res = await fetch("/api/ausencias/cancelar", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setMisAusencias((prev) =>
        prev.map((a) => (a.id === id ? { ...a, estado: "cancelada" as const } : a))
      );
    }
    setCancellingId(null);
  }

  const tramosOrdenados = [...tramos].sort((a, b) => a.orden - b.orden);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <UserX size={24} className="text-amber-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Ausencias</h1>
            <p className="text-sm text-gray-500">Notificación de ausencias y tareas para el alumnado</p>
          </div>
        </div>
        <button
          onClick={() => { setShowForm(true); setActiveTab("mis"); }}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-semibold transition-colors"
        >
          <Plus size={15} /> Registrar ausencia
        </button>
      </div>

      {/* Tabs */}
      {canViewGuardia && (
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab("guardia")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              activeTab === "guardia"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <ShieldCheck size={15} /> Vista Guardia
          </button>
          <button
            onClick={() => setActiveTab("mis")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              activeTab === "mis"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <UserX size={15} /> Mis ausencias
          </button>
        </div>
      )}

      {/* ── Vista Guardia ── */}
      {activeTab === "guardia" && guardiaAusencias !== null && (
        <GuardiaView initial={guardiaAusencias} initialFecha={today} tramos={tramos} />
      )}

      {/* ── Mis Ausencias ── */}
      {activeTab === "mis" && (
        <div className="space-y-4">

          {/* New absence form */}
          {showForm && (
            <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
              <div className="bg-amber-500 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Plus size={16} className="text-white" />
                  <h2 className="text-white font-semibold text-sm">Registrar nueva ausencia</h2>
                </div>
                <button onClick={() => { setShowForm(false); resetForm(); }}>
                  <X size={18} className="text-white/80 hover:text-white" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {formError && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
                    <AlertCircle size={14} className="flex-shrink-0" /> {formError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Fecha */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Fecha <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={form.fecha}
                      onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>

                  {/* Tramo */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Tramo horario <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.tramo_id}
                      onChange={(e) => setForm((f) => ({ ...f, tramo_id: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                    >
                      <option value="">Selecciona un tramo</option>
                      {tramosOrdenados.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nombre} ({getTramoPositionLabel(t, tramos)})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Curso */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Curso / Grupo <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.curso_id}
                      onChange={(e) => setForm((f) => ({ ...f, curso_id: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                    >
                      <option value="">Selecciona un grupo</option>
                      {cursos.map((c) => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                    </select>
                  </div>

                  {/* Aula */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Aula</label>
                    <input
                      type="text"
                      value={form.aula}
                      onChange={(e) => setForm((f) => ({ ...f, aula: e.target.value }))}
                      placeholder="Ej: Aula B2"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                </div>

                {/* Tareas */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Tareas para el alumnado
                  </label>
                  <textarea
                    rows={3}
                    value={form.tareas}
                    onChange={(e) => setForm((f) => ({ ...f, tareas: e.target.value }))}
                    placeholder="Describe las actividades que debe realizar el alumnado durante tu ausencia..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                  />
                </div>

                {/* Observaciones */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Observaciones</label>
                  <textarea
                    rows={2}
                    value={form.observaciones}
                    onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))}
                    placeholder="Información adicional para el profesorado de guardia..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                  />
                </div>

                {/* Adjunto */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Fichero con las tareas <span className="text-gray-400 font-normal">(opcional, máx. 10 MB)</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                      <Paperclip size={14} className="text-gray-400" />
                      {adjunto ? adjunto.name : "Seleccionar fichero"}
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
                        onChange={(e) => setAdjunto(e.target.files?.[0] ?? null)}
                      />
                    </label>
                    {adjunto && (
                      <button
                        type="button"
                        onClick={() => { setAdjunto(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={() => { setShowForm(false); resetForm(); }}
                    className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2 text-sm bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white rounded-lg font-semibold transition-colors"
                  >
                    {saving && <Loader2 size={14} className="animate-spin" />}
                    Registrar ausencia
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Absence list */}
          {misAusencias.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 py-16 text-center">
              <UserX size={32} className="text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No tienes ausencias registradas</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-3 text-sm text-amber-600 hover:text-amber-700 font-medium"
              >
                Registrar primera ausencia →
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {misAusencias.map((a) => {
                const isExpanded = expandedId === a.id;
                return (
                  <div
                    key={a.id}
                    className={cn(
                      "bg-white rounded-xl border overflow-hidden transition-all",
                      a.estado === "cancelada" ? "border-gray-100 opacity-60" : "border-gray-100"
                    )}
                  >
                    <div
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
                      onClick={() => setExpandedId(isExpanded ? null : a.id)}
                    >
                      <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4">
                        <div className="flex items-center gap-1.5 text-sm text-gray-700 font-medium">
                          <Calendar size={13} className="text-gray-400 flex-shrink-0" />
                          {formatFecha(a.fecha)}
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <Clock size={13} className="text-gray-400 flex-shrink-0" />
                          {a.tramos_horarios?.nombre ?? `Tramo ${a.tramo_id}`}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <BadgeEstado estado={a.estado} />
                          {a.cursos && (
                            <span className="text-xs text-gray-500">{a.cursos.nombre}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {a.estado === "activa" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleCancel(a.id); }}
                            disabled={cancellingId === a.id}
                            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Cancelar ausencia"
                          >
                            {cancellingId === a.id
                              ? <Loader2 size={14} className="animate-spin" />
                              : <X size={14} />
                            }
                          </button>
                        )}
                        {isExpanded
                          ? <ChevronUp size={15} className="text-gray-400" />
                          : <ChevronDown size={15} className="text-gray-400" />
                        }
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-gray-50 px-4 py-3 space-y-2.5 bg-gray-50/40">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                          {a.aula && (
                            <div className="flex items-start gap-2">
                              <MapPin size={13} className="text-gray-400 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-[11px] text-gray-400 font-medium uppercase">Aula</p>
                                <p className="text-gray-700">{a.aula}</p>
                              </div>
                            </div>
                          )}
                          {a.codigo && (
                            <div className="flex items-start gap-2">
                              <BookOpen size={13} className="text-gray-400 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-[11px] text-gray-400 font-medium uppercase">Código</p>
                                <p className="text-gray-500 font-mono text-xs">{a.codigo}</p>
                              </div>
                            </div>
                          )}
                        </div>
                        {a.tareas && (
                          <div>
                            <p className="text-[11px] text-gray-400 font-semibold uppercase mb-1">Tareas para el alumnado</p>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">{a.tareas}</p>
                          </div>
                        )}
                        {a.adjunto_path && a.adjunto_nombre && (
                          <div>
                            <p className="text-[11px] text-gray-400 font-semibold uppercase mb-1">Fichero adjunto</p>
                            <DownloadButton path={a.adjunto_path} nombre={a.adjunto_nombre} />
                          </div>
                        )}
                        {a.observaciones && (
                          <div>
                            <p className="text-[11px] text-gray-400 font-semibold uppercase mb-1">Observaciones</p>
                            <p className="text-sm text-gray-600 italic">{a.observaciones}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

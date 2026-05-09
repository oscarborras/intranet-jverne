"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus, X, Pencil, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { CalendarEvento, TipoEventoIntranet, AsuntoPropios } from "@/lib/types";

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const COLOR_CLASSES: Record<string, string> = {
  blue: "bg-blue-100 text-blue-700",
  purple: "bg-purple-100 text-purple-700",
  green: "bg-green-100 text-green-700",
  red: "bg-red-100 text-red-700",
  orange: "bg-orange-100 text-orange-700",
  yellow: "bg-yellow-100 text-yellow-700",
  gray: "bg-gray-100 text-gray-700",
};

function tipoClasses(tipo: string, tipoMap: Map<string, TipoEventoIntranet>): string {
  const color = tipoMap.get(tipo)?.color ?? "gray";
  return COLOR_CLASSES[color] ?? COLOR_CLASSES.gray;
}

interface Props {
  initialEventos: CalendarEvento[];
  tiposEvento: TipoEventoIntranet[];
  userId: string;
  canManageEvents: boolean;
  initialAsuntos: AsuntoPropios[];
  maxAsuntosPropios: number;
  profesores: { id: string; profesor: string }[];
  canManageAsuntos: boolean;
}

interface EventForm {
  titulo: string;
  descripcion: string;
  fecha_inicio: string;
  fecha_fin: string;
  tipo: string;
  todo_el_dia: boolean;
  hora_inicio: string;
  hora_fin: string;
}

function formatTime(t: string | null): string {
  if (!t) return "";
  return t.slice(0, 5); // "HH:MM:SS" → "HH:MM"
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month - 1, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function CalendarioClient({
  initialEventos, tiposEvento, userId, canManageEvents,
  initialAsuntos, maxAsuntosPropios, profesores, canManageAsuntos,
}: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [eventos, setEventos] = useState<CalendarEvento[]>(initialEventos);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const [modalEvento, setModalEvento] = useState<CalendarEvento | "new" | null>(null);
  const [newEventDate, setNewEventDate] = useState<string>("");
  const defaultTipo = tiposEvento[0]?.nombre ?? "";
  const [form, setForm] = useState<EventForm>({
    titulo: "", descripcion: "", fecha_inicio: "", fecha_fin: "", tipo: defaultTipo,
    todo_el_dia: true, hora_inicio: "", hora_fin: "",
  });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [asuntos, setAsuntos] = useState<AsuntoPropios[]>(initialAsuntos);
  const [addingAsunto, setAddingAsunto] = useState(false);
  const [selectedProfesorId, setSelectedProfesorId] = useState("");
  const [savingAsunto, setSavingAsunto] = useState(false);

  const tipoMap = useMemo(
    () => new Map(tiposEvento.map(t => [t.nombre, t])),
    [tiposEvento]
  );

  const asuntosByDate = useMemo(() => {
    const map: Record<string, AsuntoPropios[]> = {};
    asuntos.forEach((a) => {
      if (!map[a.fecha]) map[a.fecha] = [];
      map[a.fecha].push(a);
    });
    return map;
  }, [asuntos]);

  const fetchMonth = useCallback(async (y: number, m: number) => {
    const supabase = createClient();
    const first = toDateStr(y, m, 1);
    const last = toDateStr(y, m, getDaysInMonth(y, m));
    const [{ data: ev }, { data: ap }] = await Promise.all([
      supabase.from("calendar_eventos").select("*").lte("fecha_inicio", last).gte("fecha_fin", first),
      supabase.from("asuntos_propios").select("*").gte("fecha", first).lte("fecha", last),
    ]);
    setEventos((ev ?? []) as CalendarEvento[]);
    setAsuntos((ap ?? []) as AsuntoPropios[]);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("calendar-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "calendar_eventos" }, () => {
        fetchMonth(year, month);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [year, month, fetchMonth]);

  function prevMonth() {
    const nm = month === 1 ? 12 : month - 1;
    const ny = month === 1 ? year - 1 : year;
    setYear(ny); setMonth(nm);
    fetchMonth(ny, nm);
  }

  function nextMonth() {
    const nm = month === 12 ? 1 : month + 1;
    const ny = month === 12 ? year + 1 : year;
    setYear(ny); setMonth(nm);
    fetchMonth(ny, nm);
  }

  function openNew(dateStr: string) {
    setNewEventDate(dateStr);
    setForm({
      titulo: "", descripcion: "", fecha_inicio: dateStr, fecha_fin: dateStr, tipo: defaultTipo,
      todo_el_dia: true, hora_inicio: "", hora_fin: "",
    });
    setModalEvento("new");
  }

  function openEdit(evento: CalendarEvento) {
    setForm({
      titulo: evento.titulo,
      descripcion: evento.descripcion ?? "",
      fecha_inicio: evento.fecha_inicio.split("T")[0],
      fecha_fin: evento.fecha_fin.split("T")[0],
      tipo: evento.tipo,
      todo_el_dia: evento.todo_el_dia,
      hora_inicio: formatTime(evento.hora_inicio),
      hora_fin: formatTime(evento.hora_fin),
    });
    setModalEvento(evento);
  }

  function closeModal() {
    setModalEvento(null);
    setForm({
      titulo: "", descripcion: "", fecha_inicio: "", fecha_fin: "", tipo: defaultTipo,
      todo_el_dia: true, hora_inicio: "", hora_fin: "",
    });
  }

  async function handleSave() {
    if (!form.titulo.trim()) return;
    setSaving(true);
    const supabase = createClient();

    const timePayload = form.todo_el_dia
      ? { todo_el_dia: true, hora_inicio: null, hora_fin: null }
      : { todo_el_dia: false, hora_inicio: form.hora_inicio || null, hora_fin: form.hora_fin || null };

    if (modalEvento === "new") {
      const { data } = await supabase
        .from("calendar_eventos")
        .insert({ titulo: form.titulo, descripcion: form.descripcion, fecha_inicio: form.fecha_inicio, fecha_fin: form.fecha_fin, tipo: form.tipo, autor_id: userId, ...timePayload })
        .select()
        .single();
      if (data) setEventos((prev) => [...prev, data as CalendarEvento]);
    } else if (modalEvento) {
      const { data } = await supabase
        .from("calendar_eventos")
        .update({ titulo: form.titulo, descripcion: form.descripcion, fecha_inicio: form.fecha_inicio, fecha_fin: form.fecha_fin, tipo: form.tipo, ...timePayload })
        .eq("id", modalEvento.id)
        .select()
        .single();
      if (data) setEventos((prev) => prev.map((e) => e.id === modalEvento.id ? data as CalendarEvento : e));
    }

    setSaving(false);
    closeModal();
  }

  async function handleDelete(id: number) {
    const supabase = createClient();
    await supabase.from("calendar_eventos").delete().eq("id", id);
    setEventos((prev) => prev.filter((e) => e.id !== id));
    setDeletingId(null);
  }

  async function handleAddAsunto() {
    if (!selectedProfesorId || !selectedDay) return;
    const profesor = profesores.find((p) => p.id === selectedProfesorId);
    if (!profesor) return;
    setSavingAsunto(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("asuntos_propios")
      .insert({ user_id: selectedProfesorId, user_full_name: profesor.profesor, fecha: selectedDay, created_by: userId })
      .select()
      .single();
    if (!error && data) setAsuntos((prev) => [...prev, data as AsuntoPropios]);
    setSavingAsunto(false);
    setAddingAsunto(false);
    setSelectedProfesorId("");
  }

  async function handleRemoveAsunto(id: string) {
    const supabase = createClient();
    await supabase.from("asuntos_propios").delete().eq("id", id);
    setAsuntos((prev) => prev.filter((a) => a.id !== id));
  }

  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOffset = getFirstDayOfMonth(year, month);
  const todayStr = toDateStr(today.getFullYear(), today.getMonth() + 1, today.getDate());

  const eventosByDate: Record<string, CalendarEvento[]> = {};
  eventos.forEach((e) => {
    const cur = new Date(e.fecha_inicio.split("T")[0] + "T12:00:00");
    const end = new Date(e.fecha_fin.split("T")[0] + "T12:00:00");
    while (cur <= end) {
      const key = cur.toISOString().split("T")[0];
      if (!eventosByDate[key]) eventosByDate[key] = [];
      eventosByDate[key].push(e);
      cur.setDate(cur.getDate() + 1);
    }
  });

  const selectedDayEvents = selectedDay ? (eventosByDate[selectedDay] ?? []) : [];
  const isEditing = modalEvento !== null && modalEvento !== "new";

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Calendario</h1>
        <p className="text-sm text-gray-500">Consulta los eventos del centro</p>
      </div>

      {canManageEvents && (
        <div className="bg-cyan-50 border border-cyan-200 rounded-xl px-4 py-2.5 flex items-center gap-2 text-sm text-cyan-700">
          <Plus size={14} />
          <span>Haz <strong>doble clic</strong> en un día para añadir un evento</span>
        </div>
      )}

      {/* Calendar grid */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
            <ChevronLeft size={18} />
          </button>
          <h2 className="font-semibold text-blue-700 text-lg">
            {MONTHS[month - 1]} {year}
          </h2>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 border-b border-gray-100">
          {DAYS.map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-gray-500 py-2">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {Array.from({ length: firstDayOffset }).map((_, i) => (
            <div key={`empty-${i}`} className="border-b border-r border-gray-50 min-h-[80px]" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = toDateStr(year, month, day);
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDay;
            const isWeekend = (firstDayOffset + i) % 7 >= 5;
            const dayEvents = eventosByDate[dateStr] ?? [];

            return (
              <div
                key={day}
                className={cn(
                  "border-b border-r border-gray-50 min-h-[80px] p-1 cursor-pointer transition-colors",
                  isWeekend && "bg-red-50/40",
                  isSelected && "bg-blue-50",
                  !isWeekend && !isSelected && "hover:bg-gray-50"
                )}
                onClick={() => {
                  setSelectedDay(dateStr === selectedDay ? null : dateStr);
                  setDeletingId(null);
                  setAddingAsunto(false);
                  setSelectedProfesorId("");
                }}
                onDoubleClick={() => canManageEvents && openNew(dateStr)}
              >
                <div className="flex items-center gap-1 mb-1 min-w-0">
                  <div className={cn(
                    "w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium flex-shrink-0",
                    isToday ? "bg-blue-600 text-white" : "text-gray-700"
                  )}>
                    {day}
                  </div>
                  {asuntosByDate[dateStr] && (() => {
                    const libre = maxAsuntosPropios - (asuntosByDate[dateStr]?.length ?? 0);
                    return (
                      <span className={cn(
                        "text-xs font-semibold px-1.5 py-0.5 rounded-full truncate leading-tight",
                        libre > 0
                          ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-600"
                      )}>
                        {libre > 0 ? `${libre} plaza${libre !== 1 ? "s" : ""} libres` : "Completo"}
                      </span>
                    );
                  })()}
                </div>
                {dayEvents.slice(0, 2).map((e) => (
                  <div
                    key={e.id}
                    className={cn("text-xs px-1.5 py-0.5 rounded mb-0.5 truncate", tipoClasses(e.tipo, tipoMap))}
                  >
                    {!e.todo_el_dia && e.hora_inicio && (
                      <span className="font-semibold mr-1">{formatTime(e.hora_inicio)}</span>
                    )}
                    {e.titulo}
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <div className="text-xs text-gray-400 px-1">+{dayEvents.length - 2}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Plazas info note */}
      <p className="text-xs text-gray-400 text-center">
        Los días sin etiqueta de plazas tienen todas las plazas de asuntos propios disponibles.
      </p>

      {/* Day detail panel */}
      {selectedDay && (() => {
        const dayAsuntos = asuntosByDate[selectedDay] ?? [];
        const libre = maxAsuntosPropios - dayAsuntos.length;
        const yaRegistrado = (id: string) => dayAsuntos.some((a) => a.user_id === id);

        return (
          <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            {/* ── Header: selected date ── */}
            <div className="bg-gray-700 px-5 py-3 flex items-center justify-between">
              <h3 className="font-semibold text-white text-sm capitalize tracking-wide">
                {new Date(selectedDay + "T12:00:00").toLocaleDateString("es-ES", {
                  weekday: "long", day: "numeric", month: "long", year: "numeric",
                })}
              </h3>
              <button
                onClick={() => { setSelectedDay(null); setDeletingId(null); setAddingAsunto(false); }}
                className="text-gray-300 hover:text-white transition-colors cursor-pointer"
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>

            {/* ── Eventos section ── */}
            <div className="bg-white">
              <div className="flex items-center justify-between px-5 py-2.5 bg-blue-50 border-b border-blue-100">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-blue-500" />
                  <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Eventos</span>
                  {selectedDayEvents.length > 0 && (
                    <span className="bg-blue-100 text-blue-600 text-xs font-semibold px-1.5 py-0.5 rounded-full">
                      {selectedDayEvents.length}
                    </span>
                  )}
                </div>
                {canManageEvents && (
                  <button
                    onClick={() => openNew(selectedDay)}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                  >
                    <Plus size={13} />
                    Nuevo
                  </button>
                )}
              </div>

              {selectedDayEvents.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-5">Sin eventos para este día</p>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {selectedDayEvents.map((e) => (
                    <li key={e.id} className="px-5 py-3 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm text-gray-900">{e.titulo}</p>
                        {!e.todo_el_dia && (e.hora_inicio || e.hora_fin) && (
                          <p className="text-xs text-blue-600 font-medium mt-0.5">
                            {formatTime(e.hora_inicio)}
                            {e.hora_inicio && e.hora_fin ? ` – ${formatTime(e.hora_fin)}` : ""}
                          </p>
                        )}
                        {e.descripcion && <p className="text-xs text-gray-500 mt-0.5">{e.descripcion}</p>}
                        <span className={cn("inline-block text-xs px-2 py-0.5 rounded-full mt-1.5", tipoClasses(e.tipo, tipoMap))}>
                          {e.tipo}
                        </span>
                      </div>

                      {canManageEvents && (
                        <div className="flex-shrink-0 flex items-center gap-1 pt-0.5">
                          {deletingId === e.id ? (
                            <>
                              <span className="text-xs text-gray-500 mr-1">¿Eliminar?</span>
                              <button onClick={() => handleDelete(e.id)} className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg cursor-pointer">Sí</button>
                              <button onClick={() => setDeletingId(null)} className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-200 cursor-pointer">No</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => openEdit(e)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"><Pencil size={14} /></button>
                              <button onClick={() => setDeletingId(e.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"><X size={14} /></button>
                            </>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* ── Asuntos propios section ── */}
            <div className="bg-white border-t-2 border-amber-200">
              <div className="flex items-center justify-between px-5 py-2.5 bg-amber-50 border-b border-amber-100">
                <div className="flex items-center gap-2">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-amber-500"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                  <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Asuntos propios</span>
                  {dayAsuntos.length > 0 && (
                    <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">
                      {dayAsuntos.length}/{maxAsuntosPropios}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {dayAsuntos.length > 0 && (
                    <span className={cn(
                      "text-xs font-medium",
                      libre > 0 ? "text-amber-600" : "text-red-500"
                    )}>
                      {libre > 0 ? `${libre} libre${libre !== 1 ? "s" : ""}` : "Completo"}
                    </span>
                  )}
                  {canManageAsuntos && libre > 0 && !addingAsunto && (
                    <button
                      onClick={() => { setAddingAsunto(true); setSelectedProfesorId(""); }}
                      className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 font-medium cursor-pointer"
                    >
                      <Plus size={13} />
                      Añadir
                    </button>
                  )}
                </div>
              </div>

              {canManageAsuntos && (
                <div className="px-5 py-3 space-y-2">
                  {/* Add form */}
                  {addingAsunto && (
                    <div className="flex items-center gap-2 mb-3">
                      <select
                        className="flex-1 border border-amber-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-amber-50"
                        value={selectedProfesorId}
                        onChange={(e) => setSelectedProfesorId(e.target.value)}
                      >
                        <option value="">Selecciona un profesor...</option>
                        {profesores.filter((p) => !yaRegistrado(p.id)).map((p) => (
                          <option key={p.id} value={p.id}>{p.profesor}</option>
                        ))}
                      </select>
                      <button
                        onClick={handleAddAsunto}
                        disabled={!selectedProfesorId || savingAsunto}
                        className="px-3 py-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium disabled:opacity-50 cursor-pointer whitespace-nowrap"
                      >
                        {savingAsunto ? "..." : "Añadir"}
                      </button>
                      <button
                        onClick={() => { setAddingAsunto(false); setSelectedProfesorId(""); }}
                        className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-200 cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}

                  {/* Professors list */}
                  {dayAsuntos.length > 0 ? (
                    <ul className="space-y-1.5">
                      {dayAsuntos.map((a) => (
                        <li key={a.id} className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                          <span className="text-sm text-gray-800">{a.user_full_name}</span>
                          <button
                            onClick={() => handleRemoveAsunto(a.id)}
                            className="text-gray-400 hover:text-red-600 transition-colors cursor-pointer ml-2 flex-shrink-0"
                            title="Eliminar registro"
                          >
                            <X size={14} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-gray-400 py-2 text-center">Sin solicitudes de asuntos propios para este día</p>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Create / Edit event modal */}
      {modalEvento !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={closeModal}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">
                {isEditing ? "Editar evento" : `Nuevo evento — ${newEventDate}`}
              </h2>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Título</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Título del evento"
                  value={form.titulo}
                  onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Descripción (opcional)</label>
                <textarea
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Descripción del evento , cursos afectados"
                  value={form.descripcion}
                  onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Fecha inicio</label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.fecha_inicio}
                    onChange={(e) => setForm((f) => ({ ...f, fecha_inicio: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Fecha fin</label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.fecha_fin}
                    min={form.fecha_inicio}
                    onChange={(e) => setForm((f) => ({ ...f, fecha_fin: e.target.value }))}
                  />
                </div>
              </div>

              {/* All-day toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                  checked={form.todo_el_dia}
                  onChange={(e) => setForm((f) => ({ ...f, todo_el_dia: e.target.checked }))}
                />
                <span className="text-sm text-gray-700">Todo el día</span>
              </label>

              {!form.todo_el_dia && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Hora inicio</label>
                    <input
                      type="time"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.hora_inicio}
                      onChange={(e) => setForm((f) => ({ ...f, hora_inicio: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Hora fin</label>
                    <input
                      type="time"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.hora_fin}
                      onChange={(e) => setForm((f) => ({ ...f, hora_fin: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs text-gray-500 mb-1">Tipo de evento</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.tipo}
                  onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
                >
                  {tiposEvento.map(t => (
                    <option key={t.id} value={t.nombre}>{t.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.titulo.trim()}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 cursor-pointer"
              >
                {saving ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear evento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

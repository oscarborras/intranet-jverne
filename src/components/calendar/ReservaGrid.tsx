"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, CheckCircle, AlertCircle, X, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TramoHorario } from "@/lib/types";

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export interface ResourceColumn {
  id: number;
  nombre: string;
  subtitulo?: string;
}

export interface Reservation {
  id: number;
  resource_id: number;
  // null for free-time bookings, which use hora_inicio/hora_fin instead
  tramo_id: number | null;
  hora_inicio?: string | null;
  hora_fin?: string | null;
  fecha: string;
  user_id: string;
  label?: string;
  user_name?: string;
}

export interface ReservationClickData {
  id: number;
  resourceName: string;
  userName: string;
  fecha: string;
  tramo: string;
  info: string;
  isOwn: boolean;
}

// Afternoon bookings with free start/end time, only for the listed resources
export interface FreeTimeConfig {
  resourceIds: number[];
  inicio: string; // "HH:MM"
  fin: string;    // "HH:MM"
  // Resolves to an error message, or null when the booking was saved
  onReserve: (resourceId: number, fecha: string, horaInicio: string, horaFin: string, extra: string) => Promise<string | null>;
}

interface Props {
  title: string;
  subtitle: string;
  resources: ResourceColumn[];
  tramos: TramoHorario[];
  reservations: Reservation[];
  userId: string;
  onReserve: (resourceId: number, tramoId: number, fecha: string, extra: string) => Promise<boolean>;
  onMonthChange?: (year: number, month: number) => void;
  reserveExtraLabel?: string;
  onReservationClick?: (data: ReservationClickData) => void;
  freeTime?: FreeTimeConfig;
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

// "HH:MM:SS" (DB) or "HH:MM" (input) → "HH:MM"; zero-padded so string comparison is chronological
function hhmm(value: string | null | undefined) {
  return (value ?? "").slice(0, 5);
}

function addHour(time: string, limit: string) {
  const [h, m] = time.split(":").map(Number);
  const next = `${String(Math.min(h + 1, 23)).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  return next > limit ? limit : next;
}

export function ReservaGrid({
  title, subtitle, resources, tramos, reservations, userId,
  onReserve, onMonthChange, reserveExtraLabel = "Motivo", onReservationClick, freeTime,
}: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string>(
    toDateStr(today.getFullYear(), today.getMonth() + 1, today.getDate())
  );
  const [reserveModal, setReserveModal] = useState<{ resourceId: number; tramoId: number } | null>(null);
  const [extraValue, setExtraValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [reserveError, setReserveError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [freeModal, setFreeModal] = useState<{ resourceId: number } | null>(null);
  const [freeInicio, setFreeInicio] = useState("");
  const [freeFin, setFreeFin] = useState("");

  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOffset = getFirstDayOfMonth(year, month);
  const todayStr = toDateStr(today.getFullYear(), today.getMonth() + 1, today.getDate());

  function prevMonth() {
    const newMonth = month === 1 ? 12 : month - 1;
    const newYear = month === 1 ? year - 1 : year;
    setMonth(newMonth);
    setYear(newYear);
    onMonthChange?.(newYear, newMonth);
  }
  function nextMonth() {
    const newMonth = month === 12 ? 1 : month + 1;
    const newYear = month === 12 ? year + 1 : year;
    setMonth(newMonth);
    setYear(newYear);
    onMonthChange?.(newYear, newMonth);
  }

  const dayReservations = reservations.filter((r) => r.fecha === selectedDate);

  function getReservation(resourceId: number, tramoId: number) {
    return dayReservations.find((r) => r.resource_id === resourceId && r.tramo_id === tramoId);
  }

  function getFreeReservations(resourceId: number) {
    return dayReservations
      .filter((r) => r.resource_id === resourceId && r.tramo_id === null)
      .sort((a, b) => hhmm(a.hora_inicio).localeCompare(hhmm(b.hora_inicio)));
  }

  function showSuccessToast() {
    setToast("Reserva registrada correctamente. Si no la necesitas, cancélala para liberar el recurso.");
    setTimeout(() => setToast(null), 7000);
  }

  function openFreeModal(resourceId: number) {
    if (!freeTime) return;
    // Suggest the first free hour after the existing bookings
    const last = getFreeReservations(resourceId).at(-1);
    const start = last && hhmm(last.hora_fin) < freeTime.fin ? hhmm(last.hora_fin) : freeTime.inicio;
    setFreeInicio(start);
    setFreeFin(addHour(start, freeTime.fin));
    setExtraValue("");
    setReserveError(null);
    setFreeModal({ resourceId });
  }

  function validateFree(resourceId: number): string | null {
    if (!freeTime) return null;
    if (!freeInicio || !freeFin) return "Indica la hora de inicio y de fin.";
    if (freeFin <= freeInicio) return "La hora de fin debe ser posterior a la de inicio.";
    if (freeInicio < freeTime.inicio || freeFin > freeTime.fin) {
      return `La reserva debe estar entre las ${freeTime.inicio} y las ${freeTime.fin}.`;
    }
    const overlap = getFreeReservations(resourceId).find(
      (r) => hhmm(r.hora_inicio) < freeFin && hhmm(r.hora_fin) > freeInicio
    );
    if (overlap) return `Se solapa con la reserva de ${hhmm(overlap.hora_inicio)} a ${hhmm(overlap.hora_fin)}.`;
    return null;
  }

  async function handleReserveFree() {
    if (!freeModal || !freeTime) return;
    const validationError = validateFree(freeModal.resourceId);
    if (validationError) { setReserveError(validationError); return; }
    setSaving(true);
    setReserveError(null);
    const error = await freeTime.onReserve(freeModal.resourceId, selectedDate, freeInicio, freeFin, extraValue);
    setSaving(false);
    if (error) { setReserveError(error); return; }
    setFreeModal(null);
    setExtraValue("");
    showSuccessToast();
  }

  function renderReservation(res: Reservation, resource: ResourceColumn, tramoLabel: string) {
    const isOwn = res.user_id === userId;
    return (
      <div
        key={res.id}
        className={cn(
          "w-full rounded-lg px-2 py-1.5 text-left text-xs",
          onReservationClick && "cursor-pointer hover:brightness-95 transition-all",
          isOwn ? "bg-blue-50 border border-blue-200" : "bg-red-50 border border-red-100"
        )}
        onClick={() => onReservationClick?.({
          id: res.id,
          resourceName: resource.nombre,
          userName: res.user_name ?? "—",
          fecha: selectedDate,
          tramo: tramoLabel,
          info: res.label ?? "",
          isOwn,
        })}
      >
        {res.tramo_id === null && (
          <span className="font-semibold text-gray-700 text-[11px] leading-tight block">{tramoLabel}</span>
        )}
        <span className={cn("font-medium leading-tight truncate block", isOwn ? "text-blue-700" : "text-red-600")}>
          {isOwn ? "Tú" : (res.user_name ?? "Ocupado")}
        </span>
        {res.label && (
          <span className="text-gray-500 text-[10px] leading-tight block truncate">{res.label}</span>
        )}
      </div>
    );
  }

  const showFreeRow = !!freeTime && resources.some((r) => freeTime.resourceIds.includes(r.id));

  async function handleReserve() {
    if (!reserveModal) return;
    setSaving(true);
    setReserveError(null);
    const ok = await onReserve(reserveModal.resourceId, reserveModal.tramoId, selectedDate, extraValue);
    setSaving(false);
    if (ok) {
      setReserveModal(null);
      setExtraValue("");
      showSuccessToast();
    } else {
      setReserveError("No se ha podido realizar la reserva. Es posible que ya esté ocupada. Inténtalo de nuevo.");
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Calendar */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden lg:col-span-1">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronLeft size={18} />
            </button>
            <h2 className="font-semibold text-blue-700">
              {MONTHS[month - 1]} {year}
            </h2>
            <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg">
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
              <div key={`e${i}`} className="border-b border-r border-gray-50 min-h-[44px]" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = toDateStr(year, month, day);
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              const isWeekend = (firstDayOffset + i) % 7 >= 5;
              return (
                <div
                  key={day}
                  className={cn(
                    "border-b border-r border-gray-50 min-h-[44px] flex items-center justify-center cursor-pointer transition-colors",
                    isWeekend && "bg-red-50/40",
                    isSelected && "bg-blue-50",
                    !isWeekend && !isSelected && "hover:bg-gray-50"
                  )}
                  onClick={() => { setSelectedDate(dateStr); onMonthChange?.(year, month); }}
                >
                  <span className={cn(
                    "w-7 h-7 flex items-center justify-center rounded-full text-sm",
                    isToday ? "bg-blue-600 text-white font-medium" : "text-gray-700"
                  )}>
                    {day}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Schedule grid for selected day */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden lg:col-span-2">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-700">
              Horario ({new Date(selectedDate + "T12:00:00").toLocaleDateString("es-ES", {
                day: "numeric", month: "short", year: "numeric",
              })})
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="text-sm w-full table-fixed">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 w-28">Horario</th>
                  {resources.map((r) => (
                    <th key={r.id} className="px-4 py-2 text-center text-xs font-semibold text-gray-700 min-w-[120px]">
                      <div>{r.nombre}</div>
                      {r.subtitulo && <div className="text-gray-400 font-normal">{r.subtitulo}</div>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tramos.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 font-medium text-gray-700 text-xs whitespace-nowrap">
                      {t.nombre}
                      {t.es_recreo && <span className="text-orange-400 ml-1">(R)</span>}
                    </td>
                    {resources.map((r) => {
                      const res = getReservation(r.id, t.id);
                      return (
                        <td key={r.id} className="px-2 py-2 text-center">
                          {res ? (
                            renderReservation(res, r, t.nombre)
                          ) : (
                            <button
                              onClick={() => { setReserveModal({ resourceId: r.id, tramoId: t.id }); setReserveError(null); }}
                              className="w-6 h-6 flex items-center justify-center rounded-full border-2 border-dashed border-green-400 hover:bg-green-50 text-green-500 transition-colors mx-auto"
                            >
                              <Plus size={12} />
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {showFreeRow && freeTime && (
                  <tr className="bg-indigo-50/40">
                    <td className="px-4 py-2.5 text-xs whitespace-nowrap align-top">
                      <span className="flex items-center gap-1 font-semibold text-indigo-700">
                        <Moon size={12} /> Tarde
                      </span>
                      <span className="text-gray-500">{freeTime.inicio} - {freeTime.fin}</span>
                    </td>
                    {resources.map((r) => (
                      <td key={r.id} className="px-2 py-2 text-center align-top">
                        {freeTime.resourceIds.includes(r.id) ? (
                          <div className="space-y-1.5">
                            {getFreeReservations(r.id).map((res) =>
                              renderReservation(res, r, `${hhmm(res.hora_inicio)} - ${hhmm(res.hora_fin)}`)
                            )}
                            <button
                              onClick={() => openFreeModal(r.id)}
                              aria-label={`Añadir reserva de tarde en ${r.nombre}`}
                              className="w-full min-h-9 flex items-center justify-center gap-1 rounded-lg border-2 border-dashed border-indigo-300 hover:bg-indigo-50 text-indigo-600 text-xs font-medium transition-colors"
                            >
                              <Plus size={12} /> Añadir
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Reserve modal */}
      {reserveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Confirmar Reserva</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {resources.find((r) => r.id === reserveModal.resourceId)?.nombre} ·{" "}
                {tramos.find((t) => t.id === reserveModal.tramoId)?.nombre}
              </p>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{reserveExtraLabel}</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={extraValue}
                  onChange={(e) => setExtraValue(e.target.value)}
                  placeholder={reserveExtraLabel === "Aula" ? "Ej: Aula B2" : "Motivo de la reserva"}
                />
              </div>
              {reserveError && (
                <div className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{reserveError}</p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => { setReserveModal(null); setReserveError(null); }} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button
                onClick={handleReserve}
                disabled={saving}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:bg-blue-400"
              >
                {saving ? "Reservando..." : "Reservar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Free-time (afternoon) reserve modal */}
      {freeModal && freeTime && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Reserva de tarde</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {resources.find((r) => r.id === freeModal.resourceId)?.nombre} ·{" "}
                {new Date(selectedDate + "T12:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="free-inicio" className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
                  <input
                    id="free-inicio"
                    type="time"
                    step={900}
                    min={freeTime.inicio}
                    max={freeTime.fin}
                    value={freeInicio}
                    onChange={(e) => setFreeInicio(e.target.value)}
                    className="w-full min-h-11 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="free-fin" className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
                  <input
                    id="free-fin"
                    type="time"
                    step={900}
                    min={freeTime.inicio}
                    max={freeTime.fin}
                    value={freeFin}
                    onChange={(e) => setFreeFin(e.target.value)}
                    className="w-full min-h-11 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">Horario disponible: de {freeTime.inicio} a {freeTime.fin}.</p>
              <div>
                <label htmlFor="free-extra" className="block text-sm font-medium text-gray-700 mb-1">{reserveExtraLabel}</label>
                <input
                  id="free-extra"
                  className="w-full min-h-11 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={extraValue}
                  onChange={(e) => setExtraValue(e.target.value)}
                  placeholder="Motivo de la reserva"
                />
              </div>
              {reserveError && (
                <div className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{reserveError}</p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => { setFreeModal(null); setReserveError(null); }}
                className="min-h-11 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleReserveFree}
                disabled={saving}
                className="min-h-11 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:bg-blue-400"
              >
                {saving ? "Reservando..." : "Reservar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full shadow-lg">
          <div className="flex items-start gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
            <CheckCircle size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-800 flex-1">{toast}</p>
            <button onClick={() => setToast(null)} className="text-green-400 hover:text-green-600 flex-shrink-0">
              <X size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

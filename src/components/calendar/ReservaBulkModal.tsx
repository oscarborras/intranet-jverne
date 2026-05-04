"use client";

import { useState, useMemo, useEffect } from "react";
import { X, CalendarRange, Check, AlertCircle, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { TramoHorario } from "@/lib/types";

const DAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];

export interface BulkSlot {
  resourceId: number;
  tramoId: number;
  fecha: string;
}

interface Props {
  table: "reservas_espacios" | "reservas_recursos";
  resourceKey: "espacio_id" | "recurso_id";
  resources: { id: number; nombre: string }[];
  tramos: TramoHorario[];
  extraLabel: string;
  onConfirm: (slots: BulkSlot[], extra: string) => Promise<void>;
  onClose: () => void;
}

export function ReservaBulkModal({
  table, resourceKey, resources, tramos, extraLabel, onConfirm, onClose,
}: Props) {
  const today = new Date().toISOString().split("T")[0];

  const [resourceId, setResourceId] = useState(resources[0]?.id ?? 0);
  const [selectedTramos, setSelectedTramos] = useState<Set<number>>(new Set());
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [activeDays, setActiveDays] = useState<Set<number>>(new Set([0, 1, 2, 3, 4])); // Mon–Fri
  const [extra, setExtra] = useState("");
  const [conflicts, setConflicts] = useState<Set<string>>(new Set());
  const [loadingConflicts, setLoadingConflicts] = useState(false);
  const [saving, setSaving] = useState(false);

  const dates = useMemo(() => {
    if (!dateFrom || !dateTo || dateFrom > dateTo) return [];
    const result: string[] = [];
    const end = new Date(dateTo + "T12:00:00");
    const cur = new Date(dateFrom + "T12:00:00");
    while (cur <= end) {
      const isoDay = (cur.getDay() + 6) % 7; // 0=Mon..6=Sun
      if (activeDays.has(isoDay)) result.push(cur.toISOString().split("T")[0]);
      cur.setDate(cur.getDate() + 1);
    }
    return result;
  }, [dateFrom, dateTo, activeDays]);

  useEffect(() => {
    if (dates.length === 0) { setConflicts(new Set()); return; }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoadingConflicts(true);
      const supabase = createClient();
      const { data } = await supabase
        .from(table)
        .select("tramo_id, fecha")
        .eq(resourceKey, resourceId)
        .gte("fecha", dates[0])
        .lte("fecha", dates[dates.length - 1]);
      if (!cancelled) {
        setConflicts(new Set(
          (data ?? []).map((r: { tramo_id: number; fecha: string }) => `${r.tramo_id}-${r.fecha}`)
        ));
        setLoadingConflicts(false);
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [resourceId, dates, table, resourceKey]);

  const allSlots = useMemo(() =>
    dates.flatMap(fecha =>
      Array.from(selectedTramos).map(tramoId => ({
        resourceId, tramoId, fecha,
        conflict: conflicts.has(`${tramoId}-${fecha}`),
      }))
    ),
    [dates, selectedTramos, resourceId, conflicts]
  );

  const validSlots = useMemo(() => allSlots.filter(s => !s.conflict), [allSlots]);
  const conflictCount = allSlots.length - validSlots.length;

  const slotsByDate = useMemo(() => {
    const map = new Map<string, typeof allSlots>();
    for (const slot of allSlots) {
      const list = map.get(slot.fecha) ?? [];
      list.push(slot);
      map.set(slot.fecha, list);
    }
    return map;
  }, [allSlots]);

  const tramoMap = useMemo(() => new Map(tramos.map(t => [t.id, t])), [tramos]);

  function toggleTramo(id: number) {
    setSelectedTramos(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleDay(day: number) {
    setActiveDays(prev => {
      const next = new Set(prev);
      next.has(day) ? next.delete(day) : next.add(day);
      return next;
    });
  }

  async function handleConfirm() {
    if (validSlots.length === 0 || saving) return;
    setSaving(true);
    await onConfirm(validSlots.map(({ conflict: _c, ...s }) => s), extra);
    setSaving(false);
    onClose();
  }

  function formatFecha(fecha: string) {
    return new Date(fecha + "T12:00:00").toLocaleDateString("es-ES", {
      weekday: "short", day: "numeric", month: "short",
    });
  }

  const canConfirm = !saving && !loadingConflicts && validSlots.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <CalendarRange size={18} className="text-blue-600" />
            <h2 className="font-semibold text-gray-900">Reserva múltiple</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 cursor-pointer">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">

          {resources.length > 1 && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                {extraLabel === "Aula" ? "Recurso" : "Espacio"}
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={resourceId}
                onChange={e => setResourceId(Number(e.target.value))}
              >
                {resources.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Desde</label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Hasta</label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={dateTo}
                min={dateFrom}
                onChange={e => setDateTo(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Días de la semana
            </label>
            <div className="flex gap-1.5">
              {DAY_LABELS.map((label, i) => (
                <button
                  key={i}
                  onClick={() => toggleDay(i)}
                  className={`w-9 h-9 rounded-full text-sm font-medium transition-colors cursor-pointer flex-shrink-0 ${
                    activeDays.has(i)
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Tramos horarios
              </label>
              <button
                onClick={() =>
                  setSelectedTramos(
                    selectedTramos.size === tramos.length
                      ? new Set()
                      : new Set(tramos.map(t => t.id))
                  )
                }
                className="text-xs text-blue-600 hover:underline cursor-pointer"
              >
                {selectedTramos.size === tramos.length ? "Quitar todos" : "Seleccionar todos"}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {tramos.map(t => (
                <label
                  key={t.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedTramos.has(t.id)}
                    onChange={() => toggleTramo(t.id)}
                    className="rounded text-blue-600 flex-shrink-0"
                  />
                  <span className="text-sm text-gray-700 truncate">{t.nombre}</span>
                  {t.es_recreo && (
                    <span className="text-xs text-orange-400 ml-auto flex-shrink-0">(R)</span>
                  )}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              {extraLabel}
            </label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={extra}
              onChange={e => setExtra(e.target.value)}
              placeholder={extraLabel === "Aula" ? "Ej: Aula B2" : "Motivo de la reserva"}
            />
          </div>

          {(allSlots.length > 0 || loadingConflicts) && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Vista previa
                </label>
                <div className="flex items-center gap-3 text-xs">
                  {loadingConflicts ? (
                    <Loader2 size={12} className="animate-spin text-gray-400" />
                  ) : (
                    <>
                      <span className="text-emerald-600 font-medium">{validSlots.length} a crear</span>
                      {conflictCount > 0 && (
                        <span className="flex items-center gap-1 text-orange-500">
                          <AlertCircle size={12} />
                          {conflictCount} ya ocupadas
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div className="border border-gray-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                {Array.from(slotsByDate.entries()).map(([fecha, slots]) => (
                  <div key={fecha} className="border-b border-gray-100 last:border-0">
                    <div className="px-3 py-1.5 bg-gray-50 text-xs font-semibold text-gray-600 capitalize sticky top-0">
                      {formatFecha(fecha)}
                    </div>
                    {slots.map(slot => {
                      const tramo = tramoMap.get(slot.tramoId);
                      return (
                        <div
                          key={slot.tramoId}
                          className={`flex items-center justify-between px-3 py-1.5 text-xs border-t border-gray-50 ${
                            slot.conflict ? "bg-orange-50/50" : ""
                          }`}
                        >
                          <span className={slot.conflict ? "text-gray-400" : "text-gray-700"}>
                            {tramo?.nombre}
                          </span>
                          {slot.conflict ? (
                            <span className="text-orange-400 font-medium">ya ocupado</span>
                          ) : (
                            <Check size={12} className="text-emerald-500" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <CalendarRange size={14} />}
            {saving
              ? "Creando..."
              : `Crear ${validSlots.length} reserva${validSlots.length !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}

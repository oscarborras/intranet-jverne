"use client";

import { useState } from "react";
import { ChevronDown, MapPin, User, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KanbanItem } from "./KanbanBoard";

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

interface Props {
  item: KanbanItem;
  allStatuses: { key: string; label: string }[];
  currentStatus: string;
  onStatusChange: (newStatus: string) => void;
  onClick?: () => void;
  isUpdating: boolean;
  showStatusChange?: boolean;
}

export function KanbanCard({ item, allStatuses, currentStatus, onStatusChange, onClick, isUpdating, showStatusChange = true }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  const ubicacion = "ubicacion" in item ? item.ubicacion : undefined;
  const asignadoName = "asignado" in item && item.asignado ? item.asignado.full_name : undefined;

  function formatDate(d: string) {
    const date = new Date(d);
    const datePart = date.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
    const timePart = date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
    return `${datePart} · ${timePart}`;
  }

  return (
    <div
      className={cn(
        "bg-white rounded-xl p-3 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow",
        isUpdating && "opacity-50"
      )}
      onClick={onClick}
    >
      {/* Code + priority */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
          {item.codigo}
        </span>
        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", PRIORITY_CLASSES[item.prioridad])}>
          {PRIORITY_LABELS[item.prioridad]}
        </span>
      </div>

      {/* Title */}
      <p className="text-sm font-semibold text-gray-900 leading-tight mb-2">{item.titulo}</p>

      {/* Meta */}
      <div className="space-y-1">
        {ubicacion && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <MapPin size={11} />
            <span className="truncate">{ubicacion}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <User size={11} />
          <span className="truncate">{item.autor?.full_name ?? "—"}</span>
          {asignadoName && <span className="text-blue-500 truncate">· {asignadoName}</span>}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Clock size={11} />
          <span>{formatDate(item.created_at)}</span>
        </div>
      </div>

      {/* Status change button */}
      {showStatusChange && (
        <div className="relative mt-3" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs text-gray-600 transition-colors border border-gray-200"
          >
            <span>Mover a...</span>
            <ChevronDown size={12} />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-white rounded-lg shadow-lg border border-gray-100 z-20 py-1 overflow-hidden">
                {allStatuses
                  .filter((s) => s.key !== currentStatus)
                  .map((s) => (
                    <button
                      key={s.key}
                      className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                      onClick={() => { onStatusChange(s.key); setMenuOpen(false); }}
                    >
                      {s.label}
                    </button>
                  ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

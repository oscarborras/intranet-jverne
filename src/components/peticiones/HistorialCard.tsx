"use client";

import { useState } from "react";
import { MapPin, User, Clock, CheckCircle2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { VerFotoButton } from "@/components/VerFotoButton";
import type { PeticionPrioridad } from "@/lib/types";

const PRIORITY_CLASSES: Record<PeticionPrioridad, string> = {
  baja: "bg-gray-100 text-gray-600",
  normal: "bg-blue-100 text-blue-700",
  alta: "bg-yellow-100 text-yellow-700",
  urgente: "bg-red-100 text-red-700",
};

const PRIORITY_LABELS: Record<PeticionPrioridad, string> = {
  baja: "Baja",
  normal: "Normal",
  alta: "Alta",
  urgente: "Urgente",
};

interface Props {
  codigo: string;
  titulo: string;
  prioridad: PeticionPrioridad;
  autorName: string;
  asignadoName?: string;
  ubicacion?: string;
  descripcion: string;
  fotoPath: string | null;
  fotoNombre: string | null;
  createdAt: string;
  finalizadaAt: string | null;
  // When set, the card opens a detail view; otherwise it expands inline
  onClick?: () => void;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("es-ES", {
    day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Madrid",
  });
}

export function HistorialCard({
  codigo, titulo, prioridad, autorName, asignadoName, ubicacion, descripcion,
  fotoPath, fotoNombre, createdAt, finalizadaAt, onClick,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const handleClick = onClick ?? (() => setExpanded((v) => !v));

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <button
        type="button"
        onClick={handleClick}
        aria-expanded={onClick ? undefined : expanded}
        className="w-full text-left p-3 sm:p-4 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer"
      >
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-xs font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{codigo}</span>
          <div className="flex items-center gap-1.5">
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", PRIORITY_CLASSES[prioridad])}>
              {PRIORITY_LABELS[prioridad]}
            </span>
            {!onClick && (
              <ChevronDown size={16} className={cn("text-gray-400 transition-transform", expanded && "rotate-180")} />
            )}
          </div>
        </div>
        <p className="text-sm font-semibold text-gray-900 leading-tight mb-2">{titulo}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500">
          {ubicacion && (
            <span className="flex items-center gap-1.5 min-w-0"><MapPin size={12} /><span className="truncate">{ubicacion}</span></span>
          )}
          <span className="flex items-center gap-1.5 min-w-0">
            <User size={12} />
            <span className="truncate">{autorName}</span>
            {asignadoName && <span className="text-blue-500 truncate">· {asignadoName}</span>}
          </span>
          <span className="flex items-center gap-1.5"><Clock size={12} />Creada: {formatDate(createdAt)}</span>
          {finalizadaAt && (
            <span className="flex items-center gap-1.5 text-green-700"><CheckCircle2 size={12} />Finalizada: {formatDate(finalizadaAt)}</span>
          )}
        </div>
      </button>
      {!onClick && expanded && (
        <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-2 border-t border-gray-100 space-y-2">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{descripcion || "Sin descripción"}</p>
          {fotoPath && <VerFotoButton path={fotoPath} nombre={fotoNombre ?? undefined} />}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { X, Building2, BookOpen, Laptop, Calendar, Clock, Tag, User, ExternalLink, Trash2 } from "lucide-react";

export interface ReservaDetailData {
  id: number;
  resourceName: string;
  userName: string;
  fecha: string;
  tramo: string;
  info: string;
  tipo: "espacio" | "recurso" | "carro";
  isOwn: boolean;
  href?: string;
}

interface Props {
  data: ReservaDetailData;
  onClose: () => void;
  onCancel?: () => Promise<void>;
}

export function ReservaDetailModal({ data, onClose, onCancel }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!onCancel) return;
    setDeleting(true);
    await onCancel();
    setDeleting(false);
    onClose();
  }

  const fechaDisplay = new Date(data.fecha + "T12:00:00").toLocaleDateString("es-ES", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const showCancel = !!onCancel;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-sm shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 min-w-0">
            {data.tipo === "espacio"
              ? <Building2 size={18} className="text-emerald-500 flex-shrink-0" />
              : data.tipo === "carro"
                ? <Laptop size={18} className="text-blue-500 flex-shrink-0" />
                : <BookOpen size={18} className="text-gray-500 flex-shrink-0" />
            }
            <h2 className="font-semibold text-gray-900 truncate">{data.resourceName}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors cursor-pointer flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-3">
          <div className="flex items-start gap-3">
            <User size={15} className="text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Reservado por</p>
              <p className="text-sm font-medium text-gray-800">{data.userName}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar size={15} className="text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Fecha</p>
              <p className="text-sm text-gray-800 capitalize">{fechaDisplay}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock size={15} className="text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Horario</p>
              <p className="text-sm text-gray-800">{data.tramo}</p>
            </div>
          </div>

          {data.info && (
            <div className="flex items-start gap-3">
              <Tag size={15} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                  {data.tipo === "espacio" ? "Motivo" : data.tipo === "carro" ? "Aula" : "Aula"}
                </p>
                <p className="text-sm text-gray-800">{data.info}</p>
              </div>
            </div>
          )}

          <div className="pt-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              data.tipo === "espacio"
                ? "bg-emerald-100 text-emerald-700"
                : data.tipo === "carro"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-600"
            }`}>
              {data.tipo === "espacio" ? "Espacio" : data.tipo === "carro" ? "Carro de portátiles" : "Recurso"}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 space-y-2">
          {!confirmDelete ? (
            <>
              {data.href && (
                <Link
                  href={data.href}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer"
                >
                  <ExternalLink size={14} />
                  Ir a la página de reservas
                </Link>
              )}
              {showCancel ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200 cursor-pointer"
                >
                  <Trash2 size={14} />
                  Cancelar esta reserva
                </button>
              ) : !data.href && (
                <button
                  onClick={onClose}
                  className="w-full px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
              )}
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-gray-700 text-center font-medium">
                ¿Seguro que quieres cancelar esta reserva?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 cursor-pointer"
                >
                  No, volver
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 px-4 py-2.5 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {deleting ? "Cancelando..." : "Sí, cancelar"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

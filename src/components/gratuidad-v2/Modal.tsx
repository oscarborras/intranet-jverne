"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  titulo: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  ancho?: "md" | "lg" | "xl";
}

/** Bottom sheet on mobile, centred dialog on larger screens. Closes with Escape. */
export function Modal({ titulo, onClose, children, footer, ancho = "md" }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={cn(
          "bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-h-[92vh] flex flex-col",
          ancho === "md" && "sm:max-w-md",
          ancho === "lg" && "sm:max-w-2xl",
          ancho === "xl" && "sm:max-w-4xl",
        )}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-900">{titulo}</h2>
          <button onClick={onClose} aria-label="Cerrar" className="text-gray-400 hover:text-gray-600 p-2 -m-2">
            <X size={20} />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-4 border-t flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

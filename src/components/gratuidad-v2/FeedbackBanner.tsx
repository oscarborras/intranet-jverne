"use client";

import { AlertTriangle, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TipoFeedback } from "./scanFeedback";

export interface Feedback {
  tipo: TipoFeedback;
  titulo: string;
  detalle?: string;
  /** Changes on every scan so the banner is re-announced */
  key: number;
}

const cls: Record<TipoFeedback, string> = {
  ok: "bg-emerald-50 border-emerald-300 text-emerald-900",
  aviso: "bg-amber-50 border-amber-300 text-amber-900",
  error: "bg-red-50 border-red-300 text-red-900",
};

/** Large result of the last scan, readable from a distance. */
export function FeedbackBanner({ feedback, procesando }: { feedback: Feedback | null; procesando: boolean }) {
  if (!feedback) {
    return procesando
      ? <p className="text-sm text-gray-500 text-center py-3 flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Registrando…</p>
      : <p className="text-sm text-gray-400 text-center py-3">Esperando lectura…</p>;
  }
  const Icon = feedback.tipo === "ok" ? CheckCircle2 : feedback.tipo === "aviso" ? AlertTriangle : XCircle;
  return (
    <div key={feedback.key} role="status" aria-live="assertive" className={cn("flex items-start gap-3 border-2 rounded-xl px-4 py-3", cls[feedback.tipo])}>
      <Icon size={26} className="flex-shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="font-semibold text-base leading-snug">{feedback.titulo}</p>
        {feedback.detalle && <p className="text-sm opacity-80 mt-0.5 break-words">{feedback.detalle}</p>}
      </div>
      {procesando && <Loader2 size={16} className="animate-spin ml-auto flex-shrink-0" />}
    </div>
  );
}

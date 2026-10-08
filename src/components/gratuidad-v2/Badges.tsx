import { cn } from "@/lib/utils";
import {
  ETIQUETAS_CONSERVACION, ETIQUETAS_SITUACION, type ConservacionV2, type SituacionV2,
} from "@/lib/types/gratuidadV2";

const situacionCls: Record<SituacionV2, string> = {
  en_centro: "bg-emerald-50 text-emerald-700 border-emerald-200",
  prestado: "bg-blue-50 text-blue-700 border-blue-200",
  perdido: "bg-red-50 text-red-700 border-red-200",
  baja: "bg-gray-100 text-gray-500 border-gray-200",
};

const conservacionCls: Record<ConservacionV2, string> = {
  nuevo: "text-emerald-700",
  bueno: "text-gray-700",
  regular: "text-amber-700",
  deteriorado: "text-red-700",
};

export function SituacionBadge({ situacion }: { situacion: SituacionV2 }) {
  return (
    <span className={cn("inline-block text-xs font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap", situacionCls[situacion])}>
      {ETIQUETAS_SITUACION[situacion]}
    </span>
  );
}

export function ConservacionText({ conservacion }: { conservacion: ConservacionV2 }) {
  return <span className={cn("text-xs font-medium", conservacionCls[conservacion])}>{ETIQUETAS_CONSERVACION[conservacion]}</span>;
}

const tagCls = "inline-block text-[10px] font-semibold tracking-wide uppercase px-1.5 py-0.5 rounded whitespace-nowrap";

/** Same tag as the original Gratuidad module */
export function DiversificacionBadge({ className }: { className?: string }) {
  return <span className={cn(tagCls, "bg-purple-100 text-purple-700", className)}>Diversificación</span>;
}

/** Title that only some students of the group use (does not count for a complete lot) */
export function OptativoBadge({ className }: { className?: string }) {
  return <span className={cn(tagCls, "bg-orange-100 text-orange-800", className)}>Optativo</span>;
}

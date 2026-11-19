"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  NIVELES_CONSERJERIA,
  horaConserjeria,
  type EstadoConserjeria,
  type NumOrdenanzas,
} from "@/lib/conserjeria";

/** Ordenanza / Directiva / Admin panel to set how many caretakers are on duty today */
export function EstadoConserjeriaSelector({ initialEstado }: { initialEstado: EstadoConserjeria | null }) {
  const router = useRouter();
  const [estado, setEstado] = useState<EstadoConserjeria | null>(initialEstado);
  const [saving, setSaving] = useState<NumOrdenanzas | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function seleccionar(num: NumOrdenanzas) {
    if (saving || estado?.num_ordenanzas === num) return;
    setSaving(num);
    setError(null);
    try {
      const res = await fetch("/api/conserjeria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ num_ordenanzas: num }),
      });
      const json = await res.json() as { estado?: EstadoConserjeria; error?: string };
      if (!res.ok || !json.estado) throw new Error(json.error ?? "No se ha podido guardar");
      setEstado(json.estado);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se ha podido guardar");
    } finally {
      setSaving(null);
    }
  }

  return (
    <section className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          Ordenanzas en el centro hoy
        </h2>
        <p className="text-xs text-gray-500">
          {estado
            ? `Actualizado a las ${horaConserjeria(estado.updated_at)}${estado.updated_by_nombre ? ` por ${estado.updated_by_nombre}` : ""}`
            : "Aún no se ha indicado hoy"}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {NIVELES_CONSERJERIA.map((nivel) => {
          const selected = estado?.num_ordenanzas === nivel.num;
          const dimmed = estado !== null && !selected;
          return (
            <button
              key={nivel.num}
              type="button"
              onClick={() => seleccionar(nivel.num)}
              disabled={saving !== null}
              aria-pressed={selected}
              className={cn(
                nivel.bg,
                "relative min-h-24 rounded-lg border-2 border-dashed border-white/40 px-4 py-3 text-white text-center transition-all",
                "flex flex-col items-center justify-center disabled:cursor-wait",
                selected && `ring-4 ${nivel.ring} ring-offset-2`,
                dimmed && "opacity-40 hover:opacity-75"
              )}
            >
              {selected && <CheckCircle2 size={22} className="absolute top-2 right-2" aria-hidden="true" />}
              {saving === nivel.num && <Loader2 size={22} className="absolute top-2 right-2 animate-spin" aria-hidden="true" />}
              <span className="text-2xl md:text-3xl font-extrabold uppercase leading-tight">{nivel.titulo}</span>
              <span className="text-sm md:text-base font-bold uppercase leading-tight">{nivel.servicio}</span>
            </button>
          );
        })}
      </div>

      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
    </section>
  );
}

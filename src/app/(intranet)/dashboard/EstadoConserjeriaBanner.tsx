import { BellRing } from "lucide-react";
import { horaConserjeria, nivelConserjeria, type EstadoConserjeria } from "@/lib/conserjeria";

/** Read-only caretaker's office status shown to every non-Ordenanza profile */
export function EstadoConserjeriaBanner({ estado }: { estado: EstadoConserjeria | null }) {
  const nivel = nivelConserjeria(estado?.num_ordenanzas);

  return (
    <section
      aria-label="Estado de conserjería"
      className={`${nivel?.bg ?? "bg-gray-400"} rounded-xl px-5 py-3 text-white flex items-center gap-4`}
    >
      <BellRing size={28} className="flex-shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <p className="font-bold uppercase tracking-wide leading-tight">
          Conserjería: {nivel ? nivel.titulo : "Sin indicar"}
        </p>
        <p className="text-sm text-white/90 leading-tight mt-0.5">
          {nivel && estado
            ? `${nivel.servicio} · actualizado a las ${horaConserjeria(estado.updated_at)}`
            : "Los ordenanzas aún no han indicado el estado de hoy"}
        </p>
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, BookOpen, Laptop, CalendarCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ReservaDetailModal } from "@/components/calendar/ReservaDetailModal";

export interface ReservaDashboard {
  id: number;
  fecha: string;
  nombre: string;
  tramo: string;
  hora_inicio: string;
  hora_fin: string;
  tramo_orden: number;
  info: string;
  tipo: "espacio" | "recurso" | "carro";
  href: string;
  user_name: string;
}

interface Props {
  reservas: ReservaDashboard[];
}

export function ProximasReservas({ reservas: initialReservas }: Props) {
  const [reservas, setReservas] = useState<ReservaDashboard[]>(initialReservas);
  const [selected, setSelected] = useState<ReservaDashboard | null>(null);

  async function handleCancel(r: ReservaDashboard) {
    const supabase = createClient();
    const table = r.tipo === "espacio" ? "reservas_espacios" : r.tipo === "carro" ? "reservas_carros" : "reservas_recursos";
    await supabase.from(table).delete().eq("id", r.id);
    setReservas((prev) => prev.filter((x) => !(x.id === r.id && x.tipo === r.tipo)));
  }

  function formatHora(r: ReservaDashboard) {
    return r.hora_inicio && r.hora_fin
      ? `${r.hora_inicio.slice(0, 5)} – ${r.hora_fin.slice(0, 5)}`
      : r.tramo;
  }

  function formatFechaCorta(fecha: string) {
    return new Date(fecha + "T12:00:00").toLocaleDateString("es-ES", {
      weekday: "short", day: "numeric", month: "short",
    });
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="bg-emerald-600 px-5 py-3 flex items-center gap-2">
          <CalendarCheck size={16} className="text-white" />
          <h3 className="text-white font-semibold text-sm">Mis Próximas Reservas</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {reservas.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">No tienes reservas próximas</p>
          ) : (
            reservas.map((r) => {
              const Icon = r.tipo === "espacio" ? Building2 : r.tipo === "carro" ? Laptop : BookOpen;
              const iconColor = r.tipo === "espacio" ? "text-emerald-500" : r.tipo === "carro" ? "text-blue-500" : "text-gray-500";
              return (
                <button
                  key={`${r.tipo}-${r.id}`}
                  onClick={() => setSelected(r)}
                  className="w-full px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left cursor-pointer"
                >
                  <Icon size={16} className={`flex-shrink-0 ${iconColor}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{r.nombre}</p>
                    {r.info && (
                      <p className="text-xs text-gray-500 truncate">{r.info}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-xs font-medium text-gray-700 capitalize">{formatFechaCorta(r.fecha)}</p>
                    <p className="text-xs text-gray-400">{formatHora(r)}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
        <div className="px-5 py-3 border-t border-gray-100 flex gap-4">
          <Link href="/reservas/carros" className="text-sm text-emerald-600 hover:underline">
            Carros →
          </Link>
          <Link href="/reservas/espacios" className="text-sm text-emerald-600 hover:underline">
            Espacios →
          </Link>
          <Link href="/reservas/recursos" className="text-sm text-emerald-600 hover:underline">
            Recursos →
          </Link>
        </div>
      </div>

      {selected && (
        <ReservaDetailModal
          data={{
            id: selected.id,
            resourceName: selected.nombre,
            userName: selected.user_name,
            fecha: selected.fecha,
            tramo: selected.tramo,
            info: selected.info,
            tipo: selected.tipo,
            isOwn: true,
            href: selected.href,
          }}
          onClose={() => setSelected(null)}
          onCancel={async () => { await handleCancel(selected); }}
        />
      )}
    </>
  );
}

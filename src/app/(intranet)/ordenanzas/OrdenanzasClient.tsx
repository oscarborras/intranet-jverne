"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, RefreshCw, User } from "lucide-react";

interface CitaOrdenanza {
  id: number;
  codigo: string;
  profesor_id: string;
  profesor_nombre: string;
  alumno_nombre: string;
  alumno_curso: string;
  familiar_nombre: string;
  familiar_parentesco: string;
  hora_inicio: string | null;
  lugar: string | null;
}

interface ProfesorEntry {
  id: string;
  nombre: string;
}

interface Props {
  citas: CitaOrdenanza[];
  profesores: ProfesorEntry[];
  todayStr: string;
}

export default function OrdenanzasClient({ citas, profesores, todayStr }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const fechaLabel = new Date(todayStr + "T00:00:00").toLocaleDateString("es-ES", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const filtered = citas.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.alumno_nombre.toLowerCase().includes(q) ||
      c.familiar_nombre.toLowerCase().includes(q) ||
      c.profesor_nombre.toLowerCase().includes(q)
    );
  });

  const profesoresFiltrados = profesores.filter((p) =>
    filtered.some((c) => c.profesor_id === p.id)
  );

  async function handleRefresh() {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 1000);
  }

  useEffect(() => {
    const interval = setInterval(() => router.refresh(), 60 * 1000);
    return () => clearInterval(interval);
  }, [router]);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="bg-blue-700 rounded-xl px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-white font-bold text-xl">Citas del Día</h1>
          <p className="text-blue-200 text-sm mt-0.5 capitalize">{fechaLabel}</p>
        </div>
        <button
          onClick={handleRefresh}
          title="Actualizar"
          className="p-2 rounded-lg bg-white/15 hover:bg-white/25 transition-colors"
        >
          <RefreshCw
            size={18}
            color="#fff"
            className={refreshing ? "animate-spin" : ""}
          />
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm border border-gray-100">
        <Search size={18} className="text-gray-400 flex-shrink-0" />
        <input
          type="text"
          placeholder="Buscar por alumno, familiar o profesor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border-none outline-none text-sm text-gray-900 placeholder-gray-400 bg-transparent"
        />
      </div>

      {/* Summary */}
      <div className="flex gap-2 flex-wrap">
        <span className="bg-blue-100 text-blue-700 rounded-full px-3 py-1 text-sm font-semibold">
          {filtered.length} cita{filtered.length !== 1 ? "s" : ""} hoy
        </span>
        {search && (
          <span className="bg-gray-100 text-gray-500 rounded-full px-3 py-1 text-sm">
            Filtro: &ldquo;{search}&rdquo;
          </span>
        )}
      </div>

      {/* Grouped by professor */}
      {profesoresFiltrados.length === 0 ? (
        <div className="bg-white rounded-xl px-6 py-12 text-center border border-gray-100">
          <p className="text-gray-400 text-sm">
            {search ? "No se encontraron resultados" : "No hay citas confirmadas para hoy"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {profesoresFiltrados.map((prof) => {
            const citasProf = filtered.filter((c) => c.profesor_id === prof.id);
            return (
              <div key={prof.id} className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm">
                <div className="bg-blue-900 px-4 py-3 flex items-center gap-2">
                  <User size={16} className="text-blue-300 flex-shrink-0" />
                  <p className="text-white font-semibold text-sm flex-1">{prof.nombre}</p>
                  <span className="bg-white/20 text-white text-xs rounded-full px-2 py-0.5">
                    {citasProf.length}
                  </span>
                </div>
                <div className="divide-y divide-gray-50">
                  {citasProf.map((c) => (
                    <div key={c.id} className="px-4 py-3.5 flex items-start gap-3">
                      {c.hora_inicio && (
                        <div className="flex-shrink-0 bg-blue-50 rounded-lg px-2.5 py-2 text-center min-w-[52px]">
                          <p className="text-blue-700 font-bold text-base leading-none">
                            {c.hora_inicio.slice(0, 5)}
                          </p>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">
                          {c.alumno_nombre}{" "}
                          <span className="font-normal text-gray-400 text-xs">({c.alumno_curso})</span>
                        </p>
                        <p className="text-gray-500 text-xs mt-0.5">
                          {c.familiar_nombre} · <span className="capitalize">{c.familiar_parentesco}</span>
                        </p>
                        {c.lugar && (
                          <p className="text-gray-400 text-xs mt-1 flex items-center gap-1">
                            <MapPin size={11} />
                            {c.lugar}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-center text-gray-300 text-xs pt-2">
        Se actualiza automáticamente cada minuto
      </p>
    </div>
  );
}

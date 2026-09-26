"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3, CheckCircle2, ClipboardCheck, Hammer, Inbox, Timer } from "lucide-react";
import { ChartCard } from "@/components/charts/ChartCard";
import { GroupedColumnChart } from "@/components/charts/GroupedColumnChart";
import { HorizontalBarChart } from "@/components/charts/HorizontalBarChart";
import { PeriodoSelector } from "@/components/charts/PeriodoSelector";
import { StatTile } from "@/components/charts/StatTile";
import { dateStrMadrid } from "@/lib/dates";
import {
  COLOR_CREADAS, COLOR_FINALIZADAS, PRIORIDADES_ESTADISTICA as PRIORIDADES,
  diasEntre, formatDias, formatPeticiones, median, periodoLabel as getPeriodoLabel, periodoStart, seriesMensual,
  type Periodo,
} from "@/lib/estadisticas";
import type { PeticionMantenimientoEstado, PeticionPrioridad } from "@/lib/types";

export interface PeticionMntEstadistica {
  id: number;
  estado: PeticionMantenimientoEstado;
  prioridad: PeticionPrioridad;
  created_at: string;
  finalizada_at: string | null;
}

interface Props {
  peticiones: PeticionMntEstadistica[];
  /** Today in Madrid, computed on the server so both renders agree */
  todayStr: string;
}

// Workflow order of the maintenance board
const ESTADOS: { id: PeticionMantenimientoEstado; label: string }[] = [
  { id: "por_validar", label: "Por validar" },
  { id: "abierta", label: "Abierta" },
  { id: "en_progreso", label: "En progreso" },
  { id: "finalizada", label: "Finalizada" },
  { id: "rechazada", label: "Rechazada" },
];

export function EstadisticasMantenimientoClient({ peticiones, todayStr }: Props) {
  const [periodo, setPeriodo] = useState<Periodo>("curso");

  const stats = useMemo(() => {
    const start = periodoStart(periodo, todayStr);
    const inPeriodo = (dateStr: string) => !start || dateStr >= start;

    const rows = peticiones.map((p) => ({
      ...p,
      createdDate: dateStrMadrid(p.created_at),
      finalizadaDate: p.finalizada_at ? dateStrMadrid(p.finalizada_at) : null,
      dias: p.finalizada_at ? diasEntre(p.created_at, p.finalizada_at) : null,
    }));

    const creadas = rows.filter((r) => inPeriodo(r.createdDate));
    const finalizadas = rows.filter((r) => r.estado === "finalizada" && r.finalizadaDate && inPeriodo(r.finalizadaDate));
    const porValidar = rows.filter((r) => r.estado === "por_validar").length;
    const abiertas = rows.filter((r) => r.estado === "abierta").length;
    const enProgreso = rows.filter((r) => r.estado === "en_progreso").length;
    const medianaDias = median(finalizadas.map((r) => r.dias ?? 0));

    const meses = seriesMensual(
      creadas.map((r) => r.createdDate),
      finalizadas.map((r) => r.finalizadaDate as string),
      start ?? rows[0]?.createdDate ?? null,
      todayStr
    );

    const porPrioridad = PRIORIDADES.map((p) => ({
      label: p.label,
      value: creadas.filter((r) => r.prioridad === p.id).length,
    }));

    const resolucionPorPrioridad = PRIORIDADES.map((p) => {
      const dias = finalizadas.filter((r) => r.prioridad === p.id).map((r) => r.dias ?? 0);
      return { label: p.label, value: median(dias), n: dias.length };
    }).filter((r): r is { label: string; value: number; n: number } => r.value !== null);

    // Where the requests created in the period are now
    const porEstado = ESTADOS.map((e) => ({
      label: e.label,
      value: creadas.filter((r) => r.estado === e.id).length,
    }));

    return { creadas: creadas.length, finalizadas: finalizadas.length, porValidar, abiertas, enProgreso, medianaDias, meses, porPrioridad, resolucionPorPrioridad, porEstado };
  }, [peticiones, periodo, todayStr]);

  const periodoLabel = getPeriodoLabel(periodo);
  const sinDatos = (
    <p className="text-sm text-gray-400 text-center py-10">No hay datos en este periodo</p>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="space-y-3">
        <Link href="/peticiones-mantenimiento" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          <ArrowLeft size={16} /> Peticiones Mantenimiento
        </Link>
        <div className="flex items-center gap-3">
          <BarChart3 size={24} className="text-red-500" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Estadísticas de peticiones de mantenimiento</h1>
            <p className="text-sm text-gray-500">Actividad, validación y tiempos de resolución</p>
          </div>
        </div>
      </div>

      {/* One filter row above everything it scopes */}
      <PeriodoSelector value={periodo} onChange={setPeriodo} />

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <StatTile label="Peticiones creadas" value={String(stats.creadas)} detail={periodoLabel} icon={Inbox} iconClass="bg-blue-100 text-blue-700" />
        <StatTile
          label="Pendientes de validar"
          value={String(stats.porValidar)}
          detail="Esperando revisión de Directiva"
          icon={ClipboardCheck}
          iconClass="bg-gray-200 text-gray-700"
        />
        <StatTile
          label="En curso ahora"
          value={String(stats.abiertas + stats.enProgreso)}
          detail={`${stats.abiertas} abiertas · ${stats.enProgreso} en progreso`}
          icon={Hammer}
          iconClass="bg-amber-100 text-amber-700"
        />
        <StatTile label="Peticiones finalizadas" value={String(stats.finalizadas)} detail={periodoLabel} icon={CheckCircle2} iconClass="bg-green-100 text-green-700" />
        <StatTile
          label="Tiempo típico de resolución"
          value={stats.medianaDias === null ? "—" : formatDias(stats.medianaDias)}
          detail="Mediana desde que se crea hasta que se finaliza"
          icon={Timer}
          iconClass="bg-violet-100 text-violet-700"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="lg:col-span-2">
          <ChartCard
            title="Peticiones por mes"
            subtitle="Creadas y finalizadas cada mes"
            legend={[
              { label: "Creadas", color: COLOR_CREADAS },
              { label: "Finalizadas", color: COLOR_FINALIZADAS },
            ]}
            ariaLabel={`Gráfico de columnas con las peticiones de mantenimiento creadas y finalizadas por mes, ${periodoLabel}`}
            table={{ columns: ["Mes", "Creadas", "Finalizadas"], rows: stats.meses.map((m) => [m.mes, m.creadas, m.finalizadas]) }}
          >
            <GroupedColumnChart
              data={stats.meses}
              categoryKey="mes"
              series={[
                { key: "creadas", label: "Creadas", color: COLOR_CREADAS },
                { key: "finalizadas", label: "Finalizadas", color: COLOR_FINALIZADAS },
              ]}
              valueFormatter={formatPeticiones}
            />
          </ChartCard>
        </div>

        <ChartCard
          title="Peticiones creadas por prioridad"
          ariaLabel={`Gráfico de barras con las peticiones de mantenimiento creadas por prioridad, ${periodoLabel}`}
          table={{ columns: ["Prioridad", "Peticiones"], rows: stats.porPrioridad.map((p) => [p.label, p.value]) }}
        >
          {stats.creadas === 0 ? sinDatos : (
            <HorizontalBarChart data={stats.porPrioridad} seriesName="Peticiones" color={COLOR_CREADAS} valueFormatter={formatPeticiones} labelWidth={80} />
          )}
        </ChartCard>

        <ChartCard
          title="Tiempo típico de resolución por prioridad"
          subtitle="Mediana de las peticiones finalizadas"
          ariaLabel={`Gráfico de barras con la mediana del tiempo de resolución por prioridad, ${periodoLabel}`}
          table={{
            columns: ["Prioridad", "Mediana", "Peticiones contadas"],
            rows: stats.resolucionPorPrioridad.map((r) => [r.label, formatDias(r.value), r.n]),
          }}
        >
          {stats.resolucionPorPrioridad.length === 0 ? sinDatos : (
            <HorizontalBarChart data={stats.resolucionPorPrioridad} seriesName="Mediana" color={COLOR_CREADAS} valueFormatter={formatDias} labelWidth={80} />
          )}
        </ChartCard>

        <div className="lg:col-span-2">
          <ChartCard
            title="Estado actual de las peticiones"
            subtitle="Situación hoy de las peticiones creadas en el periodo"
            ariaLabel={`Gráfico de barras con el estado actual de las peticiones de mantenimiento creadas, ${periodoLabel}`}
            table={{ columns: ["Estado", "Peticiones"], rows: stats.porEstado.map((e) => [e.label, e.value]) }}
          >
            {stats.creadas === 0 ? sinDatos : (
              <HorizontalBarChart data={stats.porEstado} seriesName="Peticiones" color={COLOR_CREADAS} valueFormatter={formatPeticiones} labelWidth={100} />
            )}
          </ChartCard>
        </div>
      </div>
    </div>
  );
}

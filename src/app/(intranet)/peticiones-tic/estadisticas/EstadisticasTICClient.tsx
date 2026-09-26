"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3, CheckCircle2, Clock3, Inbox, Timer } from "lucide-react";
import { ChartCard } from "@/components/charts/ChartCard";
import { GroupedColumnChart } from "@/components/charts/GroupedColumnChart";
import { HorizontalBarChart } from "@/components/charts/HorizontalBarChart";
import { StatTile } from "@/components/charts/StatTile";
import { addDaysToDateStr, dateStrMadrid } from "@/lib/dates";
import type { PeticionPrioridad, PeticionTICEstado } from "@/lib/types";

export interface PeticionEstadistica {
  id: number;
  estado: PeticionTICEstado;
  prioridad: PeticionPrioridad;
  /** Assigned technician's name, null when unassigned */
  tecnico: string | null;
  created_at: string;
  finalizada_at: string | null;
}

interface Props {
  peticiones: PeticionEstadistica[];
  /** Today in Madrid, computed on the server so both renders agree */
  todayStr: string;
}

type Periodo = "curso" | "90" | "30" | "todo";

const PERIODOS: { id: Periodo; label: string }[] = [
  { id: "curso", label: "Curso actual" },
  { id: "90", label: "Últimos 90 días" },
  { id: "30", label: "Últimos 30 días" },
  { id: "todo", label: "Todo" },
];

// Ordinal: most urgent first
const PRIORIDADES: { id: PeticionPrioridad; label: string }[] = [
  { id: "urgente", label: "Urgente" },
  { id: "alta", label: "Alta" },
  { id: "normal", label: "Normal" },
  { id: "baja", label: "Baja" },
];

const COLOR_CREADAS = "var(--chart-1)";
const COLOR_FINALIZADAS = "var(--chart-4)";
const MAX_TECNICOS = 7;

const monthFormatter = new Intl.DateTimeFormat("es-ES", { month: "short", year: "2-digit", timeZone: "UTC" });
const numberFormatter = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 });

function periodoStart(periodo: Periodo, todayStr: string): string | null {
  if (periodo === "todo") return null;
  if (periodo === "30") return addDaysToDateStr(todayStr, -30);
  if (periodo === "90") return addDaysToDateStr(todayStr, -90);
  // School year starts on 1 September
  const [y, m] = todayStr.split("-").map(Number);
  return `${m >= 9 ? y : y - 1}-09-01`;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** 0.2 -> "5 h", 2.46 -> "2,5 días" */
function formatDias(dias: number): string {
  const horas = dias * 24;
  if (horas < 1) return "< 1 h";
  if (horas < 24) return `${Math.round(horas)} h`;
  return `${numberFormatter.format(dias)} ${dias === 1 ? "día" : "días"}`;
}

function formatPeticiones(n: number): string {
  return `${n} ${n === 1 ? "petición" : "peticiones"}`;
}

/** "YYYY-MM" keys from `from` to `to`, inclusive */
function monthRange(from: string, to: string): string[] {
  const out: string[] = [];
  let [y, m] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return out;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return monthFormatter.format(new Date(Date.UTC(y, m - 1, 1))).replace(".", "");
}

export function EstadisticasTICClient({ peticiones, todayStr }: Props) {
  const [periodo, setPeriodo] = useState<Periodo>("curso");

  const stats = useMemo(() => {
    const start = periodoStart(periodo, todayStr);
    const inPeriodo = (dateStr: string) => !start || dateStr >= start;

    const rows = peticiones.map((p) => ({
      ...p,
      createdDate: dateStrMadrid(p.created_at),
      finalizadaDate: p.finalizada_at ? dateStrMadrid(p.finalizada_at) : null,
      dias: p.finalizada_at ? (new Date(p.finalizada_at).getTime() - new Date(p.created_at).getTime()) / 86_400_000 : null,
    }));

    const creadas = rows.filter((r) => inPeriodo(r.createdDate));
    const finalizadas = rows.filter((r) => r.estado === "finalizada" && r.finalizadaDate && inPeriodo(r.finalizadaDate));
    const pendientes = rows.filter((r) => r.estado === "pendiente").length;
    const enProgreso = rows.filter((r) => r.estado === "en_progreso").length;
    const medianaDias = median(finalizadas.map((r) => r.dias ?? 0));

    // Created vs finished per month (Madrid calendar)
    const firstMonth = (start ?? rows[0]?.createdDate ?? todayStr).slice(0, 7);
    const meses = monthRange(firstMonth, todayStr.slice(0, 7)).map((mes) => ({
      mes: monthLabel(mes),
      creadas: creadas.filter((r) => r.createdDate.startsWith(mes)).length,
      finalizadas: finalizadas.filter((r) => r.finalizadaDate?.startsWith(mes)).length,
    }));

    const porPrioridad = PRIORIDADES.map((p) => ({
      label: p.label,
      value: creadas.filter((r) => r.prioridad === p.id).length,
    }));

    const resolucionPorPrioridad = PRIORIDADES.map((p) => {
      const dias = finalizadas.filter((r) => r.prioridad === p.id).map((r) => r.dias ?? 0);
      return { label: p.label, value: median(dias), n: dias.length };
    }).filter((r): r is { label: string; value: number; n: number } => r.value !== null);

    // Finished requests per technician: top N, the rest folded into "Otros"
    const porTecnicoMap = new Map<string, number>();
    finalizadas.forEach((r) => {
      const key = r.tecnico ?? "Sin asignar";
      porTecnicoMap.set(key, (porTecnicoMap.get(key) ?? 0) + 1);
    });
    const tecnicosOrdenados = [...porTecnicoMap.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
    const porTecnico = tecnicosOrdenados.length > MAX_TECNICOS
      ? [
          ...tecnicosOrdenados.slice(0, MAX_TECNICOS),
          { label: "Otros", value: tecnicosOrdenados.slice(MAX_TECNICOS).reduce((s, t) => s + t.value, 0) },
        ]
      : tecnicosOrdenados;

    return { creadas: creadas.length, finalizadas: finalizadas.length, pendientes, enProgreso, medianaDias, meses, porPrioridad, resolucionPorPrioridad, porTecnico };
  }, [peticiones, periodo, todayStr]);

  const periodoLabel = PERIODOS.find((p) => p.id === periodo)?.label.toLowerCase() ?? "";
  const sinDatos = (
    <p className="text-sm text-gray-400 text-center py-10">No hay datos en este periodo</p>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="space-y-3">
        <Link href="/peticiones-tic" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          <ArrowLeft size={16} /> Peticiones TIC
        </Link>
        <div className="flex items-center gap-3">
          <BarChart3 size={24} className="text-blue-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Estadísticas de peticiones TIC</h1>
            <p className="text-sm text-gray-500">Actividad, tiempos de resolución y reparto de trabajo</p>
          </div>
        </div>
      </div>

      {/* One filter row above everything it scopes */}
      <div role="group" aria-label="Periodo" className="flex flex-wrap bg-gray-100 rounded-lg p-1 gap-1 w-fit max-w-full">
        {PERIODOS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPeriodo(p.id)}
            aria-pressed={periodo === p.id}
            className={`px-4 py-2 min-h-[40px] rounded-md text-sm font-medium transition-colors ${
              periodo === p.id ? "bg-white shadow-sm text-blue-700" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Peticiones creadas" value={String(stats.creadas)} detail={periodoLabel} icon={Inbox} iconClass="bg-blue-100 text-blue-700" />
        <StatTile
          label="Abiertas ahora"
          value={String(stats.pendientes + stats.enProgreso)}
          detail={`${stats.pendientes} pendientes · ${stats.enProgreso} en progreso`}
          icon={Clock3}
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
            ariaLabel={`Gráfico de columnas con las peticiones creadas y finalizadas por mes, ${periodoLabel}`}
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
          ariaLabel={`Gráfico de barras con las peticiones creadas por prioridad, ${periodoLabel}`}
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
            columns: ["Prioridad", "Mediana", "Peticiones finalizadas"],
            rows: stats.resolucionPorPrioridad.map((r) => [r.label, formatDias(r.value), r.n]),
          }}
        >
          {stats.resolucionPorPrioridad.length === 0 ? sinDatos : (
            <HorizontalBarChart data={stats.resolucionPorPrioridad} seriesName="Mediana" color={COLOR_CREADAS} valueFormatter={formatDias} labelWidth={80} />
          )}
        </ChartCard>

        <div className="lg:col-span-2">
          <ChartCard
            title="Peticiones finalizadas por técnico"
            subtitle="Según la persona asignada"
            ariaLabel={`Gráfico de barras con las peticiones finalizadas por cada técnico, ${periodoLabel}`}
            table={{ columns: ["Técnico", "Finalizadas"], rows: stats.porTecnico.map((t) => [t.label, t.value]) }}
          >
            {stats.porTecnico.length === 0 ? sinDatos : (
              <HorizontalBarChart data={stats.porTecnico} seriesName="Finalizadas" color={COLOR_FINALIZADAS} valueFormatter={formatPeticiones} labelWidth={170} />
            )}
          </ChartCard>
        </div>
      </div>
    </div>
  );
}

"use client";

import { ChartCard } from "./ChartCard";
import { HorizontalBarChart } from "./HorizontalBarChart";
import type { ProgresoGrupoV2 } from "@/lib/types/gratuidadV2";

interface Props {
  progreso: ProgresoGrupoV2[];
}

const pct = (v: number) => `${v} %`;

function porcentaje(parte: number, total: number): number {
  return total > 0 ? Math.round((parte / total) * 100) : 0;
}

/** Delivery and return progress per group (% of the lot delivered, % of lent books returned). */
export function GratuidadV2Progreso({ progreso }: Props) {
  const grupos = progreso.filter((g) => g.alumnos > 0);
  if (grupos.length === 0) return null;

  const entrega = grupos.map((g) => ({ label: g.grupo, value: porcentaje(g.entregados, g.esperados) }));
  const devolucion = grupos
    .filter((g) => g.devueltos + g.prestados > 0)
    .map((g) => ({ label: g.grupo, value: porcentaje(g.devueltos, g.devueltos + g.prestados) }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard
        title="Entrega por grupo (sin optativas)"
        subtitle="Porcentaje de libros del lote ya entregados"
        ariaLabel="Gráfico de barras con el porcentaje de libros del lote entregados en cada grupo"
        table={{
          columns: ["Grupo", "Alumnos", "Lote completo", "Libros entregados", "%"],
          rows: grupos.map((g) => [g.grupo, g.alumnos, g.completos, `${g.entregados} / ${g.esperados}`, pct(porcentaje(g.entregados, g.esperados))]),
        }}
      >
        <HorizontalBarChart data={entrega} seriesName="Entregado" color="var(--chart-1)" valueFormatter={pct} labelWidth={90} />
      </ChartCard>
      {devolucion.length > 0 && (
        <ChartCard
          title="Devolución por grupo"
          subtitle="Porcentaje de libros prestados que ya se han devuelto este curso"
          ariaLabel="Gráfico de barras con el porcentaje de libros devueltos en cada grupo"
          table={{
            columns: ["Grupo", "Devueltos", "Pendientes", "%"],
            rows: grupos
              .filter((g) => g.devueltos + g.prestados > 0)
              .map((g) => [g.grupo, g.devueltos, g.prestados, pct(porcentaje(g.devueltos, g.devueltos + g.prestados))]),
          }}
        >
          <HorizontalBarChart data={devolucion} seriesName="Devuelto" color="var(--chart-3)" valueFormatter={pct} labelWidth={90} />
        </ChartCard>
      )}
    </div>
  );
}

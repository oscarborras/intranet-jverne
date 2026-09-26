"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltip } from "./ChartTooltip";

export interface ColumnSeries {
  key: string;
  label: string;
  /** CSS color, always a chart token: "var(--chart-1)" */
  color: string;
}

interface Props {
  data: Record<string, string | number>[];
  /** Key of the category on the x axis (e.g. month label) */
  categoryKey: string;
  series: ColumnSeries[];
  height?: number;
  valueFormatter?: (value: number) => string;
}

const AXIS_TICK = { fill: "#6b7280", fontSize: 11 };

// Columns grouped per category, one colour per series, shared single y axis
export function GroupedColumnChart({ data, categoryKey, series, height = 260, valueFormatter }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -12 }} barGap={2} barCategoryGap="24%">
        <CartesianGrid vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey={categoryKey} tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: "#e5e7eb" }} interval="preserveStartEnd" />
        <YAxis allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} width={40} />
        <Tooltip
          cursor={{ fill: "#f3f4f6" }}
          content={(props) => <ChartTooltip {...props} valueFormatter={valueFormatter} />}
        />
        {series.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} maxBarSize={24} radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

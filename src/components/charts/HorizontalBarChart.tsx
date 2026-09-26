"use client";

import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltip } from "./ChartTooltip";

export interface HorizontalBarDatum {
  label: string;
  value: number;
}

interface Props {
  data: HorizontalBarDatum[];
  /** Name of the single series (shown in the tooltip) */
  seriesName: string;
  /** CSS color, always a chart token: "var(--chart-1)" */
  color: string;
  valueFormatter?: (value: number) => string;
  /** Width reserved for category labels on the left */
  labelWidth?: number;
}

const ROW_HEIGHT = 40;

// Single-series horizontal bars (long category names read better on the left), value at the tip
export function HorizontalBarChart({ data, seriesName, color, valueFormatter, labelWidth = 110 }: Props) {
  const height = Math.max(data.length, 1) * ROW_HEIGHT + 16;
  const format = (v: number) => (valueFormatter ? valueFormatter(v) : String(v));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 56, bottom: 4, left: 0 }}>
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="label"
          width={labelWidth}
          tick={{ fill: "#374151", fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: "#e5e7eb" }}
        />
        <Tooltip
          cursor={{ fill: "#f3f4f6" }}
          content={(props) => <ChartTooltip {...props} valueFormatter={valueFormatter} />}
        />
        <Bar dataKey="value" name={seriesName} fill={color} maxBarSize={20} radius={[0, 4, 4, 0]}>
          <LabelList
            dataKey="value"
            position="right"
            formatter={(v: unknown) => format(Number(v))}
            style={{ fill: "#374151", fontSize: 12, fontWeight: 600 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

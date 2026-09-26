"use client";

import type { TooltipContentProps, TooltipValueType } from "recharts";
import type { NameType } from "recharts/types/component/DefaultTooltipContent";

// Recharts passes its generic content props (values may be numbers or strings)
type Props = Partial<TooltipContentProps<TooltipValueType, NameType>> & {
  /** Formats every value shown in the tooltip (e.g. "3 peticiones", "2,5 días") */
  valueFormatter?: (value: number) => string;
};

// Tooltip shared by every chart: series swatch + name in text ink, value in bold
export function ChartTooltip({ active, payload, label, valueFormatter }: Props) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md px-3 py-2 text-xs min-w-[140px]">
      {label !== undefined && label !== "" && (
        <p className="font-semibold text-gray-900 mb-1.5">{String(label)}</p>
      )}
      <ul className="space-y-1">
        {payload.map((entry) => {
          const value = typeof entry.value === "number" ? entry.value : Number(entry.value ?? 0);
          return (
            <li key={String(entry.dataKey ?? entry.name)} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                style={{ background: entry.color }}
              />
              <span className="text-gray-600 flex-1">{entry.name}</span>
              <span className="font-semibold text-gray-900 tabular-nums">
                {valueFormatter ? valueFormatter(value) : value}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

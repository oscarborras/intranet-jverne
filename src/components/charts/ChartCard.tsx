"use client";

import { useId, useState } from "react";
import { BarChart3, Table2 } from "lucide-react";

export interface ChartLegendItem {
  label: string;
  color: string;
}

export interface ChartTableData {
  columns: string[];
  rows: (string | number)[][];
}

interface Props {
  title: string;
  subtitle?: string;
  /** Required for two or more series; omit for a single series (the title names it) */
  legend?: ChartLegendItem[];
  /** Table twin of the chart: every value stays readable without the tooltip */
  table: ChartTableData;
  /** Short text description for screen readers */
  ariaLabel: string;
  children: React.ReactNode;
}

// Card that frames a chart with its title, legend and a chart/table toggle
export function ChartCard({ title, subtitle, legend, table, ariaLabel, children }: Props) {
  const [showTable, setShowTable] = useState(false);
  const titleId = useId();

  return (
    <section aria-labelledby={titleId} className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5 flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h2 id={titleId} className="text-sm font-semibold text-gray-900">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          aria-pressed={showTable}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 min-h-[36px] rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          {showTable ? <><BarChart3 size={14} /> Ver gráfica</> : <><Table2 size={14} /> Ver tabla</>}
        </button>
      </div>

      {legend && legend.length > 1 && !showTable && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 mb-2" aria-label="Leyenda">
          {legend.map((item) => (
            <li key={item.label} className="flex items-center gap-1.5 text-xs text-gray-600">
              <span aria-hidden="true" className="w-2.5 h-2.5 rounded-sm" style={{ background: item.color }} />
              {item.label}
            </li>
          ))}
        </ul>
      )}

      {showTable ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr className="border-b border-gray-100">
                {table.columns.map((c, i) => (
                  <th key={c} scope="col" className={`py-2 px-2 text-xs font-semibold text-gray-500 ${i === 0 ? "text-left" : "text-right"}`}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, r) => (
                <tr key={r} className="border-b border-gray-50 last:border-0">
                  {row.map((cell, i) =>
                    i === 0 ? (
                      <th key={i} scope="row" className="py-2 px-2 text-left font-medium text-gray-700">{cell}</th>
                    ) : (
                      <td key={i} className="py-2 px-2 text-right text-gray-700 tabular-nums">{cell}</td>
                    )
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div role="img" aria-label={ariaLabel}>
          {children}
        </div>
      )}
    </section>
  );
}

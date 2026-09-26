import type { LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: string;
  /** Short context under the value (e.g. "3 pendientes · 2 en progreso") */
  detail?: string;
  icon: LucideIcon;
  /** Tailwind classes for the icon chip */
  iconClass: string;
}

// Headline figure: a single number reads better as a tile than as a one-bar chart
export function StatTile({ label, value, detail, icon: Icon, iconClass }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-start gap-3">
      <span className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${iconClass}`}>
        <Icon size={18} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-2xl font-semibold text-gray-900 leading-tight mt-0.5">{value}</p>
        {detail && <p className="text-xs text-gray-500 mt-0.5 truncate">{detail}</p>}
      </div>
    </div>
  );
}

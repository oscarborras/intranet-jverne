import type { LucideIcon } from "lucide-react";

// Labelled data blocks for appointment cards, with the same colours as the appointment
// forms (student blue, family green, date/place red, reason amber, staff violet), so it is
// clear which person each field belongs to. Used by "Citas con familias" and "Citas del día".

export interface BlockTheme {
  box: string;
  title: string;
  icon: string;
}

/** Block palette by colour, for cards other than appointments (e.g. the maintenance portal) */
export const BLOCK_THEMES = {
  violet: { box: "border-violet-200 bg-violet-50/60", title: "text-violet-900", icon: "bg-violet-700" },
  blue: { box: "border-blue-200 bg-blue-50/60", title: "text-blue-900", icon: "bg-blue-800" },
  green: { box: "border-green-200 bg-green-50/60", title: "text-green-900", icon: "bg-green-700" },
  red: { box: "border-red-200 bg-red-50/60", title: "text-red-900", icon: "bg-red-700" },
  amber: { box: "border-amber-200 bg-amber-50/60", title: "text-amber-900", icon: "bg-amber-700" },
} satisfies Record<string, BlockTheme>;

export const CITA_THEMES = {
  profesor: BLOCK_THEMES.violet,
  alumno: BLOCK_THEMES.blue,
  familiar: BLOCK_THEMES.green,
  cuando: BLOCK_THEMES.red,
  motivo: BLOCK_THEMES.amber,
} satisfies Record<string, BlockTheme>;

export function CitaBlock({ title, icon: Icon, theme, className = "", plain = false, children }: {
  title: string;
  icon: LucideIcon;
  theme: BlockTheme;
  className?: string;
  /** Free text instead of label/value pairs */
  plain?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-lg border px-3 py-2 ${theme.box} ${className}`}>
      <h3 className={`flex items-center gap-1.5 text-xs font-bold mb-1 ${theme.title}`}>
        <span aria-hidden="true" className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${theme.icon}`}>
          <Icon className="w-3 h-3 text-white" />
        </span>
        {title}
      </h3>
      {plain ? (
        <div className="text-sm text-gray-900 whitespace-pre-line break-words">{children}</div>
      ) : (
        <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-sm">{children}</dl>
      )}
    </section>
  );
}

export function CitaField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-xs text-gray-500 pt-0.5">{label}</dt>
      <dd className="text-gray-900 min-w-0 break-words">{children}</dd>
    </>
  );
}

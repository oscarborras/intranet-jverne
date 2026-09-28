import type { LucideIcon } from "lucide-react";
import type { CitaFamiliaParentesco } from "@/lib/types";

// Coloured form sections shared by the appointment forms ("Derivar cita" and "Registrar mi cita")

export interface SectionTheme {
  border: string;
  headerBg: string;
  headerText: string;
  iconBg: string;
  bodyBg: string;
}

export const PROFESOR_THEME: SectionTheme = {
  border: "#ddd6fe",
  headerBg: "#ede9fe",
  headerText: "#4c1d95",
  iconBg: "#6d28d9",
  bodyBg: "#fbfaff",
};

export const ALUMNO_THEME: SectionTheme = {
  border: "#bfdbfe",
  headerBg: "#dbeafe",
  headerText: "#1e3a8a",
  iconBg: "#1e40af",
  bodyBg: "#f8fbff",
};

export const FAMILIAR_THEME: SectionTheme = {
  border: "#bbf7d0",
  headerBg: "#dcfce7",
  headerText: "#14532d",
  iconBg: "#15803d",
  bodyBg: "#f7fdf9",
};

export const MOTIVO_THEME: SectionTheme = {
  border: "#fde68a",
  headerBg: "#fef3c7",
  headerText: "#78350f",
  iconBg: "#b45309",
  bodyBg: "#fffdf5",
};

// Form block with a coloured border and a prominent header, so each group stands out at a glance
export function FormSection({ title, subtitle, icon: Icon, theme, children }: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  theme: SectionTheme;
  children: React.ReactNode;
}) {
  return (
    // No overflow:hidden here: it would clip dropdowns inside the section (teacher search).
    // The rounded corners are applied to the header and body instead.
    <section style={{ border: `1.5px solid ${theme.border}`, borderRadius: "10px", marginBottom: "20px" }}>
      <div style={{ background: theme.headerBg, borderBottom: `1.5px solid ${theme.border}`, borderRadius: "9px 9px 0 0", padding: "12px 16px", display: "flex", alignItems: "center", gap: "12px" }}>
        <span aria-hidden="true" style={{ width: "34px", height: "34px", borderRadius: "8px", background: theme.iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={18} color="#fff" />
        </span>
        <div>
          <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: theme.headerText }}>{title}</h2>
          <p style={{ margin: "1px 0 0", fontSize: "12px", color: theme.headerText, opacity: 0.75 }}>{subtitle}</p>
        </div>
      </div>
      <div style={{ background: theme.bodyBg, borderRadius: "0 0 9px 9px", padding: "16px 16px 0" }}>
        {children}
      </div>
    </section>
  );
}

export const PARENTESCO_OPTIONS: CitaFamiliaParentesco[] = ["padre", "madre", "tutor/a legal", "otro"];

export const LABEL_STYLE: React.CSSProperties = { display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "4px" };
export const INPUT_STYLE: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px", outline: "none", background: "#fff" };

export const CUANDO_THEME: SectionTheme = {
  border: "#fecaca",
  headerBg: "#fee2e2",
  headerText: "#7f1d1d",
  iconBg: "#b91c1c",
  bodyBg: "#fffafa",
};

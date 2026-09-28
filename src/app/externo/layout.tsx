import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portal de mantenimiento – IES Julio Verne",
};

// Standalone layout: external technicians never see the intranet shell (menu, header)
export default function ExternoLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-gray-50">{children}</div>;
}

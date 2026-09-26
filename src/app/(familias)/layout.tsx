import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Citas con familias – IES Julio Verne",
};

// <html> and <body> come from the root layout; a nested layout must not render them again
export default function FamiliasLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", margin: 0, padding: 0, background: "#f4f4f5", fontFamily: "sans-serif" }}>
      {children}
    </div>
  );
}

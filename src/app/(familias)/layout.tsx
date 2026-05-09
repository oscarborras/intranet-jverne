import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Citas con familias – IES Julio Verne",
};

export default function FamiliasLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, padding: 0, background: "#f4f4f5", fontFamily: "sans-serif" }}>
        {children}
      </body>
    </html>
  );
}

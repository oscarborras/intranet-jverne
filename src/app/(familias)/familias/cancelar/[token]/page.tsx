import { createAdminClient } from "@/lib/supabase/admin";
import CancelarCitaClient from "./CancelarCitaClient";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function CancelarCitaPage({ params }: Props) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: cita } = await admin
    .from("citas_familias")
    .select("id, estado, alumno_nombre, alumno_curso, familiar_nombre, fecha, hora_inicio, lugar")
    .eq("token_familia", token)
    .single();

  return (
    <main style={{ minHeight: "100vh", background: "#f4f4f5", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "32px 16px" }}>
      <div style={{ width: "100%", maxWidth: "480px" }}>
        <div style={{ background: "#1e40af", borderRadius: "8px 8px 0 0", padding: "20px 24px" }}>
          <p style={{ margin: 0, color: "#fff", fontSize: "18px", fontWeight: 700 }}>IES Julio Verne</p>
          <p style={{ margin: "4px 0 0", color: "#bfdbfe", fontSize: "14px" }}>Cancelación de cita</p>
        </div>
        <div style={{ background: "#fff", borderRadius: "0 0 8px 8px", padding: "32px 24px" }}>
          <CancelarCitaClient cita={cita} token={token} />
        </div>
      </div>
    </main>
  );
}

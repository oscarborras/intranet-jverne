import Image from "next/image";
import SolicitudCitaForm from "./SolicitudCitaForm";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCargosDisponibles } from "@/lib/cargos";

export const dynamic = "force-dynamic";

// Teachers are not loaded here: the form searches them through /api/citas/profesores.
// Leadership roles are listed by role name only (never the person holding them).
export default async function SolicitudCitaPage() {
  const cargos = await getCargosDisponibles(createAdminClient());

  return (
    <main style={{ minHeight: "100vh", background: "#f4f4f5", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "32px 16px" }}>
      <div style={{ width: "100%", maxWidth: "560px" }}>
        <div style={{ background: "#1e40af", borderRadius: "8px 8px 0 0", padding: "20px 24px", display: "flex", alignItems: "center", gap: "16px" }}>
          <Image
            src="/logo.jpg"
            alt="Logo IES Julio Verne"
            width={52}
            height={52}
            style={{ borderRadius: "8px", objectFit: "contain", flexShrink: 0 }}
          />
          <div>
            <p style={{ margin: 0, color: "#fff", fontSize: "18px", fontWeight: 700 }}>
              IES Julio Verne
            </p>
            <p style={{ margin: "2px 0 0", color: "#bfdbfe", fontSize: "14px" }}>
              Solicitud de cita con el profesorado
            </p>
          </div>
        </div>
        <div style={{ background: "#fff", borderRadius: "0 0 8px 8px", padding: "32px 24px" }}>
          <SolicitudCitaForm cargos={cargos} />
        </div>
      </div>
    </main>
  );
}

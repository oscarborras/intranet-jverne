"use client";

import { useState } from "react";

interface CitaInfo {
  id: number;
  estado: string;
  alumno_nombre: string;
  alumno_curso: string;
  familiar_nombre: string;
  fecha: string | null;
  hora_inicio: string | null;
  lugar: string | null;
}

interface Props {
  cita: CitaInfo | null;
  token: string;
}

export default function CancelarCitaClient({ cita, token }: Props) {
  const [cancelled, setCancelled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!cita) {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "40px", marginBottom: "12px" }}>❌</div>
        <h2 style={{ margin: "0 0 8px", fontSize: "18px", color: "#111827" }}>Cita no encontrada</h2>
        <p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>
          El enlace de cancelación no es válido o ha caducado.
        </p>
      </div>
    );
  }

  if (cita.estado === "cancelada") {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "40px", marginBottom: "12px" }}>ℹ️</div>
        <h2 style={{ margin: "0 0 8px", fontSize: "18px", color: "#111827" }}>La cita ya está cancelada</h2>
        <p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>Esta cita ya fue cancelada anteriormente.</p>
      </div>
    );
  }

  if (cita.estado === "completada") {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "40px", marginBottom: "12px" }}>✅</div>
        <h2 style={{ margin: "0 0 8px", fontSize: "18px", color: "#111827" }}>La visita ya se realizó</h2>
        <p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>Esta cita ya fue marcada como completada.</p>
      </div>
    );
  }

  if (cancelled) {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>✅</div>
        <h2 style={{ margin: "0 0 8px", fontSize: "20px", color: "#111827" }}>Cita cancelada</h2>
        <p style={{ margin: 0, color: "#6b7280", fontSize: "14px", lineHeight: 1.6 }}>
          Su cita ha sido cancelada correctamente. Se ha notificado al profesor/a.
        </p>
      </div>
    );
  }

  const fechaStr = cita.fecha
    ? new Date(cita.fecha + "T00:00:00").toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : null;

  async function handleCancel() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/citas/cancelar-familia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Error al cancelar la cita");
      }
      setCancelled(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h2 style={{ margin: "0 0 8px", fontSize: "18px", color: "#111827" }}>¿Desea cancelar esta cita?</h2>
      <p style={{ margin: "0 0 24px", color: "#6b7280", fontSize: "14px" }}>
        Revise los datos de la cita antes de cancelarla.
      </p>

      <div style={{ background: "#f9fafb", borderRadius: "6px", padding: "16px", marginBottom: "24px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {[
              ["Alumno/a", `${cita.alumno_nombre} (${cita.alumno_curso})`],
              ["Familiar", cita.familiar_nombre],
              ...(fechaStr ? [["Fecha", fechaStr]] : []),
              ...(cita.hora_inicio ? [["Hora", cita.hora_inicio]] : []),
              ...(cita.lugar ? [["Lugar", cita.lugar]] : []),
            ].map(([label, value]) => (
              <tr key={label}>
                <td style={{ padding: "4px 8px 4px 0", color: "#6b7280", fontSize: "13px", verticalAlign: "top", width: "100px" }}>{label}</td>
                <td style={{ padding: "4px 0", color: "#111827", fontSize: "14px", fontWeight: 500 }}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && (
        <div style={{ marginBottom: "16px", padding: "12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#dc2626", fontSize: "14px" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: "12px" }}>
        <button
          onClick={handleCancel}
          disabled={loading}
          style={{ flex: 1, padding: "12px", background: loading ? "#9ca3af" : "#dc2626", color: "#fff", border: "none", borderRadius: "6px", fontSize: "15px", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer" }}
        >
          {loading ? "Cancelando..." : "Sí, cancelar la cita"}
        </button>
        <a
          href="/"
          style={{ flex: 1, padding: "12px", background: "#f3f4f6", color: "#374151", border: "none", borderRadius: "6px", fontSize: "15px", fontWeight: 600, textDecoration: "none", textAlign: "center", lineHeight: "23px" }}
        >
          Volver
        </a>
      </div>
    </>
  );
}

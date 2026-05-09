"use client";

import { useState } from "react";
import type { CitaFamiliaParentesco } from "@/lib/types";

interface Profesor {
  id: string;
  profesor: string;
}

interface Props {
  profesores: Profesor[];
}

const PARENTESCO_OPTIONS: CitaFamiliaParentesco[] = ["padre", "madre", "tutor/a legal", "otro"];

export default function SolicitudCitaForm({ profesores }: Props) {
  const [form, setForm] = useState({
    profesor_id: "",
    alumno_nombre: "",
    alumno_curso: "",
    familiar_nombre: "",
    familiar_parentesco: "" as CitaFamiliaParentesco | "",
    familiar_email: "",
    familiar_telefono: "",
    motivo: "",
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inp = (field: string, label: string, required = false, type = "text", placeholder = "") => (
    <div style={{ marginBottom: "16px" }}>
      <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
        {label}{required && <span style={{ color: "#dc2626" }}> *</span>}
      </label>
      <input
        type={type}
        required={required}
        placeholder={placeholder}
        value={(form as Record<string, string>)[field]}
        onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
        style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px", outline: "none" }}
      />
    </div>
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.profesor_id || !form.alumno_nombre.trim() || !form.alumno_curso.trim() || !form.familiar_nombre.trim() || !form.familiar_parentesco || !form.familiar_email.trim() || !form.motivo.trim()) {
      setError("Por favor, complete todos los campos obligatorios.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/citas/solicitar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Error al enviar la solicitud");
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  if (success) {
    return (
      <div style={{ textAlign: "center", padding: "24px 0" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>✅</div>
        <h2 style={{ margin: "0 0 8px", fontSize: "20px", color: "#111827" }}>Solicitud enviada</h2>
        <p style={{ margin: 0, color: "#6b7280", fontSize: "14px", lineHeight: 1.6 }}>
          Hemos recibido su solicitud. El profesor/a se pondrá en contacto con usted para acordar la fecha y hora de la visita.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <p style={{ margin: "0 0 24px", color: "#6b7280", fontSize: "14px", lineHeight: 1.6 }}>
        Rellene el formulario para solicitar una cita de visita con el profesorado.
        El profesor/a se pondrá en contacto con usted para confirmar la fecha y hora.
      </p>

      <div style={{ marginBottom: "16px" }}>
        <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
          Profesor/a <span style={{ color: "#dc2626" }}>*</span>
        </label>
        <select
          required
          value={form.profesor_id}
          onChange={(e) => setForm((f) => ({ ...f, profesor_id: e.target.value }))}
          style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px", background: "#fff", outline: "none" }}
        >
          <option value="">Seleccione un profesor/a</option>
          {profesores.map((p) => (
            <option key={p.id} value={p.id}>{p.profesor}</option>
          ))}
        </select>
      </div>

      <div style={{ background: "#f9fafb", borderRadius: "6px", padding: "16px", marginBottom: "16px" }}>
        <p style={{ margin: "0 0 12px", fontSize: "13px", fontWeight: 600, color: "#374151" }}>
          Datos del alumno/a
        </p>
        {inp("alumno_nombre", "Nombre y apellidos del alumno/a", true, "text", "Ej: García López, Ana")}
        {inp("alumno_curso", "Curso", true, "text", "Ej: 2º ESO A")}
      </div>

      <div style={{ background: "#f9fafb", borderRadius: "6px", padding: "16px", marginBottom: "16px" }}>
        <p style={{ margin: "0 0 12px", fontSize: "13px", fontWeight: 600, color: "#374151" }}>
          Datos del familiar
        </p>
        {inp("familiar_nombre", "Nombre y apellidos", true, "text", "Ej: García Martínez, José")}
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
            Parentesco <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <select
            required
            value={form.familiar_parentesco}
            onChange={(e) => setForm((f) => ({ ...f, familiar_parentesco: e.target.value as CitaFamiliaParentesco }))}
            style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px", background: "#fff", outline: "none" }}
          >
            <option value="">Seleccionar parentesco</option>
            {PARENTESCO_OPTIONS.map((p) => (
              <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
        </div>
        {inp("familiar_email", "Email de contacto", true, "email", "nombre@ejemplo.com")}
        {inp("familiar_telefono", "Teléfono (opcional)", false, "tel", "Ej: 612 345 678")}
      </div>

      <div style={{ marginBottom: "24px" }}>
        <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
          Motivo de la visita <span style={{ color: "#dc2626" }}>*</span>
        </label>
        <textarea
          required
          rows={3}
          placeholder="Describa brevemente el motivo de la visita..."
          value={form.motivo}
          onChange={(e) => setForm((f) => ({ ...f, motivo: e.target.value }))}
          style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px", outline: "none", resize: "vertical" }}
        />
      </div>

      {error && (
        <div style={{ marginBottom: "16px", padding: "12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#dc2626", fontSize: "14px" }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        style={{ width: "100%", padding: "12px", background: saving ? "#9ca3af" : "#1e40af", color: "#fff", border: "none", borderRadius: "6px", fontSize: "15px", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}
      >
        {saving ? "Enviando..." : "Enviar solicitud"}
      </button>
    </form>
  );
}

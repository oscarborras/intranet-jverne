"use client";

import { useState } from "react";
import { GraduationCap, MessageSquareText, TriangleAlert, UserRound, Users } from "lucide-react";
import type { CargoDirectivoClave, CitaFamilia, CitaFamiliaParentesco } from "@/lib/types";
import ProfesorSearch, { type ProfesorOption } from "./ProfesorSearch";
import { ALUMNO_THEME, FAMILIAR_THEME, FormSection, MOTIVO_THEME, PARENTESCO_OPTIONS, PROFESOR_THEME } from "./CitaFormSection";

interface CargoOption {
  cargo: CargoDirectivoClave;
  nombre: string;
}

interface Props {
  /** Leadership roles with an active holder (role name only) */
  cargos: CargoOption[];
  /** Called with the new request so the list can show it without reloading */
  onCreated: (cita: CitaFamilia) => void;
  onClose: () => void;
}

interface SolicitarResponse {
  cita?: Omit<CitaFamilia, "profesor">;
  profesorNombre?: string;
  error?: string;
}

/** Who the appointment is with: a specific teacher or a leadership role */
type Destino = "profesor" | CargoDirectivoClave;

export default function SolicitudCitaForm({ cargos, onCreated, onClose }: Props) {
  const [destino, setDestino] = useState<Destino>("profesor");
  const [profesor, setProfesor] = useState<ProfesorOption | null>(null);
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
    const conProfesor = destino === "profesor";
    if ((conProfesor && !form.profesor_id) || !form.alumno_nombre.trim() || !form.alumno_curso.trim() || !form.familiar_nombre.trim() || !form.familiar_parentesco || !form.familiar_email.trim() || !form.motivo.trim()) {
      setError("Por favor, complete todos los campos obligatorios.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/citas/solicitar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          conProfesor ? { ...form, cargo: null } : { ...form, profesor_id: "", cargo: destino }
        ),
      });
      const data = (await res.json().catch(() => ({}))) as SolicitarResponse;
      if (!res.ok) throw new Error(data.error ?? "Error al enviar la solicitud");
      if (data.cita) onCreated({ ...data.cita, profesor: { full_name: data.profesorNombre ?? "—", email: "" } });
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
        <h2 style={{ margin: "0 0 8px", fontSize: "20px", color: "#111827" }}>Cita derivada</h2>
        <p style={{ margin: "0 0 24px", color: "#6b7280", fontSize: "14px", lineHeight: 1.6 }}>
          La solicitud se ha registrado como pendiente. El profesor/a o cargo destinatario ha recibido un aviso y se pondrá en contacto con la familia para acordar la fecha y hora de la visita.
        </p>
        <button
          type="button"
          onClick={onClose}
          style={{ width: "100%", minHeight: "44px", padding: "12px", background: "#1e40af", color: "#fff", border: "none", borderRadius: "6px", fontSize: "15px", fontWeight: 600, cursor: "pointer" }}
        >
          Cerrar
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Reminder for the tutor: referrals are the exception, not the norm */}
      <div role="note" style={{ display: "flex", gap: "12px", alignItems: "flex-start", margin: "0 0 20px", padding: "12px 14px", background: "#fffbeb", border: "1.5px solid #fcd34d", borderLeft: "5px solid #d97706", borderRadius: "8px" }}>
        <TriangleAlert size={20} color="#b45309" aria-hidden="true" style={{ flexShrink: 0, marginTop: "1px" }} />
        <div>
          <p style={{ margin: "0 0 2px", fontSize: "14px", fontWeight: 700, color: "#78350f" }}>Antes de derivar la cita</p>
          <p style={{ margin: 0, fontSize: "13px", color: "#92400e", lineHeight: 1.5 }}>
            Deriva una cita solo en casos justificados que se salgan de las competencias de la tutoría.
            Lo habitual es que el tutor/a atienda a la familia.
          </p>
        </div>
      </div>

      <p style={{ margin: "0 0 24px", color: "#6b7280", fontSize: "14px", lineHeight: 1.6 }}>
        Registre la solicitud de cita de una familia con un profesor/a o con el equipo directivo.
        La persona destinataria recibirá un aviso y se pondrá en contacto con la familia para confirmar la fecha y hora.
      </p>

      <FormSection title="¿Con quién desea la cita la familia?" subtitle="Un profesor/a o un cargo del equipo directivo" icon={UserRound} theme={PROFESOR_THEME}>
        {cargos.length > 0 && (
          <fieldset style={{ border: "none", margin: "0 0 16px", padding: 0 }}>
            <legend style={{ fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "8px", padding: 0 }}>
              Cita con <span style={{ color: "#dc2626" }}>*</span>
            </legend>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "8px" }}>
              {[{ value: "profesor" as Destino, label: "Un profesor/a" }, ...cargos.map((c) => ({ value: c.cargo as Destino, label: c.nombre }))].map((opt) => {
                const checked = destino === opt.value;
                return (
                  <label
                    key={opt.value}
                    style={{ display: "flex", alignItems: "center", gap: "8px", minHeight: "44px", padding: "8px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: checked ? 600 : 500, color: checked ? "#4c1d95" : "#374151", background: checked ? "#ede9fe" : "#fff", border: `1.5px solid ${checked ? "#8b5cf6" : "#d1d5db"}` }}
                  >
                    <input
                      type="radio"
                      name="destino"
                      value={opt.value}
                      checked={checked}
                      onChange={() => setDestino(opt.value)}
                      style={{ accentColor: "#6d28d9", width: "16px", height: "16px", margin: 0, flexShrink: 0 }}
                    />
                    {opt.label}
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}

        {destino === "profesor" ? (
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
              Profesor/a <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <ProfesorSearch
              value={profesor}
              onChange={(p) => {
                setProfesor(p);
                setForm((f) => ({ ...f, profesor_id: p?.id ?? "" }));
              }}
            />
          </div>
        ) : (
          <p style={{ margin: "0 0 16px", padding: "10px 12px", borderRadius: "6px", background: "#fff", border: "1px solid #ddd6fe", fontSize: "13px", color: "#4c1d95", lineHeight: 1.5 }}>
            La solicitud llegará a la persona que ocupa el cargo de <strong>{cargos.find((c) => c.cargo === destino)?.nombre}</strong>, que se pondrá en contacto con la familia.
          </p>
        )}
      </FormSection>

      <FormSection title="Datos del alumno/a" subtitle="Alumno o alumna sobre quien trata la visita" icon={GraduationCap} theme={ALUMNO_THEME}>
        {inp("alumno_nombre", "Nombre y apellidos del alumno/a", true, "text", "Ej: García López, Ana")}
        {inp("alumno_curso", "Curso", true, "text", "Ej: 2º ESO A")}
      </FormSection>

      <FormSection title="Datos del familiar" subtitle="Persona que asistirá a la cita" icon={Users} theme={FAMILIAR_THEME}>
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
      </FormSection>

      <FormSection title="Motivo de la visita" subtitle="Tema que la familia desea tratar en la reunión" icon={MessageSquareText} theme={MOTIVO_THEME}>
        <div style={{ marginBottom: "16px" }}>
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
      </FormSection>

      {error && (
        <div style={{ marginBottom: "16px", padding: "12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#dc2626", fontSize: "14px" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: "8px" }}>
        <button
          type="submit"
          disabled={saving}
          style={{ flex: 1, minHeight: "44px", padding: "12px", background: saving ? "#9ca3af" : "#1e40af", color: "#fff", border: "none", borderRadius: "6px", fontSize: "15px", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}
        >
          {saving ? "Derivando..." : "Derivar cita"}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          style={{ flex: 1, minHeight: "44px", padding: "12px", background: "#f3f4f6", color: "#374151", border: "none", borderRadius: "6px", fontSize: "15px", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

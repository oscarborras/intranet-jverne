"use client";

import { useState } from "react";
import { GraduationCap, MessageSquareText, UserRound, Users, type LucideIcon } from "lucide-react";
import type { CargoDirectivoClave, CitaFamiliaParentesco } from "@/lib/types";
import ProfesorSearch, { type ProfesorOption } from "./ProfesorSearch";

interface CargoOption {
  cargo: CargoDirectivoClave;
  nombre: string;
}

interface Props {
  /** Leadership roles with an active holder (role name only) */
  cargos: CargoOption[];
}

/** Who the appointment is with: a specific teacher or a leadership role */
type Destino = "profesor" | CargoDirectivoClave;

const PARENTESCO_OPTIONS: CitaFamiliaParentesco[] = ["padre", "madre", "tutor/a legal", "otro"];

interface SectionTheme {
  border: string;
  headerBg: string;
  headerText: string;
  iconBg: string;
  bodyBg: string;
}

const PROFESOR_THEME: SectionTheme = {
  border: "#ddd6fe",
  headerBg: "#ede9fe",
  headerText: "#4c1d95",
  iconBg: "#6d28d9",
  bodyBg: "#fbfaff",
};

const ALUMNO_THEME: SectionTheme = {
  border: "#bfdbfe",
  headerBg: "#dbeafe",
  headerText: "#1e3a8a",
  iconBg: "#1e40af",
  bodyBg: "#f8fbff",
};

const FAMILIAR_THEME: SectionTheme = {
  border: "#bbf7d0",
  headerBg: "#dcfce7",
  headerText: "#14532d",
  iconBg: "#15803d",
  bodyBg: "#f7fdf9",
};

const MOTIVO_THEME: SectionTheme = {
  border: "#fde68a",
  headerBg: "#fef3c7",
  headerText: "#78350f",
  iconBg: "#b45309",
  bodyBg: "#fffdf5",
};

// Form block with a coloured border and a prominent header, so each group stands out at a glance
function FormSection({ title, subtitle, icon: Icon, theme, children }: {
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

export default function SolicitudCitaForm({ cargos }: Props) {
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

      <FormSection title="¿Con quién desea la cita?" subtitle="Un profesor/a o un cargo del equipo directivo" icon={UserRound} theme={PROFESOR_THEME}>
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
            Su solicitud llegará a la persona que ocupa el cargo de <strong>{cargos.find((c) => c.cargo === destino)?.nombre}</strong>, que se pondrá en contacto con usted.
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

      <FormSection title="Motivo de la visita" subtitle="Tema que desea tratar en la reunión" icon={MessageSquareText} theme={MOTIVO_THEME}>
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

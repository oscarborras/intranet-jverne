"use client";

import { useState } from "react";
import { Building2, CalendarClock, GraduationCap, MessageSquareText, Users } from "lucide-react";
import { CITA_TIPO_LABELS, LUGARES_CITA, type CitaFamiliaParentesco, type CitaTipo } from "@/lib/types";
import {
  ALUMNO_THEME,
  CUANDO_THEME,
  FAMILIAR_THEME,
  FormSection,
  INPUT_STYLE,
  LABEL_STYLE,
  MOTIVO_THEME,
  PARENTESCO_OPTIONS,
} from "./CitaFormSection";

export interface RegistrarCitaData {
  tipo: CitaTipo;
  alumno_nombre: string;
  alumno_curso: string;
  familiar_nombre: string;
  familiar_parentesco: CitaFamiliaParentesco;
  familiar_email: string;
  familiar_telefono: string;
  /** Company or organisation ("otro" only) */
  entidad: string;
  motivo: string;
  fecha: string;
  hora_inicio: string;
  lugar: string;
}

interface Props {
  /** Saves the appointment; throws with a user-facing message on failure */
  onSubmit: (data: RegistrarCitaData) => Promise<void>;
  onClose: () => void;
}

const EMPTY: RegistrarCitaData = {
  tipo: "familia",
  alumno_nombre: "",
  alumno_curso: "",
  familiar_nombre: "",
  familiar_parentesco: "padre",
  familiar_email: "",
  familiar_telefono: "",
  entidad: "",
  motivo: "",
  fecha: "",
  hora_inicio: "",
  lugar: LUGARES_CITA[0],
};

type TextField = Exclude<keyof RegistrarCitaData, "tipo" | "familiar_parentesco" | "lugar">;

const TIPOS: CitaTipo[] = ["familia", "otro"];

// Select value that switches the place to a free-text input
const LUGAR_OTRO = "__otro__";

// The user's own appointment (with a family or with someone else), already agreed: it is created as confirmed
export default function RegistrarCitaForm({ onSubmit, onClose }: Props) {
  const [form, setForm] = useState<RegistrarCitaData>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Place typed by the user instead of one of LUGARES_CITA
  const [lugarLibre, setLugarLibre] = useState(false);

  const isFamilia = form.tipo === "familia";

  const inp = (field: TextField, label: string, required = false, type = "text", placeholder = "") => (
    <div style={{ marginBottom: "16px" }}>
      <label htmlFor={`registrar-${field}`} style={LABEL_STYLE}>
        {label}{required && <span style={{ color: "#dc2626" }}> *</span>}
      </label>
      <input
        id={`registrar-${field}`}
        type={type}
        required={required}
        placeholder={placeholder}
        value={form[field]}
        onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
        style={INPUT_STYLE}
      />
    </div>
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const faltanDatosFamilia = isFamilia && (!form.alumno_nombre.trim() || !form.alumno_curso.trim());
    if (faltanDatosFamilia || !form.familiar_nombre.trim() || !form.fecha || !form.hora_inicio || !form.lugar.trim()) {
      setError("Por favor, complete todos los campos obligatorios.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar la cita");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <fieldset style={{ border: "none", padding: 0, margin: "0 0 16px" }}>
        <legend style={LABEL_STYLE}>Tipo de cita</legend>
        <div role="radiogroup" aria-label="Tipo de cita" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          {TIPOS.map((t) => {
            const selected = form.tipo === t;
            return (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => { setForm((f) => ({ ...f, tipo: t })); setError(null); }}
                style={{ minHeight: "44px", padding: "10px", borderRadius: "6px", fontSize: "14px", fontWeight: 600, cursor: "pointer", border: selected ? "2px solid #b91c1c" : "1px solid #d1d5db", background: selected ? "#fef2f2" : "#fff", color: selected ? "#991b1b" : "#374151" }}
              >
                {CITA_TIPO_LABELS[t]}
              </button>
            );
          })}
        </div>
      </fieldset>

      <p style={{ margin: "0 0 24px", color: "#6b7280", fontSize: "14px", lineHeight: 1.6 }}>
        {isFamilia
          ? "Registre una cita que ya ha acordado con una familia. Se creará directamente como confirmada y, si indica su email, la familia recibirá la fecha, hora y lugar junto con un enlace para cancelarla."
          : "Registre una cita ya acordada con una empresa, organismo u otra persona. Se creará directamente como confirmada."}
      </p>

      {isFamilia ? (
        <>
          <FormSection title="Datos del alumno/a" subtitle="Alumno o alumna sobre quien trata la visita" icon={GraduationCap} theme={ALUMNO_THEME}>
            {inp("alumno_nombre", "Nombre y apellidos del alumno/a", true, "text", "Ej: García López, Ana")}
            {inp("alumno_curso", "Curso", true, "text", "Ej: 2º ESO A")}
          </FormSection>

          <FormSection title="Datos del familiar" subtitle="Persona que asistirá a la cita" icon={Users} theme={FAMILIAR_THEME}>
            {inp("familiar_nombre", "Nombre y apellidos", true, "text", "Ej: García Martínez, José")}
            <div style={{ marginBottom: "16px" }}>
              <label htmlFor="registrar-familiar_parentesco" style={LABEL_STYLE}>Parentesco</label>
              <select
                id="registrar-familiar_parentesco"
                value={form.familiar_parentesco}
                onChange={(e) => setForm((f) => ({ ...f, familiar_parentesco: e.target.value as CitaFamiliaParentesco }))}
                style={INPUT_STYLE}
              >
                {PARENTESCO_OPTIONS.map((p) => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>
            {inp("familiar_email", "Email de contacto (opcional, para enviarle la confirmación)", false, "email", "nombre@ejemplo.com")}
            {inp("familiar_telefono", "Teléfono (opcional)", false, "tel", "Ej: 612 345 678")}
          </FormSection>
        </>
      ) : (
        <FormSection title="Persona de contacto" subtitle="Persona que asistirá a la cita" icon={Building2} theme={FAMILIAR_THEME}>
          {inp("familiar_nombre", "Nombre y apellidos", true, "text", "Ej: García Martínez, José")}
          {inp("entidad", "Entidad o empresa (opcional)", false, "text", "Ej: Ayuntamiento de Fuenlabrada")}
          {inp("familiar_telefono", "Teléfono (opcional)", false, "tel", "Ej: 612 345 678")}
        </FormSection>
      )}

      <FormSection title="Fecha, hora y lugar" subtitle="Cuándo y dónde será la reunión" icon={CalendarClock} theme={CUANDO_THEME}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", columnGap: "12px" }}>
          {inp("fecha", "Fecha", true, "date")}
          {inp("hora_inicio", "Hora", true, "time")}
        </div>
        <div style={{ marginBottom: "16px" }}>
          <label htmlFor="registrar-lugar" style={LABEL_STYLE}>Lugar</label>
          <select
            id="registrar-lugar"
            value={lugarLibre ? LUGAR_OTRO : form.lugar}
            onChange={(e) => {
              const value = e.target.value;
              const libre = value === LUGAR_OTRO;
              setLugarLibre(libre);
              setForm((f) => ({ ...f, lugar: libre ? "" : value }));
            }}
            style={INPUT_STYLE}
          >
            {LUGARES_CITA.map((l) => <option key={l} value={l}>{l}</option>)}
            <option value={LUGAR_OTRO}>Otro lugar (escribir)…</option>
          </select>
        </div>
        {lugarLibre && (
          <div style={{ marginBottom: "16px" }}>
            <label htmlFor="registrar-lugar-libre" style={LABEL_STYLE}>
              Indique el lugar<span style={{ color: "#dc2626" }}> *</span>
            </label>
            <input
              id="registrar-lugar-libre"
              type="text"
              required
              autoFocus
              maxLength={100}
              placeholder="Ej: Aula 2.14, Biblioteca, videollamada..."
              value={form.lugar}
              onChange={(e) => setForm((f) => ({ ...f, lugar: e.target.value }))}
              style={INPUT_STYLE}
            />
          </div>
        )}
      </FormSection>

      <FormSection title="Motivo de la visita" subtitle="Tema que se tratará en la reunión (opcional)" icon={MessageSquareText} theme={MOTIVO_THEME}>
        <div style={{ marginBottom: "16px" }}>
          <label htmlFor="registrar-motivo" style={LABEL_STYLE}>Motivo de la visita</label>
          <textarea
            id="registrar-motivo"
            rows={3}
            placeholder="Describa brevemente el motivo de la visita..."
            value={form.motivo}
            onChange={(e) => setForm((f) => ({ ...f, motivo: e.target.value }))}
            style={{ ...INPUT_STYLE, resize: "vertical" }}
          />
        </div>
      </FormSection>

      {error && (
        <div role="alert" style={{ marginBottom: "16px", padding: "12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#dc2626", fontSize: "14px" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: "8px" }}>
        <button
          type="submit"
          disabled={saving}
          style={{ flex: 1, minHeight: "44px", padding: "12px", background: saving ? "#9ca3af" : "#b91c1c", color: "#fff", border: "none", borderRadius: "6px", fontSize: "15px", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}
        >
          {saving ? "Guardando..." : "Registrar cita"}
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

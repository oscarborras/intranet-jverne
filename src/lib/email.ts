import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = "IES Julio Verne <noreply@iesjulioverne.es>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

function baseLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;max-width:100%;">
        <tr><td style="background:#1e40af;padding:20px 32px;">
          <p style="margin:0;color:#fff;font-size:18px;font-weight:700;">IES Julio Verne · Bitácora</p>
        </td></tr>
        <tr><td style="padding:32px;">${content}</td></tr>
        <tr><td style="background:#f4f4f5;padding:16px 32px;">
          <p style="margin:0;color:#6b7280;font-size:12px;">Este es un mensaje automático. No responda a este correo.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function row(label: string, value: string): string {
  return `<tr>
    <td style="padding:4px 0;color:#6b7280;font-size:14px;width:160px;">${label}</td>
    <td style="padding:4px 0;color:#111827;font-size:14px;font-weight:500;">${value}</td>
  </tr>`;
}

interface NuevaSolicitudParams {
  profesorEmail: string;
  profesorNombre: string;
  codigo: string;
  alumnoNombre: string;
  alumnoCurso: string;
  familiarNombre: string;
  familiarParentesco: string;
  familiarEmail: string | null;
  familiarTelefono: string | null;
  motivo: string | null;
}

export async function sendNuevaSolicitudEmail(p: NuevaSolicitudParams) {
  const body = baseLayout(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#111827;">Nueva solicitud de cita</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">Se ha recibido una nueva solicitud de visita para usted.</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #e5e7eb;padding-top:16px;">
      ${row("Código", p.codigo)}
      ${row("Alumno/a", `${p.alumnoNombre} (${p.alumnoCurso})`)}
      ${row("Familiar", `${p.familiarNombre} (${p.familiarParentesco})`)}
      ${p.familiarEmail ? row("Email familiar", p.familiarEmail) : ""}
      ${p.familiarTelefono ? row("Teléfono", p.familiarTelefono) : ""}
      ${p.motivo ? row("Motivo", p.motivo) : ""}
    </table>
    <p style="margin:24px 0 0;font-size:14px;color:#6b7280;">
      Acceda a la intranet para gestionar esta solicitud.
    </p>
    <a href="${SITE_URL}/citas-familias" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#1e40af;color:#fff;border-radius:6px;text-decoration:none;font-size:14px;font-weight:500;">
      Ver en la intranet →
    </a>
  `);

  return resend.emails.send({
    from: FROM,
    to: p.profesorEmail,
    subject: `Nueva solicitud de cita – ${p.alumnoNombre} – ${p.familiarNombre}`,
    html: body,
  });
}

interface CitaConfirmadaParams {
  familiarEmail: string;
  profesorNombre: string;
  alumnoNombre: string;
  alumnoCurso: string;
  familiar_nombre: string;
  fecha: string;
  horaInicio: string;
  lugar: string;
  tokenFamilia: string;
}

export async function sendCitaConfirmadaEmail(p: CitaConfirmadaParams) {
  const cancelUrl = `${SITE_URL}/familias/cancelar/${p.tokenFamilia}`;
  const fechaFormateada = new Date(p.fecha + "T00:00:00").toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const body = baseLayout(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#111827;">Cita confirmada</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">
      Su solicitud de visita con <strong>${p.profesorNombre}</strong> ha sido confirmada.
    </p>
    <table cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #e5e7eb;padding-top:16px;">
      ${row("Alumno/a", `${p.alumnoNombre} (${p.alumnoCurso})`)}
      ${row("Fecha", fechaFormateada)}
      ${row("Hora", p.horaInicio)}
      ${row("Lugar", p.lugar)}
      ${row("Profesor/a", p.profesorNombre)}
    </table>
    <p style="margin:24px 0 8px;font-size:14px;color:#6b7280;">
      Si no puede asistir, puede cancelar la cita haciendo clic en el siguiente enlace:
    </p>
    <a href="${cancelUrl}" style="display:inline-block;padding:10px 20px;background:#dc2626;color:#fff;border-radius:6px;text-decoration:none;font-size:14px;font-weight:500;">
      Cancelar mi cita
    </a>
  `);

  return resend.emails.send({
    from: FROM,
    to: p.familiarEmail,
    subject: `Cita confirmada – ${fechaFormateada} ${p.horaInicio} – ${p.lugar}`,
    html: body,
  });
}

interface CancelProfesorParams {
  familiarEmail: string;
  profesorNombre: string;
  alumnoNombre: string;
  fecha: string | null;
  horaInicio: string | null;
  motivo: string | null;
}

export async function sendCanceladaProfesorEmail(p: CancelProfesorParams) {
  const fechaStr = p.fecha
    ? new Date(p.fecha + "T00:00:00").toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : null;

  const body = baseLayout(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#111827;">Cita cancelada</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">
      Lamentamos informarle que <strong>${p.profesorNombre}</strong> ha cancelado la siguiente cita.
    </p>
    <table cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #e5e7eb;padding-top:16px;">
      ${row("Alumno/a", p.alumnoNombre)}
      ${fechaStr ? row("Fecha", fechaStr) : ""}
      ${p.horaInicio ? row("Hora", p.horaInicio) : ""}
      ${p.motivo ? row("Motivo", p.motivo) : ""}
    </table>
    <p style="margin:24px 0 0;font-size:14px;color:#6b7280;">
      Puede ponerse en contacto con el centro para solicitar una nueva cita si lo necesita.
    </p>
  `);

  return resend.emails.send({
    from: FROM,
    to: p.familiarEmail,
    subject: `Cita cancelada – IES Julio Verne`,
    html: body,
  });
}

// ─── Ausencias ────────────────────────────────────────────────────────────────

interface AusenciaRegistradaParams {
  directivaEmails: string[];
  profesorNombre: string;
  codigo: string;
  fecha: string;
  tramoNombre: string;
  cursoNombre: string | null;
  aula: string | null;
  tareas: string | null;
  observaciones: string | null;
}

export async function sendAusenciaRegistradaEmail(p: AusenciaRegistradaParams) {
  if (p.directivaEmails.length === 0) return;

  const fechaFormateada = new Date(p.fecha + "T00:00:00").toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const body = baseLayout(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#111827;">Nueva ausencia registrada</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">
      <strong>${p.profesorNombre}</strong> ha registrado una ausencia para el ${fechaFormateada}.
    </p>
    <table cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #e5e7eb;padding-top:16px;">
      ${row("Código", p.codigo)}
      ${row("Profesor/a", p.profesorNombre)}
      ${row("Fecha", fechaFormateada)}
      ${row("Tramo", p.tramoNombre)}
      ${p.cursoNombre ? row("Curso / Grupo", p.cursoNombre) : ""}
      ${p.aula ? row("Aula", p.aula) : ""}
      ${p.tareas ? row("Tareas", p.tareas) : ""}
      ${p.observaciones ? row("Observaciones", p.observaciones) : ""}
    </table>
    <a href="${SITE_URL}/ausencias" style="display:inline-block;margin-top:24px;padding:10px 20px;background:#1e40af;color:#fff;border-radius:6px;text-decoration:none;font-size:14px;font-weight:500;">
      Ver en la intranet →
    </a>
  `);

  return resend.emails.send({
    from: FROM,
    to: p.directivaEmails,
    subject: `Ausencia registrada – ${p.profesorNombre} – ${fechaFormateada}`,
    html: body,
  });
}

interface CancelFamiliaParams {
  profesorEmail: string;
  alumnoNombre: string;
  familiarNombre: string;
  fecha: string | null;
  horaInicio: string | null;
}

export async function sendCanceladaFamiliaEmail(p: CancelFamiliaParams) {
  const fechaStr = p.fecha
    ? new Date(p.fecha + "T00:00:00").toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : null;

  const body = baseLayout(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#111827;">Cita cancelada por la familia</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">
      La familia de <strong>${p.alumnoNombre}</strong> ha cancelado la siguiente cita.
    </p>
    <table cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #e5e7eb;padding-top:16px;">
      ${row("Alumno/a", p.alumnoNombre)}
      ${row("Familiar", p.familiarNombre)}
      ${fechaStr ? row("Fecha cancelada", fechaStr) : ""}
      ${p.horaInicio ? row("Hora", p.horaInicio) : ""}
    </table>
  `);

  return resend.emails.send({
    from: FROM,
    to: p.profesorEmail,
    subject: `Cita cancelada por la familia – ${p.alumnoNombre}`,
    html: body,
  });
}

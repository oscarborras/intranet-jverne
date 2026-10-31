import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authorizeApi } from "@/lib/auth";
import { sendNuevoEventoCalendarioEmail } from "@/lib/email";
import { getNotificationEmails, NOTIFICATION_CLAVES } from "@/lib/notifications";
import { EXTRAESCOLAR_TIPO, CLAUSTRO_TIPO, isTipoEventoNotificado, type TipoEventoNotificado } from "@/lib/types";

// Called by the client right after creating a calendar event of a notified type.
// Emails the perfiles, cargos and lists set for that type in Configuración → Notificaciones.
// Everything is re-checked here so the endpoint cannot be used to send arbitrary emails.

// Recipients config per event type, and who receives it while the config row does not exist
const RECIPIENTS: Record<TipoEventoNotificado, { clave: string; fallbackPerfil?: string }> = {
  [EXTRAESCOLAR_TIPO]: { clave: NOTIFICATION_CLAVES.extraescolares, fallbackPerfil: "Directiva" },
  [CLAUSTRO_TIPO]: { clave: NOTIFICATION_CLAVES.claustro },
};

// Only notify events created just now, by the caller
const MAX_AGE_MS = 5 * 60 * 1000;

export async function POST(req: NextRequest) {
  const auth = await authorizeApi();
  if (!auth.ok) return auth.response;
  const { user } = auth;

  const body = (await req.json().catch(() => null)) as { eventoId?: number } | null;
  const eventoId = Number(body?.eventoId);
  if (!Number.isInteger(eventoId) || eventoId <= 0) {
    return NextResponse.json({ error: "Evento no válido" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: evento } = await supabase
    .from("calendar_eventos")
    .select("id, titulo, descripcion, fecha_inicio, fecha_fin, hora_inicio, hora_fin, tipo, autor_id, created_at, grupos, profesores_ids")
    .eq("id", eventoId)
    .maybeSingle();

  if (!evento) {
    return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
  }

  const tipo = evento.tipo as string;
  const createdAt = new Date(evento.created_at as string).getTime();
  if (!isTipoEventoNotificado(tipo) || evento.autor_id !== user.id || Date.now() - createdAt > MAX_AGE_MS) {
    return NextResponse.json({ sent: false, reason: "no_aplica" });
  }

  const { clave, fallbackPerfil } = RECIPIENTS[tipo];
  const profesoresIds = (evento.profesores_ids as string[] | null) ?? [];
  const [recipientEmails, { data: autor }, { data: profesores }] = await Promise.all([
    getNotificationEmails(supabase, clave, fallbackPerfil),
    supabase.from("users_view").select("full_name").eq("id", user.id).maybeSingle(),
    profesoresIds.length > 0
      ? supabase.from("profesores").select("profesor").in("id", profesoresIds).order("profesor")
      : Promise.resolve({ data: [] as { profesor: string }[] }),
  ]);

  if (recipientEmails.length === 0) {
    return NextResponse.json({ sent: false, reason: "sin_destinatarios" });
  }

  await sendNuevoEventoCalendarioEmail({
    recipientEmails,
    tipo,
    titulo: evento.titulo as string,
    descripcion: (evento.descripcion as string | null) ?? null,
    fechaInicio: evento.fecha_inicio as string,
    fechaFin: evento.fecha_fin as string,
    horaInicio: (evento.hora_inicio as string | null) ?? null,
    horaFin: (evento.hora_fin as string | null) ?? null,
    grupos: (evento.grupos as string[] | null) ?? [],
    profesores: (profesores ?? []).map((p) => p.profesor as string),
    autorNombre:
      (autor?.full_name as string | null) ||
      (user.user_metadata?.full_name as string | undefined) ||
      user.email ||
      "Profesor/a",
  }).catch(console.error);

  return NextResponse.json({ sent: true });
}

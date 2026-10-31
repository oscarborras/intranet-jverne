import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authorizeApi } from "@/lib/auth";
import { sendNuevaExtraescolarEmail } from "@/lib/email";
import { getNotificationEmails, NOTIFICATION_CLAVES } from "@/lib/notifications";
import { EXTRAESCOLAR_TIPO } from "@/lib/types";

// Called by the client right after creating an extracurricular activity in the calendar.
// Emails the perfiles and cargos set in Configuración → Notificaciones (Directiva and DACE by default).
// Everything is re-checked here so the endpoint cannot be used to send arbitrary emails.

// Only notify activities created just now, by the caller
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

  const createdAt = new Date(evento.created_at as string).getTime();
  if (
    evento.tipo !== EXTRAESCOLAR_TIPO ||
    evento.autor_id !== user.id ||
    Date.now() - createdAt > MAX_AGE_MS
  ) {
    return NextResponse.json({ sent: false, reason: "no_aplica" });
  }

  const profesoresIds = (evento.profesores_ids as string[] | null) ?? [];
  const [recipientEmails, { data: autor }, { data: profesores }] = await Promise.all([
    getNotificationEmails(supabase, NOTIFICATION_CLAVES.extraescolares, "Directiva"),
    supabase.from("users_view").select("full_name").eq("id", user.id).maybeSingle(),
    profesoresIds.length > 0
      ? supabase.from("profesores").select("profesor").in("id", profesoresIds).order("profesor")
      : Promise.resolve({ data: [] as { profesor: string }[] }),
  ]);

  if (recipientEmails.length === 0) {
    return NextResponse.json({ sent: false, reason: "sin_destinatarios" });
  }

  await sendNuevaExtraescolarEmail({
    recipientEmails,
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

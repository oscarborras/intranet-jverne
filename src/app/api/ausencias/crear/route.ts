import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendAusenciaRegistradaEmail } from "@/lib/email";
import { getNotificationEmails, NOTIFICATION_CLAVES } from "@/lib/notifications";
import { nowMadridParts } from "@/lib/dates";
import { authorizeApi } from "@/lib/auth";

interface TramoInput {
  tramo_id: number;
  curso_id: number | null;
  aula: string | null;
  tareas: string | null;
  adjunto_path: string | null;
  adjunto_nombre: string | null;
}

interface CrearAusenciasBody {
  fecha: string;
  observaciones: string | null;
  profesor_id?: string | null;
  /** One absence per time slot; all share the same date and teacher */
  tramos: TramoInput[];
}

export async function POST(req: NextRequest) {
  const auth = await authorizeApi();
  if (!auth.ok) return auth.response;
  const { user, roleNames } = auth;
  const supabase = await createClient();

  const body = await req.json() as CrearAusenciasBody;

  if (!body.fecha || !Array.isArray(body.tramos) || body.tramos.length === 0) {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
  }
  if (body.tramos.some((t) => !t.tramo_id || !t.curso_id)) {
    return NextResponse.json({ error: "Cada tramo necesita tramo y curso / grupo" }, { status: 400 });
  }

  // Look up current user's profesores.id
  const { data: myProfesorRow } = await supabase
    .from("profesores")
    .select("id")
    .ilike("email", user.email!)
    .single();
  const myProfesorId = myProfesorRow?.id ?? null;

  // Determine target professor: only Directiva/Admin can set a different profesor_id
  let targetProfesorId = myProfesorId;
  if (body.profesor_id && body.profesor_id !== myProfesorId) {
    if (!roleNames.some((r) => ["Directiva", "Admin"].includes(r))) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    targetProfesorId = body.profesor_id;
  }

  if (!targetProfesorId) {
    return NextResponse.json({ error: "Profesor no encontrado" }, { status: 400 });
  }

  const observaciones = body.observaciones?.trim() || null;

  // Single insert: either every slot is created or none is
  const { data: inserted, error } = await supabase
    .from("ausencias_profesorado")
    .insert(body.tramos.map((t) => ({
      profesor_id: targetProfesorId,
      fecha: body.fecha,
      tramo_id: t.tramo_id,
      curso_id: t.curso_id,
      aula: t.aula?.trim() || null,
      tareas: t.tareas?.trim() || null,
      observaciones,
      adjunto_path: t.adjunto_path ?? null,
      adjunto_nombre: t.adjunto_nombre ?? null,
    })))
    .select("id, tramo_id, curso_id, aula, tareas");

  if (error || !inserted || inserted.length === 0) {
    return NextResponse.json({ error: error?.message ?? "Error al crear ausencia" }, { status: 500 });
  }

  const { year } = nowMadridParts();
  const creadas = inserted.map((a) => ({
    ...a,
    codigo: `AUS-${year}-${String(a.id).padStart(4, "0")}`,
  }));
  await Promise.all(
    creadas.map((a) => supabase.from("ausencias_profesorado").update({ codigo: a.codigo }).eq("id", a.id))
  );

  // Resolve names for the email
  const tramoIds = [...new Set(creadas.map((a) => a.tramo_id as number))];
  const cursoIds = [...new Set(creadas.map((a) => a.curso_id as number | null).filter((id): id is number => id !== null))];
  const [{ data: profesor }, { data: tramos }, { data: cursos }] = await Promise.all([
    supabase.from("profesores").select("profesor").eq("id", targetProfesorId).single(),
    supabase.from("tramos_horarios").select("id, nombre, orden").in("id", tramoIds),
    cursoIds.length > 0
      ? supabase.from("cursos").select("id, nombre").in("id", cursoIds)
      : Promise.resolve({ data: [] as { id: number; nombre: string }[] }),
  ]);
  const tramoMap = new Map((tramos ?? []).map((t) => [t.id as number, t as { nombre: string; orden: number }]));
  const cursoMap = new Map((cursos ?? []).map((c) => [c.id as number, c.nombre as string]));

  // Recipients: users with any perfil configured in Configuración → Notificaciones
  const recipientEmails = await getNotificationEmails(supabase, NOTIFICATION_CLAVES.ausencias, "Directiva");

  await sendAusenciaRegistradaEmail({
    recipientEmails,
    profesorNombre: (profesor?.profesor as string | undefined) ?? "Profesor/a",
    fecha: body.fecha,
    observaciones,
    tramos: [...creadas]
      .sort((a, b) => (tramoMap.get(a.tramo_id)?.orden ?? 0) - (tramoMap.get(b.tramo_id)?.orden ?? 0))
      .map((a) => ({
        codigo: a.codigo,
        tramoNombre: tramoMap.get(a.tramo_id)?.nombre ?? "",
        cursoNombre: a.curso_id ? cursoMap.get(a.curso_id) ?? null : null,
        aula: a.aula ?? null,
        tareas: a.tareas ?? null,
      })),
  }).catch(() => { /* non-blocking */ });

  return NextResponse.json({
    success: true,
    profesor_id: targetProfesorId,
    creadas: creadas.map((a) => ({ id: a.id as number, codigo: a.codigo, tramo_id: a.tramo_id as number })),
  });
}

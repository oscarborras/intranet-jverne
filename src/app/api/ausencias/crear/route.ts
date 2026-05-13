import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendAusenciaRegistradaEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    fecha: string;
    tramo_id: number;
    curso_id: number | null;
    aula: string | null;
    tareas: string | null;
    observaciones: string | null;
    adjunto_path: string | null;
    adjunto_nombre: string | null;
    profesor_id?: string | null;
  };

  if (!body.fecha || !body.tramo_id || !body.curso_id) {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
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
    const { data: roleCheck } = await supabase
      .from("user_roles_intranet")
      .select("perfiles_intranet!inner(nombre)")
      .eq("user_id", user.id)
      .in("perfiles_intranet.nombre", ["Directiva", "Admin"]);
    if (!roleCheck || roleCheck.length === 0) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    targetProfesorId = body.profesor_id;
  }

  if (!targetProfesorId) {
    return NextResponse.json({ error: "Profesor no encontrado" }, { status: 400 });
  }

  const { data: ausencia, error } = await supabase
    .from("ausencias_profesorado")
    .insert({
      profesor_id: targetProfesorId,
      fecha: body.fecha,
      tramo_id: body.tramo_id,
      curso_id: body.curso_id,
      aula: body.aula?.trim() || null,
      tareas: body.tareas?.trim() || null,
      observaciones: body.observaciones?.trim() || null,
      adjunto_path: body.adjunto_path ?? null,
      adjunto_nombre: body.adjunto_nombre ?? null,
    })
    .select()
    .single();

  if (error || !ausencia) {
    return NextResponse.json({ error: error?.message ?? "Error al crear ausencia" }, { status: 500 });
  }

  const year = new Date().getFullYear();
  const codigo = `AUS-${year}-${String(ausencia.id).padStart(4, "0")}`;
  await supabase.from("ausencias_profesorado").update({ codigo }).eq("id", ausencia.id);

  // Resolve names for email
  const [{ data: profile }, { data: tramo }, { data: curso }] = await Promise.all([
    supabase.from("users_view").select("full_name").eq("id", targetProfesorId).single(),
    supabase.from("tramos_horarios").select("nombre").eq("id", body.tramo_id).single(),
    body.curso_id
      ? supabase.from("cursos").select("nombre").eq("id", body.curso_id).single()
      : Promise.resolve({ data: null }),
  ]);

  // Get Directiva users' emails
  const { data: directivaRoles } = await supabase
    .from("user_roles_intranet")
    .select("user_id, perfiles_intranet!inner(nombre)")
    .eq("perfiles_intranet.nombre", "Directiva");

  const directivaIds = (directivaRoles ?? []).map((r) => r.user_id as string);
  let directivaEmails: string[] = [];

  if (directivaIds.length > 0) {
    const { data: directivaProfiles } = await supabase
      .from("users_view")
      .select("email")
      .in("id", directivaIds);
    directivaEmails = (directivaProfiles ?? []).map((p) => p.email as string).filter(Boolean);
  }

  await sendAusenciaRegistradaEmail({
    directivaEmails,
    profesorNombre: profile?.full_name ?? "Profesor/a",
    codigo,
    fecha: body.fecha,
    tramoNombre: tramo?.nombre ?? "",
    cursoNombre: (curso as { nombre: string } | null)?.nombre ?? null,
    aula: body.aula ?? null,
    tareas: body.tareas ?? null,
    observaciones: body.observaciones ?? null,
  }).catch(() => { /* non-blocking */ });

  return NextResponse.json({ success: true, id: ausencia.id, codigo, profesor_id: targetProfesorId });
}

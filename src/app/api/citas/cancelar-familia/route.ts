import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendCanceladaFamiliaEmail } from "@/lib/email";

const MOTIVO_MAX = 500;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const token = body?.token as string | undefined;
  // Optional reason typed by the family (public form: trim and cap its length)
  const motivo = typeof body?.motivo === "string" ? body.motivo.trim().slice(0, MOTIVO_MAX) || null : null;

  if (!token) {
    return NextResponse.json({ error: "Token no proporcionado" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: cita, error: fetchError } = await supabase
    .from("citas_familias")
    .select("id, estado, profesor_id, alumno_nombre, familiar_nombre, fecha, hora_inicio")
    .eq("token_familia", token)
    .single();

  if (fetchError || !cita) {
    return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
  }

  if (cita.estado === "cancelada" || cita.estado === "completada") {
    return NextResponse.json({ error: "La cita ya no puede cancelarse" }, { status: 409 });
  }

  const { error: updateError } = await supabase
    .from("citas_familias")
    .update({ estado: "cancelada", cancelada_por: "familia", motivo_cancelacion: motivo })
    .eq("id", cita.id);

  if (updateError) {
    return NextResponse.json({ error: "Error al cancelar la cita" }, { status: 500 });
  }

  // profesor_id references profesores.id (not the auth user id), so the email comes from profesores
  const { data: profesorData } = await supabase
    .from("profesores")
    .select("email")
    .eq("id", cita.profesor_id)
    .maybeSingle();

  if (profesorData?.email && process.env.RESEND_API_KEY) {
    await sendCanceladaFamiliaEmail({
      profesorEmail: profesorData.email,
      alumnoNombre: cita.alumno_nombre,
      familiarNombre: cita.familiar_nombre,
      fecha: cita.fecha,
      horaInicio: cita.hora_inicio,
      motivo,
    }).catch(console.error);
  }

  return NextResponse.json({ success: true });
}

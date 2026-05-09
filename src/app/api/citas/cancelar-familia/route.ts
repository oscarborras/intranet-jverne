import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendCanceladaFamiliaEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const token = body?.token as string | undefined;

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
    .update({ estado: "cancelada", cancelada_por: "familia" })
    .eq("id", cita.id);

  if (updateError) {
    return NextResponse.json({ error: "Error al cancelar la cita" }, { status: 500 });
  }

  const { data: profesorData } = await supabase
    .from("users_view")
    .select("email, full_name")
    .eq("id", cita.profesor_id)
    .single();

  if (profesorData?.email && process.env.RESEND_API_KEY) {
    await sendCanceladaFamiliaEmail({
      profesorEmail: profesorData.email,
      alumnoNombre: cita.alumno_nombre,
      familiarNombre: cita.familiar_nombre,
      fecha: cita.fecha,
      horaInicio: cita.hora_inicio,
    }).catch(console.error);
  }

  return NextResponse.json({ success: true });
}

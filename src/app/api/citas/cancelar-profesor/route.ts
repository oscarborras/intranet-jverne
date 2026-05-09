import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendCanceladaProfesorEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const { citaId, motivo_cancelacion } = body as { citaId: number; motivo_cancelacion?: string };

  if (!citaId) {
    return NextResponse.json({ error: "ID de cita requerido" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Resolve profesores.id from the authenticated user's email
  const { data: profesorRow } = await admin
    .from("profesores")
    .select("id, profesor")
    .eq("email", user.email!)
    .single();

  if (!profesorRow) {
    return NextResponse.json({ error: "Profesor no encontrado" }, { status: 403 });
  }

  const { data: updated, error: updateError } = await admin
    .from("citas_familias")
    .update({
      estado: "cancelada",
      cancelada_por: "profesor",
      motivo_cancelacion: motivo_cancelacion?.trim() || null,
    })
    .eq("id", citaId)
    .eq("profesor_id", profesorRow.id)
    .select()
    .single();

  if (updateError || !updated) {
    return NextResponse.json({ error: "Error al cancelar la cita" }, { status: 500 });
  }

  if (updated.familiar_email && process.env.RESEND_API_KEY) {
    await sendCanceladaProfesorEmail({
      familiarEmail: updated.familiar_email,
      profesorNombre: profesorRow.profesor,
      alumnoNombre: updated.alumno_nombre,
      fecha: updated.fecha,
      horaInicio: updated.hora_inicio,
      motivo: motivo_cancelacion?.trim() || null,
    }).catch(console.error);
  }

  return NextResponse.json({ success: true });
}

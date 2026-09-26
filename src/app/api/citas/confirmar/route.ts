import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendCitaConfirmadaEmail } from "@/lib/email";
import { authorizeApi } from "@/lib/auth";
import { nombreConCargo } from "@/lib/cargos";

export async function POST(req: NextRequest) {
  const auth = await authorizeApi();
  if (!auth.ok) return auth.response;
  const { user } = auth;
  const supabase = await createClient();

  const body = await req.json().catch(() => null);
  const { citaId, fecha, hora_inicio, lugar: lugarRaw } = body as {
    citaId: number;
    fecha: string;
    hora_inicio: string;
    lugar: string;
  };
  // Free text typed by the teacher
  const lugar = typeof lugarRaw === "string" ? lugarRaw.trim() : "";

  if (!citaId || !fecha || !hora_inicio || !lugar) {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
  }
  if (lugar.length > 100) {
    return NextResponse.json({ error: "El lugar no puede superar los 100 caracteres" }, { status: 400 });
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
    .update({ estado: "confirmada", fecha, hora_inicio, lugar })
    .eq("id", citaId)
    .eq("profesor_id", profesorRow.id)
    .select()
    .single();

  if (updateError || !updated) {
    return NextResponse.json({ error: "Error al confirmar la cita" }, { status: 500 });
  }

  if (updated.familiar_email && process.env.RESEND_API_KEY) {
    await sendCitaConfirmadaEmail({
      familiarEmail: updated.familiar_email,
      profesorNombre: nombreConCargo(profesorRow.profesor, updated.cargo),
      alumnoNombre: updated.alumno_nombre,
      alumnoCurso: updated.alumno_curso,
      familiar_nombre: updated.familiar_nombre,
      fecha,
      horaInicio: hora_inicio,
      lugar,
      tokenFamilia: updated.token_familia,
    }).catch(console.error);
  }

  return NextResponse.json({ success: true, cita: updated });
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendCanceladaProfesorEmail } from "@/lib/email";
import { authorizeApi } from "@/lib/auth";
import { nombreConCargo } from "@/lib/cargos";

export async function POST(req: NextRequest) {
  const auth = await authorizeApi();
  if (!auth.ok) return auth.response;
  const { user } = auth;
  const supabase = await createClient();

  const body = await req.json().catch(() => null);
  const { citaId, motivo_cancelacion } = body as { citaId: number; motivo_cancelacion?: string };

  if (!citaId) {
    return NextResponse.json({ error: "ID de cita requerido" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Admin/Directiva manage any teacher's appointments (same rule as the RLS policy);
  // everyone else only their own, resolved from the authenticated user's email
  const isAdmin = auth.roleNames.some((r) => ["Admin", "Directiva"].includes(r));
  const { data: profesorRow } = await admin
    .from("profesores")
    .select("id, profesor")
    .eq("email", user.email ?? "")
    .maybeSingle();

  if (!profesorRow && !isAdmin) {
    return NextResponse.json({ error: "Profesor no encontrado" }, { status: 403 });
  }

  let query = admin
    .from("citas_familias")
    .update({
      estado: "cancelada",
      cancelada_por: "profesor",
      motivo_cancelacion: motivo_cancelacion?.trim() || null,
    })
    .eq("id", citaId);
  if (!isAdmin && profesorRow) query = query.eq("profesor_id", profesorRow.id);
  const { data: updated, error: updateError } = await query.select().single();

  if (updateError || !updated) {
    return NextResponse.json({ error: "Error al cancelar la cita" }, { status: 500 });
  }

  // The family is told the name of the teacher the appointment belongs to, not who clicked
  const { data: owner } = await admin.from("profesores").select("profesor").eq("id", updated.profesor_id).maybeSingle();
  const ownerNombre = owner?.profesor ?? profesorRow?.profesor ?? "";

  if (updated.familiar_email && process.env.RESEND_API_KEY) {
    await sendCanceladaProfesorEmail({
      familiarEmail: updated.familiar_email,
      profesorNombre: nombreConCargo(ownerNombre, updated.cargo),
      alumnoNombre: updated.alumno_nombre,
      fecha: updated.fecha,
      horaInicio: updated.hora_inicio,
      motivo: motivo_cancelacion?.trim() || null,
    }).catch(console.error);
  }

  return NextResponse.json({ success: true });
}

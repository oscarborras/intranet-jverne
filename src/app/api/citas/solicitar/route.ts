import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNuevaSolicitudEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Cuerpo de solicitud inválido" }, { status: 400 });
  }

  const {
    profesor_id,
    alumno_nombre,
    alumno_curso,
    familiar_nombre,
    familiar_parentesco,
    familiar_email,
    familiar_telefono,
    motivo,
  } = body as Record<string, string>;

  if (!profesor_id || !alumno_nombre?.trim() || !alumno_curso?.trim() || !familiar_nombre?.trim() || !familiar_parentesco?.trim() || !motivo?.trim()) {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: inserted, error: insertError } = await admin
    .from("citas_familias")
    .insert({
      codigo: "CF-TEMP",
      profesor_id,
      alumno_nombre: alumno_nombre.trim(),
      alumno_curso: alumno_curso.trim(),
      familiar_nombre: familiar_nombre.trim(),
      familiar_parentesco: familiar_parentesco.trim(),
      familiar_email: familiar_email?.trim() || null,
      familiar_telefono: familiar_telefono?.trim() || null,
      motivo: motivo.trim(),
      estado: "pendiente",
    })
    .select("id, token_familia")
    .single();

  if (insertError || !inserted) {
    console.error("Error inserting cita:", insertError);
    return NextResponse.json({ error: "Error al crear la solicitud" }, { status: 500 });
  }

  const year = new Date().getFullYear();
  const codigo = `CF-${year}-${String(inserted.id).padStart(4, "0")}`;

  await admin.from("citas_familias").update({ codigo }).eq("id", inserted.id);

  // Get professor's email and name directly from profesores table
  const { data: profesorData } = await admin
    .from("profesores")
    .select("email, profesor")
    .eq("id", profesor_id)
    .single();

  if (profesorData?.email && process.env.RESEND_API_KEY) {
    await sendNuevaSolicitudEmail({
      profesorEmail: profesorData.email,
      profesorNombre: profesorData.profesor,
      codigo,
      alumnoNombre: alumno_nombre.trim(),
      alumnoCurso: alumno_curso.trim(),
      familiarNombre: familiar_nombre.trim(),
      familiarParentesco: familiar_parentesco.trim(),
      familiarEmail: familiar_email?.trim() || null,
      familiarTelefono: familiar_telefono?.trim() || null,
      motivo: motivo.trim(),
    }).catch(console.error);
  }

  return NextResponse.json({ success: true, codigo });
}

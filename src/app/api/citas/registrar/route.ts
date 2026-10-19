import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizeApi } from "@/lib/auth";
import { canAccessModule } from "@/lib/modulos";
import { sendCitaConfirmadaEmail } from "@/lib/email";
import { nowMadridParts, todayMadrid } from "@/lib/dates";

// "Registrar mi cita": a teacher records an appointment already agreed with a family
// (tipo "familia") or with a company, organisation or other person (tipo "otro").
// It is created as confirmed and the family receives the date, time and place by email.
// Admin/Directiva may register it on behalf of another teacher (profesor_id).
export async function POST(req: NextRequest) {
  const auth = await authorizeApi();
  if (!auth.ok) return auth.response;
  const { user, roleNames } = auth;
  if (!(await canAccessModule(await createClient(), user.id, "citas-familias"))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, string> | null;
  if (!body) {
    return NextResponse.json({ error: "Cuerpo de solicitud inválido" }, { status: 400 });
  }

  const tipo = body.tipo ?? "familia";
  if (tipo !== "familia" && tipo !== "otro") {
    return NextResponse.json({ error: "Tipo de cita no válido" }, { status: 400 });
  }
  const isFamilia = tipo === "familia";

  // "otro" appointments only keep the contact person, organisation and phone
  const alumno_nombre = isFamilia ? (body.alumno_nombre?.trim() ?? "") : null;
  const alumno_curso = isFamilia ? (body.alumno_curso?.trim() ?? "") : null;
  const familiar_nombre = body.familiar_nombre?.trim() ?? "";
  const familiar_parentesco = isFamilia ? (body.familiar_parentesco?.trim() ?? "") : null;
  const familiar_email = isFamilia ? (body.familiar_email?.trim() || null) : null;
  const familiar_telefono = body.familiar_telefono?.trim() || null;
  const entidad = isFamilia ? null : (body.entidad?.trim() || null);
  const motivo = body.motivo?.trim() || null;
  const fecha = body.fecha ?? "";
  const hora_inicio = body.hora_inicio ?? "";
  const lugar = body.lugar?.trim() ?? "";

  if ((isFamilia && (!alumno_nombre || !alumno_curso || !familiar_parentesco)) || !familiar_nombre || !fecha || !hora_inicio || !lugar) {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
  }
  if (lugar.length > 100) {
    return NextResponse.json({ error: "El lugar no puede superar los 100 caracteres" }, { status: 400 });
  }
  if (entidad && entidad.length > 150) {
    return NextResponse.json({ error: "La entidad no puede superar los 150 caracteres" }, { status: 400 });
  }

  const admin = createAdminClient();
  const isAdmin = roleNames.some((r) => ["Admin", "Directiva"].includes(r));

  // Who the appointment belongs to: the user themself, or (Admin/Directiva) the chosen active teacher
  let profesor: { id: string; profesor: string } | null;
  if (isAdmin && body.profesor_id) {
    const today = todayMadrid();
    const { data } = await admin
      .from("profesores")
      .select("id, profesor")
      .eq("id", body.profesor_id)
      .or(`fecha_cese.is.null,fecha_cese.gt.${today}`)
      .maybeSingle();
    profesor = data;
  } else {
    const { data } = await admin.from("profesores").select("id, profesor").eq("email", user.email ?? "").maybeSingle();
    profesor = data;
  }
  if (!profesor) {
    return NextResponse.json({ error: "Profesor/a no encontrado" }, { status: 403 });
  }

  const { data: inserted, error: insertError } = await admin
    .from("citas_familias")
    .insert({
      codigo: "CF-TEMP",
      profesor_id: profesor.id,
      tipo,
      entidad,
      alumno_nombre,
      alumno_curso,
      familiar_nombre,
      familiar_parentesco,
      familiar_email,
      familiar_telefono,
      motivo,
      fecha,
      hora_inicio,
      lugar,
      estado: "confirmada",
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    console.error("Error inserting cita:", insertError);
    return NextResponse.json({ error: "Error al registrar la cita. Inténtelo de nuevo." }, { status: 500 });
  }

  const { year } = nowMadridParts();
  const codigo = `CF-${year}-${String(inserted.id).padStart(4, "0")}`;
  const { data: cita } = await admin
    .from("citas_familias")
    .update({ codigo })
    .eq("id", inserted.id)
    .select("*")
    .single();

  if (cita && familiar_email && alumno_nombre && alumno_curso && process.env.RESEND_API_KEY) {
    await sendCitaConfirmadaEmail({
      familiarEmail: familiar_email,
      profesorNombre: profesor.profesor,
      alumnoNombre: alumno_nombre,
      alumnoCurso: alumno_curso,
      familiar_nombre,
      fecha,
      horaInicio: hora_inicio,
      lugar,
      tokenFamilia: cita.token_familia,
    }).catch(console.error);
  }

  return NextResponse.json({ success: true, cita, profesorNombre: profesor.profesor });
}

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { authorizeApi } from "@/lib/auth";
import { canAccessModule } from "@/lib/modulos";
import { sendNuevaSolicitudEmail } from "@/lib/email";
import { nowMadridParts, todayMadrid } from "@/lib/dates";
import { getTitularCargo } from "@/lib/cargos";
import { CARGOS_DIRECTIVOS, isCargoDirectivo, type CargoDirectivoClave } from "@/lib/types";

// Appointment requests are registered by staff on behalf of the family
// (only users whose profiles have the "citas-familias" module enabled).
export async function POST(req: NextRequest) {
  const auth = await authorizeApi();
  if (!auth.ok) return auth.response;
  if (!(await canAccessModule(await createClient(), auth.user.id, "citas-familias"))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Cuerpo de solicitud inválido" }, { status: 400 });
  }

  const {
    profesor_id,
    cargo: cargoRaw,
    alumno_nombre,
    alumno_curso,
    familiar_nombre,
    familiar_parentesco,
    familiar_email,
    familiar_telefono,
    motivo,
  } = body as Record<string, string>;

  // The request goes to either a specific teacher or a leadership role, never both
  const cargo: CargoDirectivoClave | null = isCargoDirectivo(cargoRaw) ? cargoRaw : null;
  if (cargoRaw && !cargo) {
    return NextResponse.json({ error: "El cargo seleccionado no es válido" }, { status: 400 });
  }

  if ((!profesor_id && !cargo) || !alumno_nombre?.trim() || !alumno_curso?.trim() || !familiar_nombre?.trim() || !familiar_parentesco?.trim() || !motivo?.trim()) {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Resolve who receives the request
  let destinatario: { id: string; profesor: string; email: string | null } | null;
  if (cargo) {
    // The appointment belongs to whoever holds the role now; it stays with them if the role changes hands
    destinatario = await getTitularCargo(admin, cargo);
    if (!destinatario) {
      return NextResponse.json(
        { error: `En este momento no se pueden solicitar citas con ${CARGOS_DIRECTIVOS[cargo]}. Inténtelo más tarde.` },
        { status: 400 }
      );
    }
  } else {
    // Accept only active teachers
    const today = todayMadrid();
    const { data } = await admin
      .from("profesores")
      .select("id, profesor, email")
      .eq("id", profesor_id)
      .or(`fecha_cese.is.null,fecha_cese.gt.${today}`)
      .maybeSingle();
    destinatario = data;
    if (!destinatario) {
      return NextResponse.json({ error: "El profesor/a seleccionado no es válido" }, { status: 400 });
    }
  }

  const { data: inserted, error: insertError } = await admin
    .from("citas_familias")
    .insert({
      codigo: "CF-TEMP",
      profesor_id: destinatario.id,
      cargo,
      alumno_nombre: alumno_nombre.trim(),
      alumno_curso: alumno_curso.trim(),
      familiar_nombre: familiar_nombre.trim(),
      familiar_parentesco: familiar_parentesco.trim(),
      familiar_email: familiar_email?.trim() || null,
      familiar_telefono: familiar_telefono?.trim() || null,
      motivo: motivo.trim(),
      estado: "pendiente",
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    console.error("Error inserting cita:", insertError);
    return NextResponse.json({ error: "Error al crear la solicitud" }, { status: 500 });
  }

  const { year } = nowMadridParts();
  const codigo = `CF-${year}-${String(inserted.id).padStart(4, "0")}`;

  const { data: cita } = await admin
    .from("citas_familias")
    .update({ codigo })
    .eq("id", inserted.id)
    .select("*")
    .single();

  if (destinatario.email && process.env.RESEND_API_KEY) {
    await sendNuevaSolicitudEmail({
      profesorEmail: destinatario.email,
      profesorNombre: destinatario.profesor,
      cargoNombre: cargo ? CARGOS_DIRECTIVOS[cargo] : null,
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

  return NextResponse.json({ success: true, codigo, cita, profesorNombre: destinatario.profesor });
}

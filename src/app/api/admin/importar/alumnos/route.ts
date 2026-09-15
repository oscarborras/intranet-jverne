import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const CAMPOS_PERMITIDOS = [
  "alumno", "estado_matricula", "nie", "unidad",
  "primer_apellido", "segundo_apellido", "nombre", "sexo", "email_personal",
  "tutor1_nombre", "tutor1_primer_apellido", "tutor1_segundo_apellido", "tutor1_email", "tutor1_telefono", "tutor1_sexo",
  "tutor2_nombre", "tutor2_primer_apellido", "tutor2_segundo_apellido", "tutor2_email", "tutor2_telefono", "tutor2_sexo",
  "edad_matricula", "fecha_matricula",
] as const;
type CampoPermitido = (typeof CAMPOS_PERMITIDOS)[number];

interface Actualizacion { id: string; patch: Record<string, unknown>; }
interface Nuevo { alumno: string; patch: Record<string, unknown>; }

function limpiarPatch(patch: Record<string, unknown>): Partial<Record<CampoPermitido, string | null>> {
  const out: Partial<Record<CampoPermitido, string | null>> = {};
  for (const campo of CAMPOS_PERMITIDOS) {
    if (!(campo in patch)) continue;
    const valor = patch[campo];
    if (valor === null) out[campo] = null;
    else if (typeof valor === "string") out[campo] = valor.trim() || null;
  }
  return out;
}

function localDateISO(): string {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}

// PostgREST recibe el filtro .in() en la URL: con muchos ids de golpe supera el
// límite de tamaño de petición del proxy (414 Request-URI Too Large). Se trocea.
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: rolesData } = await supabase
    .from("user_roles_intranet")
    .select("perfiles_intranet!inner(nombre)")
    .eq("user_id", user.id);

  const roleNames = (rolesData ?? []).map(
    (r) => (r.perfiles_intranet as unknown as { nombre: string }).nombre
  );
  if (!roleNames.includes("Admin")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json().catch(() => null) as {
    actualizar?: Actualizacion[];
    nuevos?: Nuevo[];
    bajas?: string[];
  } | null;

  if (!body) return NextResponse.json({ error: "Petición inválida" }, { status: 400 });

  const actualizar = body.actualizar ?? [];
  const nuevos = body.nuevos ?? [];
  const bajas = body.bajas ?? [];

  const admin = createAdminClient();
  const errores: string[] = [];
  let actualizados = 0;
  let insertados = 0;
  let bajasAplicadas = 0;

  // ── Actualizaciones ──
  for (const fila of actualizar) {
    if (typeof fila?.id !== "string") continue;
    const patch = limpiarPatch(fila.patch ?? {});
    if (Object.keys(patch).length === 0) continue;

    const { error } = await admin.from("alumnos").update(patch).eq("id", fila.id);
    if (error) errores.push(`Actualizar ${fila.id}: ${error.message}`);
    else actualizados++;
  }

  // ── Altas ──
  for (const fila of nuevos) {
    if (!fila?.alumno?.trim()) {
      errores.push("Alta omitida: falta el nombre del alumno");
      continue;
    }
    const patch = limpiarPatch(fila.patch ?? {});
    // unidad y sexo son NOT NULL en la tabla; el CSV puede traerlos en blanco.
    const { error } = await admin.from("alumnos").insert({
      alumno: fila.alumno.trim(),
      unidad: patch.unidad ?? "",
      sexo: patch.sexo ?? "",
      nie: patch.nie ?? null,
      estado_matricula: patch.estado_matricula ?? null,
      primer_apellido: patch.primer_apellido ?? null,
      segundo_apellido: patch.segundo_apellido ?? null,
      nombre: patch.nombre ?? null,
      email_personal: patch.email_personal ?? null,
      tutor1_nombre: patch.tutor1_nombre ?? null,
      tutor1_primer_apellido: patch.tutor1_primer_apellido ?? null,
      tutor1_segundo_apellido: patch.tutor1_segundo_apellido ?? null,
      tutor1_email: patch.tutor1_email ?? null,
      tutor1_telefono: patch.tutor1_telefono ?? null,
      tutor1_sexo: patch.tutor1_sexo ?? null,
      tutor2_nombre: patch.tutor2_nombre ?? null,
      tutor2_primer_apellido: patch.tutor2_primer_apellido ?? null,
      tutor2_segundo_apellido: patch.tutor2_segundo_apellido ?? null,
      tutor2_email: patch.tutor2_email ?? null,
      tutor2_telefono: patch.tutor2_telefono ?? null,
      tutor2_sexo: patch.tutor2_sexo ?? null,
      edad_matricula: patch.edad_matricula ?? null,
      fecha_matricula: patch.fecha_matricula ?? null,
    });
    if (error) errores.push(`Alta ${fila.alumno}: ${error.message}`);
    else insertados++;
  }

  // ── Bajas ──
  const idsBaja = bajas.filter((id) => typeof id === "string");
  for (const grupo of chunk(idsBaja, 100)) {
    const { error, count } = await admin
      .from("alumnos")
      .update({ estado_matricula: "Baja" }, { count: "exact" })
      .in("id", grupo);
    if (error) errores.push(`Bajas: ${error.message}`);
    else bajasAplicadas += count ?? grupo.length;
  }

  await admin
    .from("config_intranet")
    .update({ valor: localDateISO(), updated_at: new Date().toISOString() })
    .eq("clave", "ultima_importacion_alumnos");

  return NextResponse.json({
    success: true,
    actualizados,
    insertados,
    bajas: bajasAplicadas,
    errores,
  });
}

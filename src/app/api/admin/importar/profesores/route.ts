import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const CAMPOS_PERMITIDOS = ["profesor", "puesto", "dni", "email", "fecha_alta", "fecha_cese"] as const;
type CampoPermitido = (typeof CAMPOS_PERMITIDOS)[number];

interface Actualizacion { id: string; patch: Record<string, unknown>; }
interface Nuevo { profesor: string; puesto: string; dni: string | null; email: string | null; fecha_alta: string | null; fecha_cese: string | null; }

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

    const { error } = await admin.from("profesores").update(patch).eq("id", fila.id);
    if (error) errores.push(`Actualizar ${fila.id}: ${error.message}`);
    else actualizados++;
  }

  // ── Altas ──
  for (const fila of nuevos) {
    if (!fila?.profesor?.trim() || !fila?.puesto?.trim()) {
      errores.push(`Alta omitida: falta nombre o puesto (${fila?.profesor ?? "sin nombre"})`);
      continue;
    }
    const { error } = await admin.from("profesores").insert({
      profesor: fila.profesor.trim(),
      puesto: fila.puesto.trim(),
      dni: fila.dni?.trim() || null,
      email: fila.email?.trim().toLowerCase() || null,
      fecha_alta: fila.fecha_alta || null,
      fecha_cese: fila.fecha_cese || null,
    });
    if (error) errores.push(`Alta ${fila.profesor}: ${error.message}`);
    else insertados++;
  }

  // ── Bajas ──
  const idsBaja = bajas.filter((id) => typeof id === "string");
  if (idsBaja.length > 0) {
    const { error, count } = await admin
      .from("profesores")
      .update({ fecha_cese: localDateISO() }, { count: "exact" })
      .in("id", idsBaja);
    if (error) errores.push(`Bajas: ${error.message}`);
    else bajasAplicadas = count ?? idsBaja.length;
  }

  await admin
    .from("config_intranet")
    .update({ valor: localDateISO(), updated_at: new Date().toISOString() })
    .eq("clave", "ultima_importacion_profesores");

  return NextResponse.json({
    success: true,
    actualizados,
    insertados,
    bajas: bajasAplicadas,
    errores,
  });
}

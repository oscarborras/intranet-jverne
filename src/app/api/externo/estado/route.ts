import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizeExternoApi } from "@/lib/externo";
import { ESTADO_PORTAL_LABELS, TRANSICIONES_PORTAL } from "@/lib/externoMantenimiento";
import type { PeticionMantenimientoEstado } from "@/lib/types";

// External portal: move a validated maintenance request to "en_progreso" or "finalizada"
export async function POST(req: NextRequest) {
  const auth = await authorizeExternoApi();
  if (!auth.ok) return auth.response;
  const { session } = auth;

  const body = (await req.json().catch(() => null)) as { peticionId?: number; estado?: string } | null;
  const peticionId = Number(body?.peticionId);
  const nuevo = body?.estado as PeticionMantenimientoEstado | undefined;
  if (!Number.isInteger(peticionId) || peticionId <= 0 || !nuevo) {
    return NextResponse.json({ error: "Datos no válidos" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: peticion } = await admin
    .from("peticiones_mantenimiento")
    .select("id, estado")
    .eq("id", peticionId)
    .maybeSingle();
  if (!peticion) {
    return NextResponse.json({ error: "Petición no encontrada" }, { status: 404 });
  }

  const actual = peticion.estado as PeticionMantenimientoEstado;
  if (!TRANSICIONES_PORTAL[actual]?.includes(nuevo)) {
    return NextResponse.json({ error: "Este cambio de estado no está permitido" }, { status: 409 });
  }

  // Conditional on the current state, so two simultaneous clicks cannot both apply
  const { data: updated, error } = await admin
    .from("peticiones_mantenimiento")
    .update({ estado: nuevo })
    .eq("id", peticionId)
    .eq("estado", actual)
    .select("id")
    .maybeSingle();
  if (error || !updated) {
    return NextResponse.json({ error: "La petición ha cambiado. Recargue la página." }, { status: 409 });
  }

  // Traceability: the maintenance table has no activity log, so the change is recorded as a note
  await admin.from("peticiones_mantenimiento_notas").insert({
    peticion_id: peticionId,
    autor_email: session.email,
    autor_nombre: session.nombre,
    contenido: `Estado cambiado de «${ESTADO_PORTAL_LABELS[actual]}» a «${ESTADO_PORTAL_LABELS[nuevo]}»`,
  });

  return NextResponse.json({ ok: true });
}

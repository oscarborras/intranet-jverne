import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizeExternoApi } from "@/lib/externo";
import { ESTADOS_PORTAL_ACTIVOS, MAX_NOTA_LENGTH } from "@/lib/externoMantenimiento";
import type { PeticionMantenimientoEstado } from "@/lib/types";

// External portal: add a note to a maintenance request the technician can see
export async function POST(req: NextRequest) {
  const auth = await authorizeExternoApi();
  if (!auth.ok) return auth.response;
  const { session } = auth;

  const body = (await req.json().catch(() => null)) as { peticionId?: number; contenido?: string } | null;
  const peticionId = Number(body?.peticionId);
  const contenido = typeof body?.contenido === "string" ? body.contenido.trim() : "";
  if (!Number.isInteger(peticionId) || peticionId <= 0 || !contenido) {
    return NextResponse.json({ error: "Escriba el texto de la nota" }, { status: 400 });
  }
  if (contenido.length > MAX_NOTA_LENGTH) {
    return NextResponse.json({ error: `La nota no puede superar los ${MAX_NOTA_LENGTH} caracteres` }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: peticion } = await admin
    .from("peticiones_mantenimiento")
    .select("id, estado")
    .eq("id", peticionId)
    .maybeSingle();

  // Only requests shown in the portal (validated, or finished) accept notes
  const estado = peticion?.estado as PeticionMantenimientoEstado | undefined;
  if (!estado || !(ESTADOS_PORTAL_ACTIVOS.includes(estado) || estado === "finalizada")) {
    return NextResponse.json({ error: "Petición no encontrada" }, { status: 404 });
  }

  const { error } = await admin.from("peticiones_mantenimiento_notas").insert({
    peticion_id: peticionId,
    autor_email: session.email,
    autor_nombre: session.nombre,
    contenido,
  });
  if (error) {
    return NextResponse.json({ error: "No se pudo guardar la nota" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

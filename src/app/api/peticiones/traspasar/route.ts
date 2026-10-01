import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNuevaPeticionMantenimientoEmail, sendNuevaPeticionTICEmail } from "@/lib/email";
import { getNotificationEmails, NOTIFICATION_CLAVES } from "@/lib/notifications";
import { authorizeApi } from "@/lib/auth";

// Moves a request between the TIC and maintenance boards: a copy is created on the target board
// (same author, title, description, priority and photo) and the original is marked as "eliminada",
// so it leaves its board, statistics and dashboard. Both rows mention each other's code.

type Origen = "tic" | "mantenimiento";

// Who manages each board, and therefore may send a request away from it
const GESTORES: Record<Origen, string[]> = {
  tic: ["Admin", "TDE", "Soporte_TIC"],
  mantenimiento: ["Admin", "Directiva"],
};

const ESTADOS_CERRADOS = ["finalizada", "rechazada", "eliminada"];

interface PeticionOrigen {
  id: number;
  codigo: string;
  titulo: string;
  descripcion: string;
  prioridad: string;
  estado: string;
  autor_id: string;
  foto_path: string | null;
  foto_nombre: string | null;
  /** Only maintenance requests have a location */
  ubicacion?: string;
}

function withTraza(descripcion: string, traza: string): string {
  return descripcion.trim() ? `${descripcion.trim()}\n\n${traza}` : traza;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { origen?: string; id?: number; ubicacion?: string };
  const origen = body.origen === "tic" || body.origen === "mantenimiento" ? body.origen : null;
  if (!origen || !Number.isInteger(body.id)) {
    return NextResponse.json({ error: "Petición no válida" }, { status: 400 });
  }

  const auth = await authorizeApi(GESTORES[origen]);
  if (!auth.ok) return auth.response;
  const { user } = auth;

  const ubicacion = body.ubicacion?.trim() ?? "";
  if (origen === "tic" && !ubicacion) {
    return NextResponse.json({ error: "La ubicación es obligatoria para mantenimiento" }, { status: 400 });
  }

  // Admin client only after the role check above: the copy keeps the original author,
  // which the insert RLS policies (autor_id = auth.uid()) would reject
  const admin = createAdminClient();
  const tablaOrigen = origen === "tic" ? "peticiones_tic" : "peticiones_mantenimiento";

  const { data: original } = await admin
    .from(tablaOrigen)
    .select(`id, codigo, titulo, descripcion, prioridad, estado, autor_id, foto_path, foto_nombre${origen === "mantenimiento" ? ", ubicacion" : ""}`)
    .eq("id", body.id)
    .maybeSingle<PeticionOrigen>();

  if (!original) return NextResponse.json({ error: "La petición no existe" }, { status: 404 });
  if (ESTADOS_CERRADOS.includes(original.estado)) {
    return NextResponse.json({ error: "Solo se pueden traspasar peticiones abiertas" }, { status: 409 });
  }

  // TIC requests have no location field: keep it at the top of the description instead
  const ubicacionOrigen = original.ubicacion?.trim();
  const descripcionBase = ubicacionOrigen
    ? `Ubicación: ${ubicacionOrigen}${original.descripcion.trim() ? `\n\n${original.descripcion.trim()}` : ""}`
    : original.descripcion;

  const comun = {
    titulo: original.titulo,
    descripcion: withTraza(descripcionBase, `Traspasada desde ${original.codigo}.`),
    prioridad: original.prioridad,
    autor_id: original.autor_id,
    foto_path: original.foto_path,
    foto_nombre: original.foto_nombre,
  };

  const { data: nueva, error: insertError } = origen === "tic"
    // Lands in "Por Validar" so Directiva reviews it like any other maintenance request
    ? await admin.from("peticiones_mantenimiento").insert({ ...comun, ubicacion }).select().single()
    : await admin.from("peticiones_tic").insert({ ...comun, solo_usuario: false }).select().single();

  if (insertError || !nueva) {
    return NextResponse.json({ error: "No se ha podido crear la petición en el otro tablero" }, { status: 500 });
  }
  const codigoNuevo = nueva.codigo as string;

  const { error: updateError } = await admin
    .from(tablaOrigen)
    .update({
      estado: "eliminada",
      descripcion: withTraza(original.descripcion, `Traspasada a ${codigoNuevo}.`),
    })
    .eq("id", original.id);

  if (updateError) {
    // Undo the copy so the request does not end up on both boards
    await admin.from(origen === "tic" ? "peticiones_mantenimiento" : "peticiones_tic").delete().eq("id", nueva.id);
    return NextResponse.json({ error: "No se ha podido traspasar la petición" }, { status: 500 });
  }

  // TIC requests keep an activity log: record the move on whichever side is TIC
  await admin.from("peticiones_tic_actividad").insert(
    origen === "tic"
      ? { peticion_id: original.id, user_id: user.id, tipo: "eliminado", contenido: `Traspasada a Mantenimiento como ${codigoNuevo}` }
      : { peticion_id: nueva.id, user_id: user.id, tipo: "creacion", contenido: `Traspasada desde Mantenimiento (${original.codigo})` }
  );

  // Notify the target board's recipients as for a new request
  const [{ data: autor }, recipientEmails] = await Promise.all([
    admin.from("users_view").select("full_name").eq("id", original.autor_id).maybeSingle(),
    getNotificationEmails(
      admin,
      origen === "tic" ? NOTIFICATION_CLAVES.peticionesMantenimiento : NOTIFICATION_CLAVES.peticionesTic
    ),
  ]);
  const emailBase = {
    recipientEmails,
    codigo: codigoNuevo,
    titulo: original.titulo,
    descripcion: comun.descripcion,
    prioridad: original.prioridad,
    autorNombre: (autor?.full_name as string | undefined) ?? "Usuario/a",
  };
  await (origen === "tic"
    ? sendNuevaPeticionMantenimientoEmail({ ...emailBase, ubicacion })
    : sendNuevaPeticionTICEmail({ ...emailBase, soloUsuario: false })
  ).catch(() => { /* non-blocking */ });

  return NextResponse.json({ success: true, codigo: codigoNuevo });
}

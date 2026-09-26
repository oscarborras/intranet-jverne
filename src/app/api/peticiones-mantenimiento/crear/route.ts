import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendNuevaPeticionMantenimientoEmail } from "@/lib/email";
import { getNotificationEmails, NOTIFICATION_CLAVES } from "@/lib/notifications";
import type { PeticionPrioridad } from "@/lib/types";
import { authorizeApi } from "@/lib/auth";

const PRIORIDADES: PeticionPrioridad[] = ["baja", "normal", "alta", "urgente"];

export async function POST(req: NextRequest) {
  const auth = await authorizeApi();
  if (!auth.ok) return auth.response;
  const { user } = auth;
  const supabase = await createClient();

  const body = await req.json() as {
    titulo: string;
    descripcion: string;
    ubicacion: string;
    prioridad: PeticionPrioridad;
    foto_path: string | null;
    foto_nombre: string | null;
  };

  const titulo = body.titulo?.trim();
  const ubicacion = body.ubicacion?.trim();
  if (!titulo || !ubicacion) {
    return NextResponse.json({ error: "El título y la ubicación son obligatorios" }, { status: 400 });
  }
  const prioridad = PRIORIDADES.includes(body.prioridad) ? body.prioridad : "normal";

  const { data: peticion, error } = await supabase
    .from("peticiones_mantenimiento")
    .insert({
      titulo,
      descripcion: body.descripcion ?? "",
      ubicacion,
      prioridad,
      autor_id: user.id,
      foto_path: body.foto_path ?? null,
      foto_nombre: body.foto_nombre ?? null,
    })
    .select()
    .single();

  if (error || !peticion) {
    return NextResponse.json({ error: error?.message ?? "Error al crear la petición" }, { status: 500 });
  }

  const [{ data: autor }, recipientEmails] = await Promise.all([
    supabase.from("users_view").select("full_name").eq("id", user.id).single(),
    getNotificationEmails(supabase, NOTIFICATION_CLAVES.peticionesMantenimiento),
  ]);

  await sendNuevaPeticionMantenimientoEmail({
    recipientEmails,
    codigo: peticion.codigo as string,
    titulo,
    descripcion: body.descripcion ?? "",
    ubicacion,
    prioridad,
    autorNombre: autor?.full_name ?? "Usuario/a",
  }).catch(() => { /* non-blocking */ });

  return NextResponse.json({ success: true, peticion });
}

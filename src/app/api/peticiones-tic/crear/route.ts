import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendNuevaPeticionTICEmail } from "@/lib/email";
import { getNotificationEmails, NOTIFICATION_CLAVES } from "@/lib/notifications";
import type { PeticionPrioridad } from "@/lib/types";

const PRIORIDADES: PeticionPrioridad[] = ["baja", "normal", "alta", "urgente"];

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    titulo: string;
    descripcion: string;
    prioridad: PeticionPrioridad;
    solo_usuario: boolean;
    foto_path: string | null;
    foto_nombre: string | null;
  };

  const titulo = body.titulo?.trim();
  if (!titulo) return NextResponse.json({ error: "El título es obligatorio" }, { status: 400 });
  const prioridad = PRIORIDADES.includes(body.prioridad) ? body.prioridad : "normal";

  const { data: peticion, error } = await supabase
    .from("peticiones_tic")
    .insert({
      titulo,
      descripcion: body.descripcion ?? "",
      prioridad,
      autor_id: user.id,
      solo_usuario: body.solo_usuario === true,
      foto_path: body.foto_path ?? null,
      foto_nombre: body.foto_nombre ?? null,
    })
    .select()
    .single();

  if (error || !peticion) {
    return NextResponse.json({ error: error?.message ?? "Error al crear la petición" }, { status: 500 });
  }

  await supabase.from("peticiones_tic_actividad").insert({
    peticion_id: peticion.id,
    user_id: user.id,
    tipo: "creacion",
    contenido: "Petición creada",
  });

  const [{ data: autor }, recipientEmails] = await Promise.all([
    supabase.from("users_view").select("full_name").eq("id", user.id).single(),
    getNotificationEmails(supabase, NOTIFICATION_CLAVES.peticionesTic),
  ]);

  await sendNuevaPeticionTICEmail({
    recipientEmails,
    codigo: peticion.codigo as string,
    titulo,
    descripcion: body.descripcion ?? "",
    prioridad,
    autorNombre: autor?.full_name ?? "Usuario/a",
    soloUsuario: peticion.solo_usuario as boolean,
  }).catch(() => { /* non-blocking */ });

  return NextResponse.json({ success: true, peticion });
}

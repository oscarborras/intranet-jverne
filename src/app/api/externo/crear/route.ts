import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizeExternoApi } from "@/lib/externo";
import {
  ESTADO_INICIAL_PORTAL,
  MAX_DESCRIPCION_LENGTH,
  MAX_FOTO_BYTES,
  MAX_TITULO_LENGTH,
  MAX_UBICACION_LENGTH,
} from "@/lib/externoMantenimiento";
import { sendNuevaPeticionMantenimientoEmail } from "@/lib/email";
import { getNotificationEmails, NOTIFICATION_CLAVES } from "@/lib/notifications";
import type { PeticionPrioridad } from "@/lib/types";

const PRIORIDADES: PeticionPrioridad[] = ["baja", "normal", "alta", "urgente"];

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

// External portal: the technician reports a new maintenance request. It skips validation
// (starts open) and is always visible in the portal. The optional photo is uploaded here,
// since the technician's browser has no storage access of its own.
export async function POST(req: NextRequest) {
  const auth = await authorizeExternoApi();
  if (!auth.ok) return auth.response;
  const { session } = auth;

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Datos no válidos" }, { status: 400 });

  const titulo = field(form, "titulo");
  const ubicacion = field(form, "ubicacion");
  const descripcion = field(form, "descripcion");
  const prioridadRaw = field(form, "prioridad") as PeticionPrioridad;
  const prioridad = PRIORIDADES.includes(prioridadRaw) ? prioridadRaw : "normal";
  const fotoEntry = form.get("foto");
  const foto = fotoEntry instanceof File && fotoEntry.size > 0 ? fotoEntry : null;

  if (!titulo || !ubicacion) {
    return NextResponse.json({ error: "El título y la ubicación son obligatorios" }, { status: 400 });
  }
  if (titulo.length > MAX_TITULO_LENGTH || ubicacion.length > MAX_UBICACION_LENGTH || descripcion.length > MAX_DESCRIPCION_LENGTH) {
    return NextResponse.json({ error: "Algún campo supera la longitud máxima" }, { status: 400 });
  }
  if (foto && (!foto.type.startsWith("image/") || foto.size > MAX_FOTO_BYTES)) {
    return NextResponse.json({ error: "La foto debe ser una imagen de 10 MB como máximo" }, { status: 400 });
  }

  const admin = createAdminClient();

  let fotoPath: string | null = null;
  if (foto) {
    const safeName = foto.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    fotoPath = `${session.uid}/${Date.now()}-${safeName}`;
    const { error } = await admin.storage.from("incidencias").upload(fotoPath, foto, { contentType: foto.type });
    if (error) return NextResponse.json({ error: "No se pudo subir la foto" }, { status: 500 });
  }

  const { data: peticion, error } = await admin
    .from("peticiones_mantenimiento")
    .insert({
      titulo,
      descripcion,
      ubicacion,
      prioridad,
      estado: ESTADO_INICIAL_PORTAL,
      autor_id: session.uid,
      foto_path: fotoPath,
      foto_nombre: foto?.name ?? null,
      oculta_externo: false,
    })
    .select("id, codigo")
    .single();

  if (error || !peticion) {
    if (fotoPath) await admin.storage.from("incidencias").remove([fotoPath]);
    return NextResponse.json({ error: "No se pudo crear la petición" }, { status: 500 });
  }

  const recipientEmails = await getNotificationEmails(admin, NOTIFICATION_CLAVES.peticionesMantenimiento);
  await sendNuevaPeticionMantenimientoEmail({
    recipientEmails,
    codigo: peticion.codigo as string,
    titulo,
    descripcion,
    ubicacion,
    prioridad,
    autorNombre: `${session.nombre} (técnico externo)`,
    creadaPorExterno: true,
  }).catch(() => { /* non-blocking */ });

  return NextResponse.json({ ok: true, codigo: peticion.codigo as string });
}

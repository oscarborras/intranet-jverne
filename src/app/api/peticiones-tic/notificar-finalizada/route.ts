import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authorizeApi } from "@/lib/auth";
import { sendPeticionTICFinalizadaEmail } from "@/lib/email";

// Called by the client right after a TIC request is moved to "finalizada".
// Emails the author, unless they finished it themselves. Everything is re-checked
// here so the endpoint cannot be used to send arbitrary emails.

// Profiles allowed to finish other people's requests (same as the peticiones_tic UPDATE policy)
const GESTORES_TIC = ["Admin", "TDE", "Soporte_TIC", "Directiva"];

// Only notify requests finished just now (the DB trigger sets finalizada_at)
const MAX_AGE_MS = 5 * 60 * 1000;

export async function POST(req: NextRequest) {
  const auth = await authorizeApi();
  if (!auth.ok) return auth.response;
  const { user, roleNames } = auth;

  const body = (await req.json().catch(() => null)) as { peticionId?: number } | null;
  const peticionId = Number(body?.peticionId);
  if (!Number.isInteger(peticionId) || peticionId <= 0) {
    return NextResponse.json({ error: "Petición no válida" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: peticion } = await supabase
    .from("peticiones_tic")
    .select("id, codigo, titulo, estado, autor_id, finalizada_at")
    .eq("id", peticionId)
    .maybeSingle();

  if (!peticion) {
    return NextResponse.json({ error: "Petición no encontrada" }, { status: 404 });
  }

  // The author finished their own request: nothing to notify
  if (peticion.autor_id === user.id) {
    return NextResponse.json({ sent: false, reason: "autor" });
  }

  if (!roleNames.some((r) => GESTORES_TIC.includes(r))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const finalizadaAt = peticion.finalizada_at ? new Date(peticion.finalizada_at as string).getTime() : 0;
  if (peticion.estado !== "finalizada" || Date.now() - finalizadaAt > MAX_AGE_MS) {
    return NextResponse.json({ sent: false, reason: "no_recien_finalizada" });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ sent: false, reason: "email_no_configurado" });
  }

  const { data: personas } = await supabase
    .from("users_view")
    .select("id, email, full_name")
    .in("id", [peticion.autor_id as string, user.id]);
  const autor = personas?.find((p) => p.id === peticion.autor_id);
  const finalizador = personas?.find((p) => p.id === user.id);

  if (!autor?.email) {
    return NextResponse.json({ sent: false, reason: "autor_sin_email" });
  }

  await sendPeticionTICFinalizadaEmail({
    autorEmail: autor.email as string,
    autorNombre: (autor.full_name as string | null) || (autor.email as string).split("@")[0],
    codigo: peticion.codigo as string,
    titulo: peticion.titulo as string,
    finalizadaPor:
      (finalizador?.full_name as string | null) ||
      (user.user_metadata?.full_name as string | undefined) ||
      user.email ||
      "Soporte TIC",
  }).catch(console.error);

  return NextResponse.json({ sent: true });
}

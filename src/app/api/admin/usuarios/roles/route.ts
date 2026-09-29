import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authorizeApi } from "@/lib/auth";

interface SetRolesBody {
  userId?: unknown;
  perfilIds?: unknown;
}

// Replaces a user's perfiles. Adds before removing, so the caller never loses Admin midway
// (RLS on user_roles_intranet only lets Admin write), and refuses to drop the caller's own Admin.
export async function POST(req: NextRequest) {
  const auth = await authorizeApi(["Admin"]);
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => null)) as SetRolesBody | null;
  const userId = typeof body?.userId === "string" ? body.userId : null;
  const perfilIds = Array.isArray(body?.perfilIds)
    ? [...new Set(body.perfilIds.filter((n): n is number => Number.isInteger(n)))]
    : null;
  if (!userId || !perfilIds) {
    return NextResponse.json({ error: "Datos no válidos" }, { status: 400 });
  }

  const supabase = await createClient();

  const [{ data: perfiles, error: perfilesError }, { data: current, error: currentError }] = await Promise.all([
    supabase.from("perfiles_intranet").select("id, nombre"),
    supabase.from("user_roles_intranet").select("perfil_id").eq("user_id", userId),
  ]);
  if (perfilesError || currentError || !perfiles) {
    return NextResponse.json({ error: "No se pudieron leer los perfiles" }, { status: 500 });
  }

  const validIds = new Set(perfiles.map((p) => p.id as number));
  if (perfilIds.some((id) => !validIds.has(id))) {
    return NextResponse.json({ error: "Perfil desconocido" }, { status: 400 });
  }

  const adminId = perfiles.find((p) => p.nombre === "Admin")?.id as number | undefined;
  if (userId === auth.user.id && adminId !== undefined && !perfilIds.includes(adminId)) {
    return NextResponse.json(
      { error: "No puedes quitarte a ti mismo el perfil Admin. Pide a otro administrador que lo haga." },
      { status: 400 }
    );
  }

  const currentIds = new Set((current ?? []).map((r) => r.perfil_id as number));
  const toAdd = perfilIds.filter((id) => !currentIds.has(id));
  const toRemove = [...currentIds].filter((id) => !perfilIds.includes(id));

  if (toAdd.length > 0) {
    const { error } = await supabase
      .from("user_roles_intranet")
      .insert(toAdd.map((perfil_id) => ({ user_id: userId, perfil_id })));
    if (error) return NextResponse.json({ error: "No se pudieron añadir los perfiles" }, { status: 500 });
  }

  if (toRemove.length > 0) {
    const { error } = await supabase
      .from("user_roles_intranet")
      .delete()
      .eq("user_id", userId)
      .in("perfil_id", toRemove);
    if (error) return NextResponse.json({ error: "No se pudieron quitar los perfiles" }, { status: 500 });
  }

  // Return what is actually stored, so the UI never shows an unsaved state
  const { data: saved, error: savedError } = await supabase
    .from("user_roles_intranet")
    .select("perfil_id")
    .eq("user_id", userId);
  if (savedError) return NextResponse.json({ error: "No se pudo comprobar el resultado" }, { status: 500 });

  return NextResponse.json({ perfilIds: (saved ?? []).map((r) => r.perfil_id as number) });
}

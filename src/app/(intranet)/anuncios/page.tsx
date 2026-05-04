import { createClient } from "@/lib/supabase/server";
import { AnunciosClient } from "./AnunciosClient";
import type { Anuncio, Perfil } from "@/lib/types";

export default async function AnunciosPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: rolesData } = await supabase
    .from("user_roles_intranet")
    .select("perfiles_intranet(id, nombre, descripcion, created_at)")
    .eq("user_id", user!.id);

  const roles: Perfil[] = (rolesData ?? [])
    .map((r) => r.perfiles_intranet as unknown as Perfil)
    .filter(Boolean);

  const canManage = roles.some((r) => ["Admin", "Directiva"].includes(r.nombre));

  const _now = new Date();
  const todayStr = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, "0")}-${String(_now.getDate()).padStart(2, "0")}`;

  // Managers see all announcements (including expired) to allow editing/deletion.
  // Regular users only see announcements that have not yet expired.
  const anunciosQuery = supabase
    .from("anuncios")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: anunciosData } = canManage
    ? await anunciosQuery
    : await anunciosQuery.or(`visible_hasta.is.null,visible_hasta.gte.${todayStr}`);

  return (
    <AnunciosClient
      initialAnuncios={(anunciosData ?? []) as Anuncio[]}
      canManage={canManage}
      userId={user!.id}
    />
  );
}

import { createClient } from "@/lib/supabase/server";
import { AnunciosClient } from "./AnunciosClient";
import type { Anuncio, Perfil } from "@/lib/types";

export default async function AnunciosPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: anunciosData }, { data: rolesData }] = await Promise.all([
    supabase
      .from("anuncios")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("user_roles_intranet")
      .select("perfiles_intranet(id, nombre, descripcion, created_at)")
      .eq("user_id", user!.id),
  ]);

  const roles: Perfil[] = (rolesData ?? [])
    .map((r) => r.perfiles_intranet as unknown as Perfil)
    .filter(Boolean);

  const canManage = roles.some((r) => ["Admin", "Directiva"].includes(r.nombre));

  return (
    <AnunciosClient
      initialAnuncios={(anunciosData ?? []) as Anuncio[]}
      canManage={canManage}
      userId={user!.id}
    />
  );
}

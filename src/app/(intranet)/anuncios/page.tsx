import { createClient } from "@/lib/supabase/server";
import { AnunciosClient } from "./AnunciosClient";
import type { Anuncio } from "@/lib/types";
import { todayMadrid } from "@/lib/dates";
import { requireAuth } from "@/lib/auth";

export default async function AnunciosPage() {
  const { user, roles } = await requireAuth();
  const supabase = await createClient();

  const canManage = roles.some((r) => ["Admin", "Directiva"].includes(r.nombre));

  const todayStr = todayMadrid();

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
      userId={user.id}
    />
  );
}

import { createClient } from "@/lib/supabase/server";
import { PeticionesTICClient } from "./PeticionesTICClient";
import { resolveAutorNames } from "@/lib/resolveAutorNames";
import type { PeticionTIC, Perfil } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PeticionesTICPage() {
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

  const canViewAll = roles.some((r) =>
    ["Admin", "TDE", "Soporte_TIC"].includes(r.nombre)
  );

  const canManage = roles.some((r) =>
    ["Admin", "TDE", "Soporte_TIC"].includes(r.nombre)
  );

  const canDelete = roles.some((r) => ["Admin", "TDE"].includes(r.nombre));

  let peticionesQuery = supabase
    .from("peticiones_tic")
    .select("*")
    .neq("estado", "eliminada")
    .order("created_at", { ascending: false });

  if (!canViewAll) {
    peticionesQuery = peticionesQuery.or(`solo_usuario.eq.false,autor_id.eq.${user!.id}`);
  }

  const { data: peticionesRaw } = await peticionesQuery;

  const uniqueUserIds = [
    ...new Set([
      ...(peticionesRaw ?? []).map((p) => p.autor_id as string),
      ...(peticionesRaw ?? []).filter((p) => p.asignado_id).map((p) => p.asignado_id as string),
      user!.id,
    ]),
  ];
  const userNames = await resolveAutorNames(supabase, uniqueUserIds);

  const peticiones: PeticionTIC[] = (peticionesRaw ?? []).map((p) => ({
    ...p,
    autor: { full_name: userNames[p.autor_id] ?? "—" },
    asignado: p.asignado_id ? { full_name: userNames[p.asignado_id] ?? "—" } : undefined,
  })) as PeticionTIC[];

  const myDisplayName = userNames[user!.id] ?? "—";

  return (
    <PeticionesTICClient
      initialPeticiones={peticiones}
      canManage={canManage}
      canDelete={canDelete}
      userId={user!.id}
      myDisplayName={myDisplayName}
    />
  );
}

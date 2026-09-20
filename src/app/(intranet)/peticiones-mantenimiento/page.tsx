import { createClient } from "@/lib/supabase/server";
import { PeticionesMantenimientoClient } from "./PeticionesMantenimientoClient";
import { resolveAutorNames } from "@/lib/resolveAutorNames";
import type { PeticionMantenimiento, Perfil } from "@/lib/types";

export default async function PeticionesMantenimientoPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: peticionesRaw }, { data: rolesData }] = await Promise.all([
    supabase
      .from("peticiones_mantenimiento")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("user_roles_intranet")
      .select("perfiles_intranet(id, nombre, descripcion, created_at)")
      .eq("user_id", user!.id),
  ]);

  const uniqueAutorIds = [...new Set([...(peticionesRaw ?? []).map((p) => p.autor_id as string), user!.id])];
  const autorNames = await resolveAutorNames(supabase, uniqueAutorIds);

  const peticiones: PeticionMantenimiento[] = (peticionesRaw ?? []).map((p) => ({
    ...p,
    autor: { full_name: autorNames[p.autor_id] ?? "—" },
  })) as PeticionMantenimiento[];

  const myDisplayName = autorNames[user!.id] ?? "—";

  const roles: Perfil[] = (rolesData ?? [])
    .map((r) => r.perfiles_intranet as unknown as Perfil)
    .filter(Boolean);

  const canValidate = roles.some((r) => ["Admin", "Directiva"].includes(r.nombre));

  return (
    <PeticionesMantenimientoClient
      initialPeticiones={peticiones}
      canValidate={canValidate}
      userId={user!.id}
      myDisplayName={myDisplayName}
    />
  );
}

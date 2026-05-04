import { createClient } from "@/lib/supabase/server";
import { PeticionesMantenimientoClient } from "./PeticionesMantenimientoClient";
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

  const uniqueAutorIds = [...new Set((peticionesRaw ?? []).map((p) => p.autor_id as string))];
  let autorNames: Record<string, string> = {};
  if (uniqueAutorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("users_view")
      .select("id, full_name")
      .in("id", uniqueAutorIds);
    autorNames = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.full_name as string]));
  }

  const peticiones: PeticionMantenimiento[] = (peticionesRaw ?? []).map((p) => ({
    ...p,
    autor: { full_name: autorNames[p.autor_id] ?? "—" },
  })) as PeticionMantenimiento[];

  const roles: Perfil[] = (rolesData ?? [])
    .map((r) => r.perfiles_intranet as unknown as Perfil)
    .filter(Boolean);

  const canValidate = roles.some((r) =>
    ["Admin", "Equipo Mantenimiento", "Directiva"].includes(r.nombre)
  );

  return (
    <PeticionesMantenimientoClient
      initialPeticiones={peticiones}
      canValidate={canValidate}
      userId={user!.id}
    />
  );
}

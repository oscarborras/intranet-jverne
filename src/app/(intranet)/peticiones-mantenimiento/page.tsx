import { createClient } from "@/lib/supabase/server";
import { PeticionesMantenimientoClient } from "./PeticionesMantenimientoClient";
import { resolveAutorNames } from "@/lib/resolveAutorNames";
import { getFinalizadasCutoff } from "@/lib/peticiones";
import type { PeticionMantenimiento } from "@/lib/types";
import { requireAuth } from "@/lib/auth";

export default async function PeticionesMantenimientoPage() {
  const { user, roles } = await requireAuth();
  const supabase = await createClient();

  const { dias, cutoff } = await getFinalizadasCutoff(supabase);

  // Open requests always; finished ones only within the configured window
  const [{ data: activas }, { data: finalizadas }, { count: finalizadasAntiguas }] = await Promise.all([
    supabase
      .from("peticiones_mantenimiento")
      .select("*")
      .not("estado", "in", "(finalizada,rechazada,eliminada)")
      .order("created_at", { ascending: false }),
    supabase
      .from("peticiones_mantenimiento")
      .select("*")
      .eq("estado", "finalizada")
      .gte("finalizada_at", cutoff)
      .order("finalizada_at", { ascending: false }),
    supabase
      .from("peticiones_mantenimiento")
      .select("id", { count: "exact", head: true })
      .eq("estado", "finalizada")
      .lt("finalizada_at", cutoff),
  ]);
  const peticionesRaw = [...(activas ?? []), ...(finalizadas ?? [])];

  const uniqueAutorIds = [...new Set([...peticionesRaw.map((p) => p.autor_id as string), user.id])];
  const autorNames = await resolveAutorNames(supabase, uniqueAutorIds);

  const peticiones: PeticionMantenimiento[] = peticionesRaw.map((p) => ({
    ...p,
    autor: { full_name: autorNames[p.autor_id] ?? "—" },
  })) as PeticionMantenimiento[];

  const myDisplayName = autorNames[user.id] ?? "—";

  const canValidate = roles.some((r) => ["Admin", "Directiva"].includes(r.nombre));
  const isAdmin = roles.some((r) => r.nombre === "Admin");

  return (
    <PeticionesMantenimientoClient
      initialPeticiones={peticiones}
      canValidate={canValidate}
      isAdmin={isAdmin}
      userId={user.id}
      myDisplayName={myDisplayName}
      diasVistaFinalizadas={dias}
      finalizadasAntiguas={finalizadasAntiguas ?? 0}
    />
  );
}

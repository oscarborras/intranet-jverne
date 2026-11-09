import { createClient } from "@/lib/supabase/server";
import { PeticionesMantenimientoClient } from "./PeticionesMantenimientoClient";
import { resolveAutorNames } from "@/lib/resolveAutorNames";
import { getFinalizadasCutoff } from "@/lib/peticiones";
import type { PeticionMantenimiento } from "@/lib/types";
import { requireAuth } from "@/lib/auth";
import { parseDayParam } from "@/lib/kanbanFilters";
import { addDaysToDateStr } from "@/lib/dates";

interface PageProps {
  searchParams: Promise<{ registrada?: string; resuelta?: string }>;
}

export default async function PeticionesMantenimientoPage({ searchParams }: PageProps) {
  const { user, roles } = await requireAuth();
  const sp = await searchParams;
  const registrada = parseDayParam(sp.registrada);
  const resuelta = parseDayParam(sp.resuelta);
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

  // Day filters: also load the finished requests of that day that are older than the window.
  // Timestamps without offset are read in the DB timezone (Europe/Madrid).
  const dayFiltered = await Promise.all(
    ([["created_at", registrada], ["finalizada_at", resuelta]] as const)
      .filter(([, day]) => day)
      .map(([column, day]) =>
        supabase
          .from("peticiones_mantenimiento")
          .select("*")
          .eq("estado", "finalizada")
          .lt("finalizada_at", cutoff)
          .gte(column, `${day}T00:00:00`)
          .lt(column, `${addDaysToDateStr(day, 1)}T00:00:00`)
      )
  );
  const peticionesRaw = [
    ...new Map(
      [...(activas ?? []), ...(finalizadas ?? []), ...dayFiltered.flatMap((r) => r.data ?? [])].map((p) => [p.id, p])
    ).values(),
  ];

  const uniqueAutorIds = [...new Set([...peticionesRaw.map((p) => p.autor_id as string), user.id])];
  const autorNames = await resolveAutorNames(supabase, uniqueAutorIds);

  const peticiones: PeticionMantenimiento[] = peticionesRaw.map((p) => ({
    ...p,
    autor: { full_name: autorNames[p.autor_id] ?? "—" },
  })) as PeticionMantenimiento[];

  const myDisplayName = autorNames[user.id] ?? "—";

  const canValidate = roles.some((r) => ["Admin", "Directiva"].includes(r.nombre));

  return (
    <PeticionesMantenimientoClient
      initialPeticiones={peticiones}
      canValidate={canValidate}
      userId={user.id}
      myDisplayName={myDisplayName}
      diasVistaFinalizadas={dias}
      finalizadasAntiguas={finalizadasAntiguas ?? 0}
    />
  );
}

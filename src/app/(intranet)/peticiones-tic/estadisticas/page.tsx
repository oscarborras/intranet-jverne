import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { resolveAutorNames } from "@/lib/resolveAutorNames";
import { todayMadrid } from "@/lib/dates";
import { EstadisticasTICClient, type PeticionEstadistica } from "./EstadisticasTICClient";
import type { PeticionPrioridad, PeticionTICEstado } from "@/lib/types";

export const metadata = { title: "Estadísticas de peticiones TIC" };

export default async function EstadisticasTICPage() {
  // Same profiles that manage the TIC board
  await requireRole(["Admin", "TDE", "Soporte_TIC"], "/peticiones-tic");
  const supabase = await createClient();

  const { data } = await supabase
    .from("peticiones_tic")
    .select("id, estado, prioridad, asignado_id, created_at, finalizada_at")
    .neq("estado", "eliminada")
    .order("created_at", { ascending: true });

  const rows = data ?? [];
  const tecnicoIds = rows.map((r) => r.asignado_id as string | null).filter((id): id is string => Boolean(id));
  const nombres = await resolveAutorNames(supabase, tecnicoIds);

  const peticiones: PeticionEstadistica[] = rows.map((r) => ({
    id: r.id as number,
    estado: r.estado as PeticionTICEstado,
    prioridad: r.prioridad as PeticionPrioridad,
    tecnico: r.asignado_id ? (nombres[r.asignado_id as string] ?? "—") : null,
    created_at: r.created_at as string,
    finalizada_at: (r.finalizada_at as string | null) ?? null,
  }));

  return <EstadisticasTICClient peticiones={peticiones} todayStr={todayMadrid()} />;
}

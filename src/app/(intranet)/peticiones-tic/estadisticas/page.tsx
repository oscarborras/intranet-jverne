import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { resolveAutorNames } from "@/lib/resolveAutorNames";
import { todayMadrid } from "@/lib/dates";
import { TIC_ESTADO_LABELS } from "@/lib/peticiones";
import { EstadisticasTICClient, type PeticionEstadistica } from "./EstadisticasTICClient";
import type { PeticionPrioridad, PeticionTICEstado } from "@/lib/types";

export const metadata = { title: "Estadísticas de peticiones TIC" };

export default async function EstadisticasTICPage() {
  // Same profiles that manage the TIC board
  await requireRole(["Admin", "TDE", "Soporte_TIC"], "/peticiones-tic");
  const supabase = await createClient();

  const { data } = await supabase
    .from("peticiones_tic")
    .select("id, estado, prioridad, autor_id, asignado_id, created_at, finalizada_at")
    .neq("estado", "eliminada")
    .order("created_at", { ascending: true });

  const rows = data ?? [];
  const tecnicoIds = rows.map((r) => r.asignado_id as string | null).filter((id): id is string => Boolean(id));
  const finalizadaIds = rows.filter((r) => r.estado === "finalizada").map((r) => r.id as number);

  const [nombres, { data: cierres }] = await Promise.all([
    resolveAutorNames(supabase, tecnicoIds),
    // Who moved each request to "Finalizada" (latest entry wins if it was reopened and closed again)
    finalizadaIds.length > 0
      ? supabase
          .from("peticiones_tic_actividad")
          .select("peticion_id, user_id, created_at")
          .eq("tipo", "cambio_estado")
          .like("contenido", `% a ${TIC_ESTADO_LABELS.finalizada}`)
          .in("peticion_id", finalizadaIds)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as { peticion_id: number; user_id: string; created_at: string }[] }),
  ]);

  const finalizador = new Map<number, string>();
  (cierres ?? []).forEach((c) => finalizador.set(c.peticion_id as number, c.user_id as string));

  const peticiones: PeticionEstadistica[] = rows.map((r) => ({
    id: r.id as number,
    estado: r.estado as PeticionTICEstado,
    prioridad: r.prioridad as PeticionPrioridad,
    tecnico: r.asignado_id ? (nombres[r.asignado_id as string] ?? "—") : null,
    created_at: r.created_at as string,
    finalizada_at: (r.finalizada_at as string | null) ?? null,
    // Created and finished by the same person: usually logged after being solved, so its duration is not a real resolution time
    cerradaPorAutor: finalizador.get(r.id as number) === r.autor_id,
  }));

  return <EstadisticasTICClient peticiones={peticiones} todayStr={todayMadrid()} />;
}

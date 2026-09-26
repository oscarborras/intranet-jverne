import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { todayMadrid } from "@/lib/dates";
import { EstadisticasMantenimientoClient, type PeticionMntEstadistica } from "./EstadisticasMantenimientoClient";
import type { PeticionMantenimientoEstado, PeticionPrioridad } from "@/lib/types";

export const metadata = { title: "Estadísticas de peticiones de mantenimiento" };

export default async function EstadisticasMantenimientoPage() {
  // Same profiles that validate and manage the maintenance board
  await requireRole(["Admin", "Directiva"], "/peticiones-mantenimiento");
  const supabase = await createClient();

  const { data } = await supabase
    .from("peticiones_mantenimiento")
    .select("id, estado, prioridad, created_at, finalizada_at")
    .neq("estado", "eliminada")
    .order("created_at", { ascending: true });

  const peticiones: PeticionMntEstadistica[] = (data ?? []).map((r) => ({
    id: r.id as number,
    estado: r.estado as PeticionMantenimientoEstado,
    prioridad: r.prioridad as PeticionPrioridad,
    created_at: r.created_at as string,
    finalizada_at: (r.finalizada_at as string | null) ?? null,
  }));

  return <EstadisticasMantenimientoClient peticiones={peticiones} todayStr={todayMadrid()} />;
}

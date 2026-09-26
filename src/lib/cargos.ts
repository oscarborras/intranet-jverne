import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { todayMadrid } from "@/lib/dates";
import { CARGOS_DIRECTIVOS, type CargoDirectivoClave } from "@/lib/types";

// Leadership roles (cargos_directivos) that families can request an appointment with.
// Only the role name is ever shown to families, never the person holding it.

export interface CargoDisponible {
  cargo: CargoDirectivoClave;
  nombre: string;
}

export interface TitularCargo {
  id: string;
  profesor: string;
  email: string | null;
}

interface CargoRow {
  cargo: CargoDirectivoClave;
  profesores: { id: string; profesor: string; email: string | null; fecha_cese: string | null } | null;
}

function isActive(fechaCese: string | null, today: string): boolean {
  return !fechaCese || fechaCese > today;
}

/** Roles that currently have an active holder, in display order. */
export async function getCargosDisponibles(admin: SupabaseClient): Promise<CargoDisponible[]> {
  const today = todayMadrid();
  const { data } = await admin
    .from("cargos_directivos")
    .select("cargo, profesores(id, profesor, email, fecha_cese)")
    .not("profesor_id", "is", null)
    .order("orden");
  return ((data ?? []) as unknown as CargoRow[])
    .filter((r) => r.profesores && isActive(r.profesores.fecha_cese, today))
    .map((r) => ({ cargo: r.cargo, nombre: CARGOS_DIRECTIVOS[r.cargo] }));
}

/** Current active holder of a role, or null if it is unassigned or they no longer work here. */
export async function getTitularCargo(admin: SupabaseClient, cargo: CargoDirectivoClave): Promise<TitularCargo | null> {
  const { data } = await admin
    .from("cargos_directivos")
    .select("cargo, profesores(id, profesor, email, fecha_cese)")
    .eq("cargo", cargo)
    .maybeSingle();
  const p = (data as unknown as CargoRow | null)?.profesores;
  if (!p || !isActive(p.fecha_cese, todayMadrid())) return null;
  return { id: p.id, profesor: p.profesor, email: p.email };
}

/** "Jefatura de estudios (García Zafra, Luis)" for role appointments, plain name otherwise. */
export function nombreConCargo(profesor: string, cargo: CargoDirectivoClave | null | undefined): string {
  return cargo ? `${CARGOS_DIRECTIVOS[cargo]} (${profesor})` : profesor;
}

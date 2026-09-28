import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CitaFamilia } from "@/lib/types";

// Appointment list for the "Citas con familias" page. Shared by the page (first render)
// and /api/citas/listado (refresh on tab change). Callers must authenticate first.

// Columns a referring teacher may read (no token_familia, no notas)
const DERIVADA_COLUMNS =
  "id, codigo, profesor_id, alumno_nombre, alumno_curso, familiar_nombre, familiar_parentesco, familiar_email, familiar_telefono, fecha, hora_inicio, lugar, motivo, estado, cancelada_por, motivo_cancelacion, cargo, derivada_por, created_at, updated_at";

export interface CitasFamiliasData {
  /** Own appointments (all of them for Admin/Directiva), read with the user's RLS */
  citas: CitaFamilia[];
  /** Other teachers' appointments this user referred ("Derivadas" tab, read-only) */
  derivadas: CitaFamilia[];
}

export async function loadCitasFamilias(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  { profesorId, isAdmin }: { profesorId: string | null; isAdmin: boolean }
): Promise<CitasFamiliasData> {
  let query = supabase
    .from("citas_familias")
    .select("*")
    .order("created_at", { ascending: false });

  if (!isAdmin && profesorId) {
    query = query.eq("profesor_id", profesorId);
  }

  // RLS only lets teachers read their own appointments, so referred ones are loaded with the
  // admin client, restricted to derivada_por = this teacher and without the family's
  // cancellation token or the recipient's notes. Admins already see everything.
  const derivadasQuery =
    !isAdmin && profesorId
      ? admin
          .from("citas_familias")
          .select(DERIVADA_COLUMNS)
          .eq("derivada_por", profesorId)
          .neq("profesor_id", profesorId)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] });

  const [{ data: citasRaw }, { data: derivadasRaw }] = await Promise.all([query, derivadasQuery]);

  // Resolve professor names (owner and, for referred appointments, who referred it)
  const profesorIds = [
    ...new Set(
      [...(citasRaw ?? []), ...(derivadasRaw ?? [])]
        .flatMap((c) => [c.profesor_id as string, c.derivada_por as string | null])
        .filter((id): id is string => Boolean(id))
    ),
  ];
  let profesoresMap: Record<string, string> = {};
  if (profesorIds.length > 0) {
    const { data: profData } = await admin.from("profesores").select("id, profesor").in("id", profesorIds);
    profesoresMap = Object.fromEntries((profData ?? []).map((p) => [p.id, p.profesor]));
  }

  const citas: CitaFamilia[] = (citasRaw ?? []).map((c) => ({
    ...c,
    profesor: { full_name: profesoresMap[c.profesor_id] ?? "—", email: "" },
    derivada_por_nombre: c.derivada_por ? (profesoresMap[c.derivada_por] ?? "—") : null,
  }));

  const derivadas: CitaFamilia[] = ((derivadasRaw ?? []) as Omit<CitaFamilia, "token_familia" | "notas">[]).map((c) => ({
    ...c,
    token_familia: "",
    notas: null,
    profesor: { full_name: profesoresMap[c.profesor_id] ?? "—", email: "" },
    derivada_por_nombre: c.derivada_por ? (profesoresMap[c.derivada_por] ?? "—") : null,
  }));

  return { citas, derivadas };
}

/** profesores.id of the signed-in user (null when they are not in the staff table). */
export async function getProfesorIdByEmail(admin: SupabaseClient, email: string | undefined): Promise<string | null> {
  if (!email) return null;
  const { data } = await admin.from("profesores").select("id").eq("email", email).maybeSingle();
  return data?.id ?? null;
}

export function isAdminCitas(roleNames: string[]): boolean {
  return roleNames.some((r) => ["Admin", "Directiva"].includes(r));
}

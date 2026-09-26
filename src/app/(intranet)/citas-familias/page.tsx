import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CitaFamilia } from "@/lib/types";
import CitasFamiliasClient from "./CitasFamiliasClient";
import { todayMadrid } from "@/lib/dates";
import { requireAuth } from "@/lib/auth";

export interface ProfesorOption {
  id: string;
  nombre: string;
}

export default async function CitasFamiliasPage() {
  const { user, roles } = await requireAuth();
  const supabase = await createClient();

  const admin = createAdminClient();

  const { data: profesorRow } = await admin.from("profesores").select("id").eq("email", user.email!).single();

  const isAdmin = roles.some((r) => ["Admin", "Directiva"].includes(r.nombre));
  const profesorId = profesorRow?.id ?? null;

  let query = supabase
    .from("citas_familias")
    .select("*")
    .order("created_at", { ascending: false });

  if (!isAdmin && profesorId) {
    query = query.eq("profesor_id", profesorId);
  }

  const today = todayMadrid();

  const [{ data: citasRaw }, profesoresResult] = await Promise.all([
    query,
    isAdmin
      ? admin
          .from("profesores")
          .select("id, profesor")
          .or(`fecha_cese.is.null,fecha_cese.gt.${today}`)
          .order("profesor", { ascending: true })
      : Promise.resolve({ data: null }),
  ]);

  // Resolve professor names from profesores table
  const profesorIds = [...new Set((citasRaw ?? []).map((c) => c.profesor_id as string))];
  let profesoresMap: Record<string, string> = {};
  if (profesorIds.length > 0) {
    const { data: profData } = await admin
      .from("profesores")
      .select("id, profesor")
      .in("id", profesorIds);
    profesoresMap = Object.fromEntries((profData ?? []).map((p) => [p.id, p.profesor]));
  }

  const citas: CitaFamilia[] = (citasRaw ?? []).map((c) => ({
    ...c,
    profesor: { full_name: profesoresMap[c.profesor_id] ?? "—", email: "" },
  }));

  const profesores: ProfesorOption[] = (profesoresResult.data ?? []).map((p) => ({
    id: p.id as string,
    nombre: p.profesor as string,
  }));

  return (
    <CitasFamiliasClient
      initialCitas={citas}
      userId={profesorId ?? user.id}
      currentProfesorId={profesorId}
      isAdmin={isAdmin}
      profesores={isAdmin ? profesores : []}
    />
  );
}

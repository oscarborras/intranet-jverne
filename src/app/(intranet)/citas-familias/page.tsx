import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CitaFamilia, Perfil } from "@/lib/types";
import CitasFamiliasClient from "./CitasFamiliasClient";

export interface ProfesorOption {
  id: string;
  nombre: string;
}

export default async function CitasFamiliasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  const [{ data: rolesData }, { data: profesorRow }] = await Promise.all([
    supabase
      .from("user_roles_intranet")
      .select("perfiles_intranet(id, nombre, descripcion, created_at)")
      .eq("user_id", user.id),
    admin.from("profesores").select("id").eq("email", user.email!).single(),
  ]);

  const roles: Perfil[] = (rolesData ?? [])
    .map((r) => r.perfiles_intranet as unknown as Perfil)
    .filter(Boolean);

  const isAdmin = roles.some((r) => ["Admin", "Directiva"].includes(r.nombre));
  const profesorId = profesorRow?.id ?? null;

  let query = supabase
    .from("citas_familias")
    .select("*")
    .order("created_at", { ascending: false });

  if (!isAdmin && profesorId) {
    query = query.eq("profesor_id", profesorId);
  }

  const today = new Date().toISOString().slice(0, 10);

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

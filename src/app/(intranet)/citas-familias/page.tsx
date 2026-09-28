import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import CitasFamiliasClient from "./CitasFamiliasClient";
import { todayMadrid } from "@/lib/dates";
import { requireAuth } from "@/lib/auth";
import { canAccessModule } from "@/lib/modulos";
import { getCargosDisponibles } from "@/lib/cargos";
import { getProfesorIdByEmail, isAdminCitas, loadCitasFamilias } from "@/lib/citasFamilias";

export interface ProfesorOption {
  id: string;
  nombre: string;
}

export default async function CitasFamiliasPage() {
  const { user, roleNames } = await requireAuth();
  const supabase = await createClient();
  const admin = createAdminClient();

  const isAdmin = isAdminCitas(roleNames);
  const profesorId = await getProfesorIdByEmail(admin, user.email);
  const today = todayMadrid();

  const [{ citas, derivadas }, profesoresResult, canSolicitar] = await Promise.all([
    loadCitasFamilias(supabase, admin, { profesorId, isAdmin }),
    isAdmin
      ? admin
          .from("profesores")
          .select("id, profesor")
          .or(`fecha_cese.is.null,fecha_cese.gt.${today}`)
          .order("profesor", { ascending: true })
      : Promise.resolve({ data: null }),
    canAccessModule(supabase, user.id, "citas-familias"),
  ]);

  // Leadership roles for the "Derivar cita" form (role name only, never the holder)
  const cargos = canSolicitar ? await getCargosDisponibles(admin) : [];

  const profesores: ProfesorOption[] = (profesoresResult.data ?? []).map((p) => ({
    id: p.id as string,
    nombre: p.profesor as string,
  }));

  return (
    <CitasFamiliasClient
      initialCitas={citas}
      initialDerivadas={derivadas}
      userId={profesorId ?? user.id}
      currentProfesorId={profesorId}
      isAdmin={isAdmin}
      profesores={isAdmin ? profesores : []}
      canSolicitar={canSolicitar}
      cargos={cargos}
    />
  );
}

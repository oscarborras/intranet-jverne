import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { ROLES_OPERAR_V2, puedeGestionarV2 } from "@/lib/gratuidadV2/permisos";
import { gruposConLibrosPrestados } from "@/lib/gratuidadV2/grupos";
import { EjemplaresClient } from "./EjemplaresClient";

export const metadata = { title: "Ejemplares · Gratuidad v2" };

export default async function EjemplaresV2Page() {
  const { roleNames } = await requireRole(ROLES_OPERAR_V2);
  const supabase = await createClient();

  const [{ data: titulos }, grupos] = await Promise.all([
    supabase.from("gplv2_titulos").select("id, titulo").order("titulo"),
    // The group filter matches the holder's current group: current students only
    gruposConLibrosPrestados(supabase, false),
  ]);

  return (
    <EjemplaresClient
      titulos={(titulos ?? []) as { id: string; titulo: string }[]}
      grupos={grupos}
      canManage={puedeGestionarV2(roleNames)}
    />
  );
}

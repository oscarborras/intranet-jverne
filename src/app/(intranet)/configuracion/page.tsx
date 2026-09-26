import { createClient } from "@/lib/supabase/server";
import { ConfiguracionClient } from "./ConfiguracionClient";
import type { CargoDirectivo, ConfigIntranet, Perfil } from "@/lib/types";
import { requireRole } from "@/lib/auth";
import { todayMadrid } from "@/lib/dates";

export default async function ConfiguracionPage() {
  await requireRole(["Admin", "Directiva"]);
  const supabase = await createClient();

  const today = todayMadrid();
  const [{ data: config }, { data: perfiles }, { data: cargos }, { data: profesores }] = await Promise.all([
    supabase.from("config_intranet").select("*").order("created_at"),
    supabase.from("perfiles_intranet").select("id, nombre").order("id"),
    supabase.from("cargos_directivos").select("*").order("orden"),
    supabase.from("profesores").select("id, profesor, fecha_cese").order("profesor"),
  ]);

  // Active staff, plus any current holder who has since left (so the assignment stays visible)
  const holderIds = new Set((cargos ?? []).map((c) => c.profesor_id).filter(Boolean));
  const profesoresOptions = (profesores ?? [])
    .filter((p) => !p.fecha_cese || p.fecha_cese > today || holderIds.has(p.id))
    .map((p) => ({ id: p.id as string, profesor: p.profesor as string, cesado: Boolean(p.fecha_cese && p.fecha_cese <= today) }));

  return (
    <ConfiguracionClient
      config={(config ?? []) as ConfigIntranet[]}
      perfiles={(perfiles ?? []) as Pick<Perfil, "id" | "nombre">[]}
      cargos={(cargos ?? []) as CargoDirectivo[]}
      profesores={profesoresOptions}
    />
  );
}

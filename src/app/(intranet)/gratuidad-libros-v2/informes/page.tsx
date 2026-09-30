import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { ROLES_OPERAR_V2 } from "@/lib/gratuidadV2/permisos";
import type { AlumnoPendienteV2, StockTituloV2 } from "@/lib/types/gratuidadV2";
import { InformesClient, type TabInforme } from "./InformesClient";

export const metadata = { title: "Informes · Gratuidad v2" };

interface Props {
  searchParams: Promise<{ tab?: string; bajas?: string }>;
}

const TABS: TabInforme[] = ["pendientes", "stock", "perdidos"];

export default async function InformesV2Page({ searchParams }: Props) {
  await requireRole(ROLES_OPERAR_V2);
  const params = await searchParams;
  const supabase = await createClient();

  // Groups offered in "Pendientes de devolver": only those with books still to return
  async function gruposConPendientes(): Promise<string[]> {
    const grupos = new Set<string>();
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.rpc("gplv2_alumnos_pendientes").select("grupo").range(from, from + 999);
      if (error) break;
      const filas = (data ?? []) as Pick<AlumnoPendienteV2, "grupo">[];
      filas.forEach((r) => { if (r.grupo) grupos.add(r.grupo); });
      if (filas.length < 1000) break;
    }
    return [...grupos].sort((a, b) => a.localeCompare(b, "es"));
  }

  const [{ data: stock }, grupos, { data: cursoEscolar }] = await Promise.all([
    supabase.rpc("gplv2_stock_titulos"),
    gruposConPendientes(),
    supabase.rpc("gplv2_curso_escolar_actual"),
  ]);

  const tab = TABS.includes(params.tab as TabInforme) ? (params.tab as TabInforme) : "pendientes";

  return (
    <InformesClient
      stock={(stock ?? []) as StockTituloV2[]}
      grupos={grupos}
      cursoEscolar={(cursoEscolar as string | null) ?? ""}
      inicial={{ tab, soloBajas: params.bajas === "1" }}
    />
  );
}

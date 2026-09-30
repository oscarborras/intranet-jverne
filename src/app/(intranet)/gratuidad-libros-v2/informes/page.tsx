import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { ROLES_OPERAR_V2 } from "@/lib/gratuidadV2/permisos";
import type { StockTituloV2 } from "@/lib/types/gratuidadV2";
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

  const [{ data: stock }, { data: grupos }, { data: cursoEscolar }] = await Promise.all([
    supabase.rpc("gplv2_stock_titulos"),
    supabase.from("cursos").select("nombre").order("nombre"),
    supabase.rpc("gplv2_curso_escolar_actual"),
  ]);

  const tab = TABS.includes(params.tab as TabInforme) ? (params.tab as TabInforme) : "pendientes";

  return (
    <InformesClient
      stock={(stock ?? []) as StockTituloV2[]}
      grupos={(grupos ?? []).map((g: { nombre: string }) => g.nombre)}
      cursoEscolar={(cursoEscolar as string | null) ?? ""}
      inicial={{ tab, soloBajas: params.bajas === "1" }}
    />
  );
}

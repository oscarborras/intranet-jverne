import Link from "next/link";
import { ArrowLeft, History } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { resolveAutorNames } from "@/lib/resolveAutorNames";
import { HISTORIAL_PAGE_SIZE, isValidDateStr, parsePage, sanitizeSearch } from "@/lib/peticiones";
import { HistorialFiltros } from "@/components/peticiones/HistorialFiltros";
import { HistorialPaginacion } from "@/components/peticiones/HistorialPaginacion";
import { HistorialTICClient } from "./HistorialTICClient";
import type { PeticionTIC, Perfil } from "@/lib/types";

export const dynamic = "force-dynamic";

const BASE_PATH = "/peticiones-tic/historial";

interface PageProps {
  searchParams: Promise<{ q?: string; desde?: string; hasta?: string; page?: string }>;
}

export default async function HistorialPeticionesTICPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const q = sanitizeSearch(sp.q);
  const desde = isValidDateStr(sp.desde) ? sp.desde : "";
  const hasta = isValidDateStr(sp.hasta) ? sp.hasta : "";
  const page = parsePage(sp.page);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: rolesData } = await supabase
    .from("user_roles_intranet")
    .select("perfiles_intranet(id, nombre, descripcion, created_at)")
    .eq("user_id", user!.id);

  const roles: Perfil[] = (rolesData ?? [])
    .map((r) => r.perfiles_intranet as unknown as Perfil)
    .filter(Boolean);

  const canManage = roles.some((r) => ["Admin", "TDE", "Soporte_TIC"].includes(r.nombre));
  const canDelete = roles.some((r) => ["Admin", "TDE"].includes(r.nombre));

  const from = (page - 1) * HISTORIAL_PAGE_SIZE;
  let query = supabase
    .from("peticiones_tic")
    .select("*", { count: "exact" })
    .eq("estado", "finalizada")
    .order("finalizada_at", { ascending: false })
    .range(from, from + HISTORIAL_PAGE_SIZE - 1);

  // Same visibility rule as the kanban
  if (!canManage) query = query.or(`solo_usuario.eq.false,autor_id.eq.${user!.id}`);
  if (q) query = query.or(`titulo.ilike.*${q}*,codigo.ilike.*${q}*,descripcion.ilike.*${q}*`);
  // Timestamps without offset are read in the DB timezone (Europe/Madrid)
  if (desde) query = query.gte("finalizada_at", `${desde}T00:00:00`);
  if (hasta) query = query.lte("finalizada_at", `${hasta}T23:59:59.999`);

  const { data: peticionesRaw, count } = await query;
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / HISTORIAL_PAGE_SIZE));

  const userNames = await resolveAutorNames(supabase, [
    ...(peticionesRaw ?? []).map((p) => p.autor_id as string),
    ...(peticionesRaw ?? []).filter((p) => p.asignado_id).map((p) => p.asignado_id as string),
  ]);

  const peticiones: PeticionTIC[] = (peticionesRaw ?? []).map((p) => ({
    ...p,
    autor: { full_name: userNames[p.autor_id] ?? "—" },
    asignado: p.asignado_id ? { full_name: userNames[p.asignado_id] ?? "—" } : undefined,
  })) as PeticionTIC[];

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <Link
          href="/peticiones-tic"
          className="inline-flex items-center gap-1.5 min-h-11 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={16} />
          Volver al tablero
        </Link>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <History size={22} className="text-blue-600" />
          Histórico de peticiones TIC
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {total} {total === 1 ? "petición finalizada" : "peticiones finalizadas"}
          {q || desde || hasta ? " con los filtros aplicados" : ""}
        </p>
      </div>

      <HistorialFiltros
        basePath={BASE_PATH}
        q={q}
        desde={desde}
        hasta={hasta}
        searchPlaceholder="Código, título o descripción"
      />

      {peticiones.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-10 bg-white rounded-xl border border-gray-200">
          No hay peticiones finalizadas que coincidan
        </p>
      ) : (
        <HistorialTICClient peticiones={peticiones} canManage={canManage} canDelete={canDelete} userId={user!.id} />
      )}

      <HistorialPaginacion basePath={BASE_PATH} page={page} totalPages={totalPages} params={{ q, desde, hasta }} />
    </div>
  );
}

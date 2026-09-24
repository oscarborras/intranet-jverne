import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, History } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { resolveAutorNames } from "@/lib/resolveAutorNames";
import { HISTORIAL_PAGE_SIZE, isValidDateStr, parsePage, sanitizeSearch } from "@/lib/peticiones";
import { HistorialFiltros } from "@/components/peticiones/HistorialFiltros";
import { HistorialPaginacion } from "@/components/peticiones/HistorialPaginacion";
import { HistorialCard } from "@/components/peticiones/HistorialCard";
import type { PeticionMantenimiento } from "@/lib/types";

export const dynamic = "force-dynamic";

const BASE_PATH = "/peticiones-mantenimiento/historial";

interface PageProps {
  searchParams: Promise<{ q?: string; desde?: string; hasta?: string; page?: string }>;
}

export default async function HistorialPeticionesMantenimientoPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const q = sanitizeSearch(sp.q);
  const desde = isValidDateStr(sp.desde) ? sp.desde : "";
  const hasta = isValidDateStr(sp.hasta) ? sp.hasta : "";
  const page = parsePage(sp.page);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const from = (page - 1) * HISTORIAL_PAGE_SIZE;
  let query = supabase
    .from("peticiones_mantenimiento")
    .select("*", { count: "exact" })
    .eq("estado", "finalizada")
    .order("finalizada_at", { ascending: false })
    .range(from, from + HISTORIAL_PAGE_SIZE - 1);

  if (q) query = query.or(`titulo.ilike.*${q}*,codigo.ilike.*${q}*,ubicacion.ilike.*${q}*,descripcion.ilike.*${q}*`);
  // Timestamps without offset are read in the DB timezone (Europe/Madrid)
  if (desde) query = query.gte("finalizada_at", `${desde}T00:00:00`);
  if (hasta) query = query.lte("finalizada_at", `${hasta}T23:59:59.999`);

  const { data: peticionesRaw, count } = await query;
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / HISTORIAL_PAGE_SIZE));

  const autorNames = await resolveAutorNames(supabase, (peticionesRaw ?? []).map((p) => p.autor_id as string));
  const peticiones = (peticionesRaw ?? []) as PeticionMantenimiento[];

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <Link
          href="/peticiones-mantenimiento"
          className="inline-flex items-center gap-1.5 min-h-11 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={16} />
          Volver al tablero
        </Link>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <History size={22} className="text-red-500" />
          Histórico de peticiones de mantenimiento
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
        searchPlaceholder="Código, título, ubicación o descripción"
      />

      {peticiones.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-10 bg-white rounded-xl border border-gray-200">
          No hay peticiones finalizadas que coincidan
        </p>
      ) : (
        <div className="space-y-2">
          {peticiones.map((p) => (
            <HistorialCard
              key={p.id}
              codigo={p.codigo}
              titulo={p.titulo}
              prioridad={p.prioridad}
              autorName={autorNames[p.autor_id] ?? "—"}
              ubicacion={p.ubicacion}
              descripcion={p.descripcion}
              fotoPath={p.foto_path}
              fotoNombre={p.foto_nombre}
              createdAt={p.created_at}
              finalizadaAt={p.finalizada_at}
            />
          ))}
        </div>
      )}

      <HistorialPaginacion basePath={BASE_PATH} page={page} totalPages={totalPages} params={{ q, desde, hasta }} />
    </div>
  );
}

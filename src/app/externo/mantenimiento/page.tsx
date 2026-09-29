import { createAdminClient } from "@/lib/supabase/admin";
import { requireExterno } from "@/lib/externo";
import { DIAS_FINALIZADAS_PORTAL, ESTADOS_PORTAL_ACTIVOS } from "@/lib/externoMantenimiento";
import { PortalMantenimientoClient, type PeticionPortal } from "./PortalMantenimientoClient";
import type { PeticionMantenimientoEstado, PeticionPrioridad } from "@/lib/types";

export const dynamic = "force-dynamic";

const FOTO_URL_TTL_SECONDS = 60 * 60;

export default async function PortalMantenimientoPage() {
  const session = await requireExterno();
  const admin = createAdminClient();

  const desde = new Date(Date.now() - DIAS_FINALIZADAS_PORTAL * 24 * 60 * 60 * 1000).toISOString();
  const campos = "id, codigo, titulo, descripcion, ubicacion, prioridad, estado, created_at, finalizada_at, foto_path, foto_nombre";

  // Only validated requests (never "por validar", rejected or deleted ones), and never
  // the ones the school has hidden from the external technician
  const [{ data: activas }, { data: finalizadas }] = await Promise.all([
    admin.from("peticiones_mantenimiento").select(campos).in("estado", ESTADOS_PORTAL_ACTIVOS).eq("oculta_externo", false).order("created_at", { ascending: true }),
    admin.from("peticiones_mantenimiento").select(campos).eq("estado", "finalizada").gte("finalizada_at", desde).eq("oculta_externo", false).order("finalizada_at", { ascending: false }),
  ]);
  const rows = [...(activas ?? []), ...(finalizadas ?? [])];
  const ids = rows.map((r) => r.id as number);

  const [{ data: notas }, fotoUrls] = await Promise.all([
    ids.length > 0
      ? admin
          .from("peticiones_mantenimiento_notas")
          .select("id, peticion_id, autor_nombre, contenido, created_at")
          .in("peticion_id", ids)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as { id: number; peticion_id: number; autor_nombre: string; contenido: string; created_at: string }[] }),
    // Signed on the server: the technician's browser has no storage access of its own
    Promise.all(
      rows.map(async (r) => {
        if (!r.foto_path) return null;
        const { data } = await admin.storage.from("incidencias").createSignedUrl(r.foto_path as string, FOTO_URL_TTL_SECONDS);
        return data?.signedUrl ?? null;
      })
    ),
  ]);

  const peticiones: PeticionPortal[] = rows.map((r, i) => ({
    id: r.id as number,
    codigo: r.codigo as string,
    titulo: r.titulo as string,
    descripcion: (r.descripcion as string | null) ?? "",
    ubicacion: (r.ubicacion as string | null) ?? "",
    prioridad: r.prioridad as PeticionPrioridad,
    estado: r.estado as PeticionMantenimientoEstado,
    created_at: r.created_at as string,
    finalizada_at: (r.finalizada_at as string | null) ?? null,
    fotoUrl: fotoUrls[i],
    fotoNombre: (r.foto_nombre as string | null) ?? null,
    notas: (notas ?? [])
      .filter((n) => n.peticion_id === r.id)
      .map((n) => ({ id: n.id as number, autor: n.autor_nombre as string, contenido: n.contenido as string, created_at: n.created_at as string })),
  }));

  return <PortalMantenimientoClient peticiones={peticiones} nombre={session.nombre} email={session.email} />;
}

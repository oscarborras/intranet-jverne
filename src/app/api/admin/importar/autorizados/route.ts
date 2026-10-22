import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayMadrid } from "@/lib/dates";
import { authorizeApi } from "@/lib/auth";
import type { AutorizadoImport } from "@/lib/import/autorizados";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function texto(valor: unknown, max: number): string | null {
  return typeof valor === "string" && valor.trim() ? valor.trim().slice(0, max) : null;
}

export async function POST(req: NextRequest) {
  const auth = await authorizeApi(["Admin"]);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null) as { autorizados?: unknown } | null;
  if (!body || !Array.isArray(body.autorizados)) {
    return NextResponse.json({ error: "Petición inválida" }, { status: 400 });
  }

  const filas: AutorizadoImport[] = [];
  for (const raw of body.autorizados as Record<string, unknown>[]) {
    const nombre = texto(raw?.nombre, 200);
    if (typeof raw?.alumno_id !== "string" || !UUID_RE.test(raw.alumno_id) || !nombre) continue;
    const fecha = texto(raw.fecha_alta, 40);
    filas.push({
      alumno_id: raw.alumno_id,
      nombre,
      dni: texto(raw.dni, 30),
      telefono: texto(raw.telefono, 40),
      usuario_alta: texto(raw.usuario_alta, 200),
      fecha_alta: fecha && !Number.isNaN(Date.parse(fecha)) ? fecha : null,
    });
  }

  if (filas.length === 0) {
    return NextResponse.json({ error: "El fichero no contiene ninguna persona autorizada válida." }, { status: 400 });
  }

  const admin = createAdminClient();
  // Single transaction: deletes every row (imported and manual) and inserts the new ones
  const { data, error } = await admin.rpc("autorizados_reemplazar", { p_filas: filas });
  if (error) return NextResponse.json({ error: `Error al importar: ${error.message}` }, { status: 500 });

  await admin
    .from("config_intranet")
    .update({ valor: todayMadrid(), updated_at: new Date().toISOString() })
    .eq("clave", "ultima_importacion_autorizados");

  return NextResponse.json({ success: true, insertados: (data as number | null) ?? filas.length });
}

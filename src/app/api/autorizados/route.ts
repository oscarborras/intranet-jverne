import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authorizeApi } from "@/lib/auth";
import { AUTORIZADO_SELECT } from "@/lib/autorizados";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function texto(valor: unknown, max: number): string | null {
  return typeof valor === "string" && valor.trim() ? valor.replace(/\s+/g, " ").trim().slice(0, max) : null;
}

/** Manual addition of an authorised person (Admin / Directiva) */
export async function POST(req: NextRequest) {
  const auth = await authorizeApi(["Admin", "Directiva"]);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const alumnoId = body?.alumno_id;
  const nombre = texto(body?.nombre, 200);
  if (typeof alumnoId !== "string" || !UUID_RE.test(alumnoId)) {
    return NextResponse.json({ error: "Alumno no válido" }, { status: 400 });
  }
  if (!nombre) return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });

  const dni = texto(body?.dni, 30)?.replace(/\s+/g, "").toUpperCase() ?? null;
  const metadata = auth.user.user_metadata as { full_name?: string; name?: string } | undefined;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("autorizados_recogida")
    .insert({
      alumno_id: alumnoId,
      nombre,
      dni,
      telefono: texto(body?.telefono, 40),
      origen: "manual",
      usuario_alta: metadata?.full_name ?? metadata?.name ?? auth.user.email ?? null,
      fecha_alta: new Date().toISOString(),
      created_by: auth.user.id,
    })
    .select(AUTORIZADO_SELECT)
    .single();

  if (error) return NextResponse.json({ error: `No se ha podido guardar: ${error.message}` }, { status: 500 });
  return NextResponse.json({ success: true, autorizado: data });
}

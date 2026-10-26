import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authorizeApi } from "@/lib/auth";
import { isAusenciaMotivo } from "@/lib/ausencias";
import type { AusenciaMotivo } from "@/lib/types";

export async function PATCH(req: NextRequest) {
  const auth = await authorizeApi();
  if (!auth.ok) return auth.response;
  const { user, roleNames } = auth;
  const canManageAll = roleNames.some((r) => ["Admin", "Directiva"].includes(r));
  const supabase = await createClient();

  const body = await req.json() as {
    id: number;
    fecha: string;
    tramo_id: number;
    curso_id: number | null;
    aula: string | null;
    tareas: string | null;
    observaciones: string | null;
    motivo: AusenciaMotivo;
    adjunto_path: string | null;
    adjunto_nombre: string | null;
  };

  if (!body.id || !body.fecha || !body.tramo_id || !body.curso_id) {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
  }
  if (!isAusenciaMotivo(body.motivo)) {
    return NextResponse.json({ error: "Indica un motivo válido" }, { status: 400 });
  }

  const { data: myProfesorRow } = await supabase
    .from("profesores")
    .select("id")
    .ilike("email", user.email!)
    .single();
  const myProfesorId = myProfesorRow?.id;
  if (!myProfesorId && !canManageAll) return NextResponse.json({ error: "Profesor no encontrado" }, { status: 403 });

  let query = supabase
    .from("ausencias_profesorado")
    .update({
      fecha: body.fecha,
      tramo_id: body.tramo_id,
      curso_id: body.curso_id,
      aula: body.aula?.trim() || null,
      tareas: body.tareas?.trim() || null,
      observaciones: body.observaciones?.trim() || null,
      adjunto_path: body.adjunto_path ?? null,
      adjunto_nombre: body.adjunto_nombre ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.id)
    .eq("estado", "activa");

  // Directiva/Admin can modify any absence; everyone else only their own
  if (!canManageAll) query = query.eq("profesor_id", myProfesorId);

  const { data: updated, error } = await query.select("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: "Ausencia no encontrada o no autorizada" }, { status: 404 });
  }

  // The absence update above already checked ownership; RLS on ausencias_motivos checks it again
  const { error: motivoError } = await supabase
    .from("ausencias_motivos")
    .upsert({ ausencia_id: body.id, motivo: body.motivo, updated_at: new Date().toISOString() });
  if (motivoError) return NextResponse.json({ error: motivoError.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

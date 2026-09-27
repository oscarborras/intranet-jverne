import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authorizeApi } from "@/lib/auth";

export async function PATCH(req: NextRequest) {
  const auth = await authorizeApi();
  if (!auth.ok) return auth.response;
  const { user, roleNames } = auth;
  const canManageAll = roleNames.some((r) => ["Admin", "Directiva"].includes(r));
  const supabase = await createClient();

  const { id } = await req.json() as { id: number };
  if (!id) return NextResponse.json({ error: "Falta el id" }, { status: 400 });

  const { data: myProfesorRow } = await supabase
    .from("profesores")
    .select("id")
    .ilike("email", user.email!)
    .single();
  const myProfesorId = myProfesorRow?.id;
  if (!myProfesorId && !canManageAll) return NextResponse.json({ error: "Profesor no encontrado" }, { status: 403 });

  let query = supabase
    .from("ausencias_profesorado")
    .update({ estado: "cancelada", updated_at: new Date().toISOString() })
    .eq("id", id);

  // Directiva/Admin can cancel any absence; everyone else only their own
  if (!canManageAll) query = query.eq("profesor_id", myProfesorId);

  const { data: updated, error } = await query.select("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: "Ausencia no encontrada o no autorizada" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

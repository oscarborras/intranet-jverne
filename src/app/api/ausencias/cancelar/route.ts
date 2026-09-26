import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authorizeApi } from "@/lib/auth";

export async function PATCH(req: NextRequest) {
  const auth = await authorizeApi();
  if (!auth.ok) return auth.response;
  const { user } = auth;
  const supabase = await createClient();

  const { id } = await req.json() as { id: number };
  if (!id) return NextResponse.json({ error: "Falta el id" }, { status: 400 });

  const { data: myProfesorRow } = await supabase
    .from("profesores")
    .select("id")
    .ilike("email", user.email!)
    .single();
  const myProfesorId = myProfesorRow?.id;
  if (!myProfesorId) return NextResponse.json({ error: "Profesor no encontrado" }, { status: 403 });

  const { error } = await supabase
    .from("ausencias_profesorado")
    .update({ estado: "cancelada", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("profesor_id", myProfesorId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

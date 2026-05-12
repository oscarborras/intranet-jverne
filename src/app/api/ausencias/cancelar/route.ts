import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json() as { id: number };
  if (!id) return NextResponse.json({ error: "Falta el id" }, { status: 400 });

  const { error } = await supabase
    .from("ausencias_profesorado")
    .update({ estado: "cancelada", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("profesor_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

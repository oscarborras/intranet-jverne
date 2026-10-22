import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authorizeApi } from "@/lib/auth";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Removes an authorised person (Admin / Directiva) */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeApi(["Admin", "Directiva"]);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("autorizados_recogida")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) return NextResponse.json({ error: `No se ha podido eliminar: ${error.message}` }, { status: 500 });
  if (!count) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ success: true });
}

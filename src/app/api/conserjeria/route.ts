import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authorizeApi } from "@/lib/auth";
import { todayMadrid } from "@/lib/dates";
import { ESTADO_CONSERJERIA_SELECT } from "@/lib/conserjeria";

/** Sets today's number of caretakers on duty (Ordenanza / Directiva / Admin) */
export async function POST(req: NextRequest) {
  const auth = await authorizeApi(["Ordenanza", "Directiva", "Admin"]);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const num = body?.num_ordenanzas;
  if (num !== 1 && num !== 2 && num !== 3) {
    return NextResponse.json({ error: "Número de ordenanzas no válido" }, { status: 400 });
  }

  const metadata = auth.user.user_metadata as { full_name?: string; name?: string } | undefined;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("estado_conserjeria")
    .upsert(
      {
        fecha: todayMadrid(),
        num_ordenanzas: num,
        updated_by: auth.user.id,
        updated_by_nombre: metadata?.full_name ?? metadata?.name ?? auth.user.email ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "fecha" }
    )
    .select(ESTADO_CONSERJERIA_SELECT)
    .single();

  if (error) return NextResponse.json({ error: `No se ha podido guardar: ${error.message}` }, { status: 500 });
  return NextResponse.json({ success: true, estado: data });
}

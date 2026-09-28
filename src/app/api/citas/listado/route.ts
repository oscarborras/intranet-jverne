import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizeApi } from "@/lib/auth";
import { getProfesorIdByEmail, isAdminCitas, loadCitasFamilias } from "@/lib/citasFamilias";

export const dynamic = "force-dynamic";

// Fresh appointment list, requested by the page when the user switches tabs
export async function GET() {
  const auth = await authorizeApi();
  if (!auth.ok) return auth.response;

  const supabase = await createClient();
  const admin = createAdminClient();
  const profesorId = await getProfesorIdByEmail(admin, auth.user.email);
  const data = await loadCitasFamilias(supabase, admin, { profesorId, isAdmin: isAdminCitas(auth.roleNames) });

  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}

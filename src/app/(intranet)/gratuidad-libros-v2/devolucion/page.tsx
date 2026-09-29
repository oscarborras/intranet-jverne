import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { ROLES_OPERAR_V2 } from "@/lib/gratuidadV2/permisos";
import { DevolucionClient } from "./DevolucionClient";

export const metadata = { title: "Devolución · Gratuidad v2" };

export default async function DevolucionV2Page() {
  const { user } = await requireRole(ROLES_OPERAR_V2);
  const supabase = await createClient();

  const [{ data: cursoEscolar }, { data: profesor }] = await Promise.all([
    supabase.rpc("gplv2_curso_escolar_actual"),
    supabase.from("profesores").select("profesor").ilike("email", user.email ?? "").maybeSingle(),
  ]);

  return (
    <DevolucionClient
      cursoEscolar={(cursoEscolar as string | null) ?? ""}
      profesorNombre={(profesor as { profesor: string } | null)?.profesor ?? user.email ?? ""}
    />
  );
}

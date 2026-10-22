import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { canAccessModule } from "@/lib/modulos";
import { ALUMNO_AUTORIZADOS_SELECT, type AlumnoConAutorizados } from "@/lib/autorizados";
import { AutorizadosClient } from "./AutorizadosClient";

export const metadata = { title: "Autorizados a recoger" };

export default async function AutorizadosPage() {
  const { user, roleNames } = await requireAuth();
  const supabase = await createClient();

  if (!(await canAccessModule(supabase, user.id, "autorizados"))) redirect("/dashboard");

  // Active students only (left students have estado_matricula set or no group)
  const alumnos: AlumnoConAutorizados[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("alumnos")
      .select(ALUMNO_AUTORIZADOS_SELECT)
      .is("estado_matricula", null)
      .neq("unidad", "")
      .order("alumno")
      .range(from, from + 999);
    if (error) break;
    const filas = (data ?? []) as unknown as AlumnoConAutorizados[];
    alumnos.push(...filas);
    if (filas.length < 1000) break;
  }
  for (const a of alumnos) a.autorizados_recogida.sort((x, y) => x.nombre.localeCompare(y.nombre, "es"));

  const puedeGestionar = roleNames.some((r) => r === "Admin" || r === "Directiva");

  return <AutorizadosClient alumnosIniciales={alumnos} puedeGestionar={puedeGestionar} />;
}

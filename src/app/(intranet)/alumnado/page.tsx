import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { canAccessModule } from "@/lib/modulos";
import { ALUMNO_FICHA_SELECT, type AlumnoFicha } from "@/lib/alumnado";
import { AlumnadoClient } from "./AlumnadoClient";

export const metadata = { title: "Alumnado" };

export default async function AlumnadoPage() {
  const { user } = await requireAuth();
  const supabase = await createClient();

  // Contact details of families: only profiles allowed in Administración → Módulos
  if (!(await canAccessModule(supabase, user.id, "alumnado"))) redirect("/dashboard");

  const alumnos: AlumnoFicha[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("alumnos")
      .select(ALUMNO_FICHA_SELECT)
      .order("alumno")
      .range(from, from + 999);
    if (error) break;
    const filas = (data ?? []) as unknown as AlumnoFicha[];
    alumnos.push(...filas);
    if (filas.length < 1000) break;
  }

  return <AlumnadoClient alumnos={alumnos} />;
}

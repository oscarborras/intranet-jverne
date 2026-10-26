import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { getModuleAccess } from "@/lib/modulos";
import { ALUMNO_FICHA_CON_AUTORIZADOS_SELECT, ALUMNO_FICHA_SELECT, type AlumnoFicha } from "@/lib/alumnado";
import { getUltimasImportaciones } from "@/lib/import/ultimaImportacion";
import { AlumnadoClient } from "./AlumnadoClient";

export const metadata = { title: "Alumnado" };

export default async function AlumnadoPage() {
  const { user, roleNames } = await requireAuth();
  const supabase = await createClient();

  // Contact details of families: only profiles allowed in Administración → Módulos
  const { isAdmin, inactiveModuleSlugs } = await getModuleAccess(supabase, user.id);
  if (!isAdmin && inactiveModuleSlugs.includes("alumnado")) redirect("/dashboard");

  // People authorised to pick students up: a section of each card, gated by its own module
  const verAutorizados = isAdmin || !inactiveModuleSlugs.includes("autorizados");
  const puedeGestionarAutorizados = verAutorizados && roleNames.some((r) => r === "Admin" || r === "Directiva");

  const ultimasImportacionesPromise = getUltimasImportaciones(
    supabase,
    verAutorizados ? ["alumnos", "autorizados"] : ["alumnos"],
  );

  const alumnos: AlumnoFicha[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("alumnos")
      .select(verAutorizados ? ALUMNO_FICHA_CON_AUTORIZADOS_SELECT : ALUMNO_FICHA_SELECT)
      .order("alumno")
      .range(from, from + 999);
    if (error) break;
    const filas = (data ?? []) as unknown as AlumnoFicha[];
    alumnos.push(...filas);
    if (filas.length < 1000) break;
  }
  for (const a of alumnos) a.autorizados_recogida?.sort((x, y) => x.nombre.localeCompare(y.nombre, "es"));
  const ultimasImportaciones = await ultimasImportacionesPromise;

  return (
    <AlumnadoClient
      alumnosIniciales={alumnos}
      verAutorizados={verAutorizados}
      puedeGestionarAutorizados={puedeGestionarAutorizados}
      ultimasImportaciones={ultimasImportaciones}
    />
  );
}

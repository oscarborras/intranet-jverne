import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SeguimientoClient } from "./SeguimientoClient";
import type { PrestamoLibro } from "@/lib/types";

export default async function SeguimientoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rolesData } = await supabase
    .from("user_roles_intranet")
    .select("perfiles_intranet!inner(nombre)")
    .eq("user_id", user.id);

  const roleNames = (rolesData ?? []).map(
    (r) => (r.perfiles_intranet as unknown as { nombre: string }).nombre
  );
  const canManage = roleNames.some((r) => ["Admin", "Directiva", "Coord_Gratuidad"].includes(r));
  if (!canManage) redirect("/gratuidad-libros");

  const now = new Date();
  const year = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  const cursoEscolarActual = `${year}-${year + 1}`;

  // All loans for current year
  const { data: rawPrestamos } = await supabase
    .from("prestamos_libros")
    .select("*, libro:libros_catalogo(titulo, asignatura, nivel)")
    .eq("curso_escolar", cursoEscolarActual)
    .order("alumno_grupo")
    .order("alumno_nombre");

  let prestamos: PrestamoLibro[] = [];
  if (rawPrestamos && rawPrestamos.length > 0) {
    const allProfesorIds = [
      ...new Set([
        ...rawPrestamos.map((p) => p.entregado_por as string),
        ...rawPrestamos.filter((p) => p.devuelto_por).map((p) => p.devuelto_por as string),
      ]),
    ];
    const { data: profData } = await supabase
      .from("profesores")
      .select("id, profesor")
      .in("id", allProfesorIds);
    const nameMap = Object.fromEntries(
      (profData ?? []).map((p) => [p.id as string, p.profesor as string])
    );
    prestamos = rawPrestamos.map((p) => ({
      ...p,
      libro: p.libro as { titulo: string; asignatura: string; nivel: string },
      entregado_por_nombre: { profesor: nameMap[p.entregado_por as string] ?? "—" },
      devuelto_por_nombre: p.devuelto_por
        ? { profesor: nameMap[p.devuelto_por as string] ?? "—" }
        : undefined,
    }));
  }

  return (
    <SeguimientoClient
      prestamos={prestamos}
      cursoEscolarActual={cursoEscolarActual}
    />
  );
}

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CatalogoLibrosClient } from "./CatalogoLibrosClient";

export const metadata = { title: "Inventario de libros" };
import type { LibroCatalogo, PrestamoLibro } from "@/lib/types";

export default async function CatalogoLibrosPage() {
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
  const canManage = roleNames.some((r) => ["Admin", "Directiva"].includes(r));

  if (!canManage) redirect("/gratuidad-libros");

  const now = new Date();
  const year = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  const cursoEscolarActual = `${year}-${year + 1}`;

  const [{ data: libros }, { data: prestamosData }] = await Promise.all([
    supabase
      .from("libros_catalogo")
      .select("*")
      .order("nivel")
      .order("asignatura")
      .order("titulo"),

    supabase
      .from("prestamos_libros")
      .select("id, libro_id, alumno_id, alumno_nombre, alumno_grupo, num_ejemplar, fecha_prestamo, entregado_por, devuelto_por, curso_escolar, fecha_devolucion, estado_devolucion, observaciones, created_at")
      .eq("curso_escolar", cursoEscolarActual)
      .is("fecha_devolucion", null),
  ]);

  return (
    <CatalogoLibrosClient
      libros={(libros ?? []) as LibroCatalogo[]}
      prestamos={(prestamosData ?? []) as PrestamoLibro[]}
    />
  );
}

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { GratuidadLibrosClient } from "./GratuidadLibrosClient";
import type { PrestamoLibro, LibroCatalogo, Alumno } from "@/lib/types";

export default async function GratuidadLibrosPage() {
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
  const canManageInventario = roleNames.some((r) => ["Admin", "Directiva"].includes(r));

  const now = new Date();
  const year = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  const cursoEscolarActual = `${year}-${year + 1}`;

  const [
    { data: myProfesor },
    { data: rawPrestamosActivos },
    { data: todosLibros },
    { data: rawTodosPrestamos },
    { data: profesoresData },
    { data: alumnosData },
    { data: cursosGratuidadData },
    { data: completadosData },
  ] = await Promise.all([
    supabase.from("profesores").select("id, profesor").ilike("email", user.email!).single(),

    // Active loans — includes alumno_id for the new batch system
    supabase
      .from("prestamos_libros")
      .select("id, libro_id, alumno_id, alumno_nombre, alumno_grupo, num_ejemplar, fecha_prestamo, entregado_por, devuelto_por, curso_escolar, fecha_devolucion, estado_devolucion, observaciones, created_at, libro:libros_catalogo(titulo, asignatura, nivel)")
      .eq("curso_escolar", cursoEscolarActual)
      .is("fecha_devolucion", null)
      .order("alumno_grupo")
      .order("alumno_nombre"),

    // Full catalog (incl. inactive) for Inventario tab (Admin/Directiva only)
    canManageInventario
      ? supabase.from("libros_catalogo").select("*").order("nivel").order("asignatura").order("titulo")
      : supabase.from("libros_catalogo").select("*").eq("activo", true).order("nivel").order("asignatura").order("titulo"),

    // All loans for year for Seguimiento tab
    canManage
      ? supabase
          .from("prestamos_libros")
          .select("id, libro_id, alumno_id, alumno_nombre, alumno_grupo, num_ejemplar, fecha_prestamo, entregado_por, devuelto_por, curso_escolar, fecha_devolucion, estado_devolucion, observaciones, created_at, libro:libros_catalogo(titulo, asignatura, nivel)")
          .eq("curso_escolar", cursoEscolarActual)
          .order("alumno_grupo")
          .order("alumno_nombre")
      : Promise.resolve({ data: [] }),

    // Active professors
    supabase
      .from("profesores")
      .select("id, profesor")
      .or(`fecha_cese.is.null,fecha_cese.gt.${cursoEscolarActual.split("-")[1]}-08-31`)
      .order("profesor"),

    // Active students (estado_matricula IS NULL, unidad not empty)
    supabase
      .from("alumnos")
      .select("id, alumno, nombre, primer_apellido, segundo_apellido, unidad")
      .is("estado_matricula", null)
      .neq("unidad", "")
      .order("unidad")
      .order("primer_apellido")
      .order("segundo_apellido"),

    // Cursos que participan en el programa de gratuidad
    supabase
      .from("cursos")
      .select("nombre")
      .eq("gratuidad", true)
      .order("nombre"),

    // Alumnos marcados manualmente como lote completo
    supabase
      .from("gratuidad_lote_completado")
      .select("alumno_id")
      .eq("curso_escolar", cursoEscolarActual),
  ]);

  const myProfesorId: string | null = myProfesor?.id ?? null;
  const unidadesGratuidad = (cursosGratuidadData ?? []).map((c) => c.nombre as string);
  const completadosIniciales = (completadosData ?? []).map((c) => c.alumno_id as string);

  // Resolve professor names
  const allProfesorIds = [
    ...new Set([
      ...(rawPrestamosActivos ?? []).map((p) => p.entregado_por as string),
      ...(rawTodosPrestamos ?? []).map((p) => p.entregado_por as string),
      ...(rawTodosPrestamos ?? []).filter((p) => p.devuelto_por).map((p) => p.devuelto_por as string),
    ]),
  ];

  let nameMap: Record<string, string> = {};
  if (allProfesorIds.length > 0) {
    const { data: profData } = await supabase
      .from("profesores")
      .select("id, profesor")
      .in("id", allProfesorIds);
    nameMap = Object.fromEntries(
      (profData ?? []).map((p) => [p.id as string, p.profesor as string])
    );
  }

  const prestamos: PrestamoLibro[] = (rawPrestamosActivos ?? []).map((p) => ({
    ...p,
    libro: p.libro as unknown as { titulo: string; asignatura: string; nivel: string },
    entregado_por_nombre: { profesor: nameMap[p.entregado_por as string] ?? "—" },
  }));

  const todosPrestamos: PrestamoLibro[] = (rawTodosPrestamos ?? []).map((p) => ({
    ...p,
    libro: p.libro as unknown as { titulo: string; asignatura: string; nivel: string },
    entregado_por_nombre: { profesor: nameMap[p.entregado_por as string] ?? "—" },
    devuelto_por_nombre: p.devuelto_por
      ? { profesor: nameMap[p.devuelto_por as string] ?? "—" }
      : undefined,
  }));

  const profesores = (profesoresData ?? []).map((p) => ({
    id: p.id as string,
    nombre: p.profesor as string,
  }));

  return (
    <GratuidadLibrosClient
      prestamos={prestamos}
      todosPrestamos={todosPrestamos}
      libros={(todosLibros ?? []) as LibroCatalogo[]}
      alumnos={(alumnosData ?? []) as Alumno[]}
      cursoEscolarActual={cursoEscolarActual}
      myProfesorId={myProfesorId}
      canManage={canManage}
      canManageInventario={canManageInventario}
      profesores={profesores}
      unidadesGratuidad={unidadesGratuidad}
      completadosIniciales={completadosIniciales}
    />
  );
}

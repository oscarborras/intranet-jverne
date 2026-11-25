import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { ROLES_GESTIONAR_V2 } from "@/lib/gratuidadV2/permisos";
import type { ResumenTituloV2, TituloCursoV2, TituloV2 } from "@/lib/types/gratuidadV2";
import { contarAlumnosPorGrupo } from "@/lib/gratuidadV2/grupos";
import { TitulosClient } from "./TitulosClient";

export const metadata = { title: "Títulos · Gratuidad v2" };

export default async function TitulosV2Page() {
  await requireRole(ROLES_GESTIONAR_V2, "/gratuidad-libros-v2");
  const supabase = await createClient();

  const [{ data: titulos }, { data: lotes }, { data: resumen }, { data: todosCursos }, alumnosPorCurso] = await Promise.all([
    supabase.from("gplv2_titulos").select("*").order("titulo"),
    supabase.from("gplv2_titulo_cursos").select("*"),
    supabase.rpc("gplv2_resumen_titulos"),
    supabase.from("cursos").select("nombre, gratuidad").not("nombre", "in", "(Guardia,Otros)").order("nombre"),
    contarAlumnosPorGrupo(supabase),
  ]);

  // Programme courses first; every other course can also be given a lot
  const filas = (todosCursos ?? []) as { nombre: string; gratuidad: boolean | null }[];
  const cursos = filas.filter((c) => c.gratuidad).map((c) => c.nombre);
  const otrosCursos = filas.filter((c) => !c.gratuidad).map((c) => c.nombre);

  return (
    <TitulosClient
      titulos={(titulos ?? []) as TituloV2[]}
      lotes={(lotes ?? []) as TituloCursoV2[]}
      resumen={(resumen ?? []) as ResumenTituloV2[]}
      cursos={cursos}
      otrosCursos={otrosCursos}
      alumnosPorCurso={alumnosPorCurso}
    />
  );
}

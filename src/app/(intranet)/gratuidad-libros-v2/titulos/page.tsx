import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { ROLES_GESTIONAR_V2 } from "@/lib/gratuidadV2/permisos";
import type { ResumenTituloV2, TituloCursoV2, TituloV2 } from "@/lib/types/gratuidadV2";
import { TitulosClient } from "./TitulosClient";

export const metadata = { title: "Títulos · Gratuidad v2" };

export default async function TitulosV2Page() {
  await requireRole(ROLES_GESTIONAR_V2, "/gratuidad-libros-v2");
  const supabase = await createClient();

  const [{ data: titulos }, { data: lotes }, { data: resumen }, { data: cursosGratuidad }] = await Promise.all([
    supabase.from("gplv2_titulos").select("*").order("titulo"),
    supabase.from("gplv2_titulo_cursos").select("*"),
    supabase.rpc("gplv2_resumen_titulos"),
    supabase.from("cursos").select("nombre").eq("gratuidad", true).order("nombre"),
  ]);

  // Courses in the programme; if none is flagged yet, offer every course
  let cursos = (cursosGratuidad ?? []).map((c: { nombre: string }) => c.nombre);
  if (cursos.length === 0) {
    const { data: todos } = await supabase.from("cursos").select("nombre").order("nombre");
    cursos = (todos ?? []).map((c: { nombre: string }) => c.nombre);
  }

  return (
    <TitulosClient
      titulos={(titulos ?? []) as TituloV2[]}
      lotes={(lotes ?? []) as TituloCursoV2[]}
      resumen={(resumen ?? []) as ResumenTituloV2[]}
      cursos={cursos}
    />
  );
}

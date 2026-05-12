import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AusenciasClient } from "./AusenciasClient";
import type { AusenciaProfesorado, TramoHorario, Curso } from "@/lib/types";

export default async function AusenciasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Role check
  const { data: rolesData } = await supabase
    .from("user_roles_intranet")
    .select("perfiles_intranet!inner(nombre)")
    .eq("user_id", user.id);

  const roleNames = (rolesData ?? []).map(
    (r) => (r.perfiles_intranet as unknown as { nombre: string }).nombre
  );
  const canViewGuardia = roleNames.some((r) => ["Admin", "Directiva", "Guardia"].includes(r));

  // Fetch supporting data for the form
  const [{ data: tramos }, { data: cursos }, { data: myProfile }] = await Promise.all([
    supabase.from("tramos_horarios").select("*").order("orden"),
    supabase.from("cursos").select("id, nombre, email_tutor").order("nombre"),
    supabase.from("users_view").select("full_name").eq("id", user.id).single(),
  ]);

  // Fetch teacher's own absences (last 60 days + future)
  const since = new Date();
  since.setDate(since.getDate() - 60);
  const { data: rawMisAusencias } = await supabase
    .from("ausencias_profesorado")
    .select("*, tramos_horarios(id, nombre, hora_inicio, hora_fin, es_recreo, orden), cursos(id, nombre, email_tutor)")
    .eq("profesor_id", user.id)
    .gte("fecha", since.toISOString().split("T")[0])
    .order("fecha", { ascending: false });

  const misAusencias: AusenciaProfesorado[] = (rawMisAusencias ?? []).map((a) => ({
    ...a,
    profesor: { full_name: myProfile?.full_name ?? "—" },
  }));

  // Fetch today's absences for guardia view
  let guardiaAusencias: AusenciaProfesorado[] = [];
  if (canViewGuardia) {
    const today = new Date().toISOString().split("T")[0];
    const { data: rawGuardia } = await supabase
      .from("ausencias_profesorado")
      .select("*, tramos_horarios(id, nombre, hora_inicio, hora_fin, es_recreo, orden), cursos(id, nombre, email_tutor)")
      .eq("fecha", today)
      .eq("estado", "activa")
      .order("tramo_id");

    if (rawGuardia && rawGuardia.length > 0) {
      const ids = [...new Set(rawGuardia.map((a) => a.profesor_id as string))];
      const { data: profiles } = await supabase
        .from("users_view")
        .select("id, full_name")
        .in("id", ids);
      const nameMap = Object.fromEntries(
        (profiles ?? []).map((p) => [p.id, p.full_name as string])
      );
      guardiaAusencias = rawGuardia.map((a) => ({
        ...a,
        profesor: { full_name: nameMap[a.profesor_id as string] ?? "—" },
      }));
    }
  }

  return (
    <AusenciasClient
      misAusencias={misAusencias}
      guardiaAusencias={canViewGuardia ? guardiaAusencias : null}
      tramos={(tramos ?? []) as TramoHorario[]}
      cursos={(cursos ?? []) as Curso[]}
      userId={user.id}
      canViewGuardia={canViewGuardia}
    />
  );
}

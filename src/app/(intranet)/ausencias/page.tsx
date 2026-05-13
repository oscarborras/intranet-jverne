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
  const canManageAll = roleNames.some((r) => ["Admin", "Directiva"].includes(r));

  // Fetch supporting data for the form
  const _since = new Date();
  _since.setDate(_since.getDate() - 60);
  const sinceStr = `${_since.getFullYear()}-${String(_since.getMonth() + 1).padStart(2, "0")}-${String(_since.getDate()).padStart(2, "0")}`;

  const [{ data: tramos }, { data: cursos }, { data: myProfesorRow }] = await Promise.all([
    supabase.from("tramos_horarios").select("*").order("orden"),
    supabase.from("cursos").select("id, nombre, email_tutor").order("nombre"),
    supabase.from("profesores").select("id, profesor").ilike("email", user.email!).single(),
  ]);

  const myProfesorId: string | null = myProfesorRow?.id ?? null;

  // Fetch teacher's own absences (last 60 days + future)
  let misAusencias: AusenciaProfesorado[] = [];
  if (myProfesorId) {
    const { data: rawMisAusencias } = await supabase
      .from("ausencias_profesorado")
      .select("*, tramos_horarios(id, nombre, hora_inicio, hora_fin, es_recreo, orden), cursos(id, nombre, email_tutor)")
      .eq("profesor_id", myProfesorId)
      .gte("fecha", sinceStr)
      .order("fecha", { ascending: false });

    misAusencias = (rawMisAusencias ?? []).map((a) => ({
      ...a,
      profesor: { full_name: myProfesorRow?.profesor ?? "—" },
    }));
  }

  // Fetch today's absences for guardia view
  let guardiaAusencias: AusenciaProfesorado[] = [];
  if (canViewGuardia) {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
    const { data: rawGuardia } = await supabase
      .from("ausencias_profesorado")
      .select("*, tramos_horarios(id, nombre, hora_inicio, hora_fin, es_recreo, orden), cursos(id, nombre, email_tutor)")
      .eq("fecha", today)
      .eq("estado", "activa")
      .order("tramo_id");

    if (rawGuardia && rawGuardia.length > 0) {
      const ids = [...new Set(rawGuardia.map((a) => a.profesor_id as string))];
      const { data: profProfiles } = await supabase
        .from("profesores")
        .select("id, profesor")
        .in("id", ids);
      const nameMap = Object.fromEntries(
        (profProfiles ?? []).map((p) => [p.id as string, p.profesor as string])
      );
      guardiaAusencias = rawGuardia.map((a) => ({
        ...a,
        profesor: { full_name: nameMap[a.profesor_id as string] ?? "—" },
      }));
    }
  }

  // Fetch active professors for Directiva/Admin selector
  let profesores: { id: string; full_name: string }[] = [];
  if (canManageAll) {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
    const { data: profData } = await supabase
      .from("profesores")
      .select("id, profesor")
      .or(`fecha_cese.is.null,fecha_cese.gt.${today}`)
      .order("profesor");
    profesores = (profData ?? []).map((p) => ({
      id: p.id as string,
      full_name: p.profesor as string,
    }));
  }

  return (
    <AusenciasClient
      misAusencias={misAusencias}
      guardiaAusencias={canViewGuardia ? guardiaAusencias : null}
      tramos={(tramos ?? []) as TramoHorario[]}
      cursos={(cursos ?? []) as Curso[]}
      userId={user.id}
      myProfesorId={myProfesorId}
      canViewGuardia={canViewGuardia}
      canManageAll={canManageAll}
      profesores={profesores}
    />
  );
}

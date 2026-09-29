import { createClient } from "@/lib/supabase/server";
import { AusenciasClient } from "./AusenciasClient";
import type { AusenciaProfesorado, TramoHorario, Curso } from "@/lib/types";
import { todayMadrid, addDaysToDateStr } from "@/lib/dates";
import { requireRole } from "@/lib/auth";

export default async function AusenciasPage() {
  const { user, roleNames } = await requireRole(["Admin", "Directiva", "Guardia", "Profesor"]);
  const supabase = await createClient();
  // Guardia/management roles land on the guardia tab; Profesor can also view it, as a secondary tab
  const isGuardiaRole = roleNames.some((r) => ["Admin", "Directiva", "Guardia"].includes(r));
  const canViewGuardia = isGuardiaRole || roleNames.includes("Profesor");
  const canViewMis = roleNames.some((r) => ["Profesor", "Directiva"].includes(r));
  const canManageAll = roleNames.some((r) => ["Admin", "Directiva"].includes(r));

  // Fetch supporting data for the form
  const sinceStr = addDaysToDateStr(todayMadrid(), -60);

  const [{ data: tramos }, { data: cursos }, { data: myProfesorRow }] = await Promise.all([
    supabase.from("tramos_horarios").select("*").order("orden"),
    supabase.from("cursos").select("id, nombre, email_tutor").order("nombre"),
    supabase.from("profesores").select("id, profesor").ilike("email", user.email!).single(),
  ]);

  const myProfesorId: string | null = myProfesorRow?.id ?? null;

  // Course dropdown: special entries first ("Guardia", then "Otros"), then the rest alphabetically
  const PINNED_CURSOS = ["Guardia", "Otros"];
  const pinnedRank = (nombre: string) => {
    const i = PINNED_CURSOS.indexOf(nombre);
    return i === -1 ? PINNED_CURSOS.length : i;
  };
  const sortedCursos = ((cursos ?? []) as Curso[]).toSorted(
    (x, y) => pinnedRank(x.nombre) - pinnedRank(y.nombre)
  );

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
    const today = todayMadrid();
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
    const today = todayMadrid();
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
      cursos={sortedCursos}
      userId={user.id}
      myProfesorId={myProfesorId}
      canViewGuardia={canViewGuardia}
      guardiaFirst={isGuardiaRole}
      canViewMis={canViewMis}
      canManageAll={canManageAll}
      profesores={profesores}
    />
  );
}

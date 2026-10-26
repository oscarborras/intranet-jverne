import { createClient } from "@/lib/supabase/server";
import { CalendarioClient } from "./CalendarioClient";
import { resolveAutorNames } from "@/lib/resolveAutorNames";
import type { CalendarEvento, TipoEventoIntranet, AsuntoPropios, DiaBloqueadoAsuntos } from "@/lib/types";
import { todayMadrid, nowMadridParts, monthRange } from "@/lib/dates";
import { requireAuth } from "@/lib/auth";
import type { ProfesorOpcion } from "@/components/calendar/ProfesoresSelector";

export default async function CalendarioPage() {
  const { user, roleNames } = await requireAuth();
  const supabase = await createClient();

  const { year, month } = nowMadridParts();
  const { firstDay, lastDay } = monthRange(year, month);
  const todayStr = todayMadrid();

  const [
    { data: eventos },
    { data: tiposEvento },
    { data: asuntos },
    { data: configRows },
    { data: bloqueos },
    { data: cursos },
    { data: profesoresData },
  ] = await Promise.all([
    supabase.from("calendar_eventos").select("*").lte("fecha_inicio", lastDay).gte("fecha_fin", firstDay),
    supabase.from("tipos_eventos_intranet").select("*").eq("activo", true).order("orden"),
    supabase.from("asuntos_propios").select("*").gte("fecha", firstDay).lte("fecha", lastDay),
    supabase.from("config_intranet").select("clave, valor"),
    supabase.from("dias_bloqueados_asuntos").select("*").gte("fecha", firstDay).lte("fecha", lastDay),
    supabase.from("cursos").select("nombre").not("nombre", "in", "(Guardia,Otros)").order("nombre"),
    // Every teacher, ceased ones too: names of the teachers going to past activities
    supabase.from("profesores").select("id, profesor, email, fecha_cese").order("profesor"),
  ]);

  const canManageEvents = roleNames.some((r) => ["Admin", "Directiva", "TDE"].includes(r));
  const canManageAsuntos = roleNames.some((r) => ["Admin", "Directiva"].includes(r));
  const canCreateExtraescolar = !canManageEvents && roleNames.includes("Profesor");

  const autorNames = await resolveAutorNames(supabase, [
    ...(eventos ?? []).map((e) => e.autor_id as string),
    ...(bloqueos ?? []).map((b) => b.created_by as string),
    user.id,
  ]);
  const eventosConAutor = (eventos ?? []).map((e) => ({
    ...e,
    autor: { full_name: autorNames[e.autor_id as string] ?? "—" },
  }));
  const bloqueosConAutor = (bloqueos ?? []).map((b) => ({
    ...b,
    autor: { full_name: autorNames[b.created_by as string] ?? "—" },
  }));
  const myDisplayName = autorNames[user.id] ?? "—";

  const maxAsuntosPropios = parseInt(
    configRows?.find((r) => r.clave === "max_profes_asuntos_propios")?.valor ?? "3"
  ) || 3;

  const profesoresTodos = (profesoresData ?? []) as {
    id: string; profesor: string; email: string | null; fecha_cese: string | null;
  }[];
  const profesorOpciones: ProfesorOpcion[] = profesoresTodos.map((p) => ({
    id: p.id,
    profesor: p.profesor,
    activo: p.fecha_cese === null || p.fecha_cese > todayStr,
  }));
  const profesores = canManageAsuntos
    ? profesorOpciones.filter((p) => p.activo).map(({ id, profesor }) => ({ id, profesor }))
    : [];
  // The organiser goes to the activity: pre-selected in new events
  const userEmail = user.email?.toLowerCase();
  const myProfesorId = profesoresTodos.find((p) => userEmail && p.email?.toLowerCase() === userEmail)?.id ?? null;

  return (
    <CalendarioClient
      initialEventos={eventosConAutor as CalendarEvento[]}
      tiposEvento={(tiposEvento ?? []) as TipoEventoIntranet[]}
      userId={user.id}
      myDisplayName={myDisplayName}
      canManageEvents={canManageEvents}
      canCreateExtraescolar={canCreateExtraescolar}
      initialAsuntos={(asuntos ?? []) as AsuntoPropios[]}
      initialBloqueos={bloqueosConAutor as DiaBloqueadoAsuntos[]}
      maxAsuntosPropios={maxAsuntosPropios}
      profesores={profesores}
      canManageAsuntos={canManageAsuntos}
      grupos={(cursos ?? []).map((c) => c.nombre as string)}
      profesorOpciones={profesorOpciones}
      myProfesorId={myProfesorId}
    />
  );
}

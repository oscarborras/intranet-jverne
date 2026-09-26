import { createClient } from "@/lib/supabase/server";
import { CalendarioClient } from "./CalendarioClient";
import { resolveAutorNames } from "@/lib/resolveAutorNames";
import type { CalendarEvento, TipoEventoIntranet, AsuntoPropios, DiaBloqueadoAsuntos } from "@/lib/types";
import { todayMadrid, nowMadridParts, monthRange } from "@/lib/dates";

export default async function CalendarioPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { year, month } = nowMadridParts();
  const { firstDay, lastDay } = monthRange(year, month);
  const todayStr = todayMadrid();

  const [
    { data: eventos },
    { data: tiposEvento },
    { data: userRoles },
    { data: asuntos },
    { data: configRows },
    { data: bloqueos },
  ] = await Promise.all([
    supabase.from("calendar_eventos").select("*").lte("fecha_inicio", lastDay).gte("fecha_fin", firstDay),
    supabase.from("tipos_eventos_intranet").select("*").eq("activo", true).order("orden"),
    supabase.from("user_roles_intranet").select("perfiles_intranet(nombre)").eq("user_id", user!.id),
    supabase.from("asuntos_propios").select("*").gte("fecha", firstDay).lte("fecha", lastDay),
    supabase.from("config_intranet").select("clave, valor"),
    supabase.from("dias_bloqueados_asuntos").select("*").gte("fecha", firstDay).lte("fecha", lastDay),
  ]);

  const roleNames = (userRoles ?? []).map((ur) => {
    const p = ur.perfiles_intranet as unknown as { nombre: string } | null;
    return p?.nombre ?? "";
  });

  const canManageEvents = roleNames.some((r) => ["Admin", "Directiva", "TDE"].includes(r));
  const canManageAsuntos = roleNames.some((r) => ["Admin", "Directiva"].includes(r));
  const canCreateExtraescolar = !canManageEvents && roleNames.includes("Profesor");

  const autorNames = await resolveAutorNames(supabase, [
    ...(eventos ?? []).map((e) => e.autor_id as string),
    ...(bloqueos ?? []).map((b) => b.created_by as string),
    user!.id,
  ]);
  const eventosConAutor = (eventos ?? []).map((e) => ({
    ...e,
    autor: { full_name: autorNames[e.autor_id as string] ?? "—" },
  }));
  const bloqueosConAutor = (bloqueos ?? []).map((b) => ({
    ...b,
    autor: { full_name: autorNames[b.created_by as string] ?? "—" },
  }));
  const myDisplayName = autorNames[user!.id] ?? "—";

  const maxAsuntosPropios = parseInt(
    configRows?.find((r) => r.clave === "max_profes_asuntos_propios")?.valor ?? "3"
  ) || 3;

  let profesores: { id: string; profesor: string }[] = [];
  if (canManageAsuntos) {
    const { data: profesoresData } = await supabase
      .from("profesores")
      .select("id, profesor")
      .or("fecha_cese.is.null,fecha_cese.gt." + todayStr)
      .order("profesor");
    profesores = (profesoresData ?? []) as { id: string; profesor: string }[];
  }

  return (
    <CalendarioClient
      initialEventos={eventosConAutor as CalendarEvento[]}
      tiposEvento={(tiposEvento ?? []) as TipoEventoIntranet[]}
      userId={user!.id}
      myDisplayName={myDisplayName}
      canManageEvents={canManageEvents}
      canCreateExtraescolar={canCreateExtraescolar}
      initialAsuntos={(asuntos ?? []) as AsuntoPropios[]}
      initialBloqueos={bloqueosConAutor as DiaBloqueadoAsuntos[]}
      maxAsuntosPropios={maxAsuntosPropios}
      profesores={profesores}
      canManageAsuntos={canManageAsuntos}
    />
  );
}

import { createClient } from "@/lib/supabase/server";
import { CalendarioClient } from "./CalendarioClient";
import type { CalendarEvento, TipoEventoIntranet, AsuntoPropios } from "@/lib/types";

export default async function CalendarioPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).toISOString().split("T")[0];

  const [
    { data: eventos },
    { data: tiposEvento },
    { data: userRoles },
    { data: asuntos },
    { data: configRows },
  ] = await Promise.all([
    supabase.from("calendar_eventos").select("*").lte("fecha_inicio", lastDay).gte("fecha_fin", firstDay),
    supabase.from("tipos_eventos_intranet").select("*").eq("activo", true).order("orden"),
    supabase.from("user_roles_intranet").select("perfiles_intranet(nombre)").eq("user_id", user!.id),
    supabase.from("asuntos_propios").select("*").gte("fecha", firstDay).lte("fecha", lastDay),
    supabase.from("config_intranet").select("clave, valor"),
  ]);

  const roleNames = (userRoles ?? []).map((ur) => {
    const p = ur.perfiles_intranet as unknown as { nombre: string } | null;
    return p?.nombre ?? "";
  });

  const canManageEvents = roleNames.some((r) => ["Admin", "Directiva", "TDE"].includes(r));
  const canManageAsuntos = roleNames.some((r) => ["Admin", "Directiva"].includes(r));

  const maxAsuntosPropios = parseInt(
    configRows?.find((r) => r.clave === "max_profes_asuntos_propios")?.valor ?? "3"
  ) || 3;

  let profesores: { id: string; profesor: string }[] = [];
  if (canManageAsuntos) {
    const { data: profesoresData } = await supabase
      .from("profesores")
      .select("id, profesor")
      .or("fecha_cese.is.null,fecha_cese.gt." + new Date().toISOString().split("T")[0])
      .order("profesor");
    profesores = (profesoresData ?? []) as { id: string; profesor: string }[];
  }

  return (
    <CalendarioClient
      initialEventos={(eventos ?? []) as CalendarEvento[]}
      tiposEvento={(tiposEvento ?? []) as TipoEventoIntranet[]}
      userId={user!.id}
      canManageEvents={canManageEvents}
      initialAsuntos={(asuntos ?? []) as AsuntoPropios[]}
      maxAsuntosPropios={maxAsuntosPropios}
      profesores={profesores}
      canManageAsuntos={canManageAsuntos}
    />
  );
}

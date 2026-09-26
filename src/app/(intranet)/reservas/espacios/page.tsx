import { createClient } from "@/lib/supabase/server";
import { ReservaEspaciosClient } from "./ReservaEspaciosClient";
import type { Espacio, ReservaEspacio, TramoHorario } from "@/lib/types";
import { nowMadridParts, monthRange } from "@/lib/dates";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ReservaEspaciosPage() {
  const { user, roleNames } = await requireAuth();
  const supabase = await createClient();

  const { year, month } = nowMadridParts();
  const { firstDay, lastDay } = monthRange(year, month);

  const [{ data: espacios }, { data: reservas }, { data: tramos }, { data: horarioTardeRows }] = await Promise.all([
    supabase.from("espacios").select("*").eq("activo", true).order("id"),
    supabase
      .from("reservas_espacios")
      .select("*")
      .gte("fecha", firstDay)
      .lte("fecha", lastDay),
    supabase.from("tramos_horarios").select("*").order("orden"),
    supabase.from("config_intranet").select("clave, valor").in("clave", ["horario_tarde_inicio", "horario_tarde_fin"]),
  ]);
  const horarioTarde = {
    inicio: horarioTardeRows?.find((r) => r.clave === "horario_tarde_inicio")?.valor ?? "15:00",
    fin: horarioTardeRows?.find((r) => r.clave === "horario_tarde_fin")?.valor ?? "19:00",
  };

  // Fetch names for users who have reservations
  const uniqueUserIds = [...new Set((reservas ?? []).map((r) => r.user_id as string))];
  let userNames: Record<string, string> = {};
  if (uniqueUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from("users_view")
      .select("id, full_name")
      .in("id", uniqueUserIds);
    userNames = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.full_name]));
  }

  const currentUserName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "Yo";

  const isAdmin = roleNames.some(r => ["Admin", "TDE"].includes(r));
  const canBulkReserve = roleNames.some(r => ["Admin", "Directiva", "TDE"].includes(r));

  return (
    <ReservaEspaciosClient
      espacios={(espacios ?? []) as Espacio[]}
      initialReservas={(reservas ?? []) as ReservaEspacio[]}
      tramos={(tramos ?? []) as TramoHorario[]}
      userId={user.id}
      userNames={userNames}
      currentUserName={currentUserName}
      isAdmin={isAdmin}
      canBulkReserve={canBulkReserve}
      horarioTarde={horarioTarde}
    />
  );
}

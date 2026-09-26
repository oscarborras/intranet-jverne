import { createClient } from "@/lib/supabase/server";
import { ReservaCarrosClient } from "./ReservaCarrosClient";
import type { Carro, ReservaCarro, TramoHorario } from "@/lib/types";
import { nowMadridParts, monthRange } from "@/lib/dates";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ReservaCarrosPage() {
  const { user, roleNames } = await requireAuth();
  const supabase = await createClient();

  const { year, month } = nowMadridParts();
  const { firstDay, lastDay } = monthRange(year, month);

  const [{ data: carros }, { data: reservas }, { data: tramos }] = await Promise.all([
    supabase.from("carros").select("*").eq("activo", true).order("id"),
    supabase
      .from("reservas_carros")
      .select("*")
      .gte("fecha", firstDay)
      .lte("fecha", lastDay),
    supabase.from("tramos_horarios").select("*").order("orden"),
  ]);

  const isAdmin = roleNames.some((r) => ["Admin", "TDE"].includes(r));
  const canBulkReserve = roleNames.some((r) => ["Admin", "Directiva", "TDE"].includes(r));

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

  return (
    <ReservaCarrosClient
      carros={(carros ?? []) as Carro[]}
      initialReservas={(reservas ?? []) as ReservaCarro[]}
      tramos={(tramos ?? []) as TramoHorario[]}
      userId={user.id}
      isAdmin={isAdmin}
      canBulkReserve={canBulkReserve}
      userNames={userNames}
      currentUserName={currentUserName}
    />
  );
}

import { createClient } from "@/lib/supabase/server";
import { ReservaCarrosClient } from "./ReservaCarrosClient";
import type { Carro, ReservaCarro, TramoHorario } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ReservaCarrosPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).toISOString().split("T")[0];

  const [{ data: carros }, { data: reservas }, { data: tramos }] = await Promise.all([
    supabase.from("carros").select("*").eq("activo", true).order("id"),
    supabase
      .from("reservas_carros")
      .select("*")
      .gte("fecha", firstDay)
      .lte("fecha", lastDay),
    supabase.from("tramos_horarios").select("*").order("orden"),
  ]);

  const { data: userRoles } = await supabase
    .from("user_roles_intranet")
    .select("perfiles_intranet(nombre)")
    .eq("user_id", user!.id);
  const roleNames = (userRoles ?? []).map((ur) => {
    const p = ur.perfiles_intranet as unknown as { nombre: string } | null;
    return p?.nombre ?? "";
  });
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
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "Yo";

  return (
    <ReservaCarrosClient
      carros={(carros ?? []) as Carro[]}
      initialReservas={(reservas ?? []) as ReservaCarro[]}
      tramos={(tramos ?? []) as TramoHorario[]}
      userId={user!.id}
      isAdmin={isAdmin}
      canBulkReserve={canBulkReserve}
      userNames={userNames}
      currentUserName={currentUserName}
    />
  );
}

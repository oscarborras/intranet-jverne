import { createClient } from "@/lib/supabase/server";
import { ReservaEspaciosClient } from "./ReservaEspaciosClient";
import type { Espacio, ReservaEspacio, TramoHorario } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ReservaEspaciosPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).toISOString().split("T")[0];

  const [{ data: espacios }, { data: reservas }, { data: tramos }] = await Promise.all([
    supabase.from("espacios").select("*").eq("activo", true).order("id"),
    supabase
      .from("reservas_espacios")
      .select("*")
      .gte("fecha", firstDay)
      .lte("fecha", lastDay),
    supabase.from("tramos_horarios").select("*").order("orden"),
  ]);

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
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "Yo";

  const { data: userRoles } = await supabase
    .from("user_roles_intranet")
    .select("perfiles_intranet(nombre)")
    .eq("user_id", user!.id);
  const roleNames = (userRoles ?? []).map((ur) => {
    const p = ur.perfiles_intranet as unknown as { nombre: string } | null;
    return p?.nombre ?? "";
  });
  const isAdmin = roleNames.some(r => ["Admin", "TDE"].includes(r));
  const canBulkReserve = roleNames.some(r => ["Admin", "Directiva", "TDE"].includes(r));

  return (
    <ReservaEspaciosClient
      espacios={(espacios ?? []) as Espacio[]}
      initialReservas={(reservas ?? []) as ReservaEspacio[]}
      tramos={(tramos ?? []) as TramoHorario[]}
      userId={user!.id}
      userNames={userNames}
      currentUserName={currentUserName}
      isAdmin={isAdmin}
      canBulkReserve={canBulkReserve}
    />
  );
}

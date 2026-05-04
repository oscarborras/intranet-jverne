import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ConfiguracionClient } from "./ConfiguracionClient";
import type { ConfigIntranet } from "@/lib/types";

export default async function ConfiguracionPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: userRoles } = await supabase
    .from("user_roles_intranet")
    .select("perfiles_intranet(nombre)")
    .eq("user_id", user.id);

  const roleNames = (userRoles ?? []).map((ur) => {
    const p = ur.perfiles_intranet as unknown as { nombre: string } | null;
    return p?.nombre ?? "";
  });

  if (!roleNames.some((r) => ["Admin", "Directiva"].includes(r))) {
    redirect("/dashboard");
  }

  const { data: config } = await supabase
    .from("config_intranet")
    .select("*")
    .order("created_at");

  return <ConfiguracionClient config={(config ?? []) as ConfigIntranet[]} />;
}

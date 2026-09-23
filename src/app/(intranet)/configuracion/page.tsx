import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ConfiguracionClient } from "./ConfiguracionClient";
import type { ConfigIntranet, Perfil } from "@/lib/types";

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

  const [{ data: config }, { data: perfiles }] = await Promise.all([
    supabase.from("config_intranet").select("*").order("created_at"),
    supabase.from("perfiles_intranet").select("id, nombre").order("id"),
  ]);

  return (
    <ConfiguracionClient
      config={(config ?? []) as ConfigIntranet[]}
      perfiles={(perfiles ?? []) as Pick<Perfil, "id" | "nombre">[]}
    />
  );
}

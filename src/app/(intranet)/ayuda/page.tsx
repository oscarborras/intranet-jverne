import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AyudaClient } from "./AyudaClient";

export default async function AyudaPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: userRoles }, { data: modulosData }] = await Promise.all([
    supabase
      .from("user_roles_intranet")
      .select("perfil_id, perfiles_intranet(id, nombre)")
      .eq("user_id", user.id),
    supabase
      .from("modulos_config")
      .select("slug, activo, modulo_perfiles(perfil_id)")
      .order("orden"),
  ]);

  const roles = (userRoles ?? [])
    .map((ur) => ur.perfiles_intranet as unknown as { id: number; nombre: string })
    .filter(Boolean);

  const isAdmin = roles.some((r) => r.nombre === "Admin");
  const userPerfilIds = new Set(roles.map((r) => r.id));

  const inactiveModuleSlugs = (modulosData ?? [])
    .filter((m) => {
      if (!m.activo) return true;
      if (isAdmin) return false;
      const allowed = (m.modulo_perfiles as { perfil_id: number }[]).map((mp) => mp.perfil_id);
      return !allowed.some((id) => userPerfilIds.has(id));
    })
    .map((m) => m.slug as string);

  return <AyudaClient inactiveModuleSlugs={inactiveModuleSlugs} />;
}

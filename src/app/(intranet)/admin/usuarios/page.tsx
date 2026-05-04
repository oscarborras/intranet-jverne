import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminUsuariosClient } from "./AdminUsuariosClient";
import type { Perfil } from "@/lib/types";

interface UserWithRolesRaw {
  id: string;
  email: string;
  full_name: string;
  provider: string;
  created_at: string;
  last_sign_in_at: string;
}

export default async function AdminUsuariosPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check admin role
  const { data: rolesData } = await supabase
    .from("user_roles_intranet")
    .select("perfiles_intranet(nombre)")
    .eq("user_id", user!.id);

  const roleNames = (rolesData ?? [])
    .map((r) => (r.perfiles_intranet as unknown as { nombre: string })?.nombre)
    .filter(Boolean);

  if (!roleNames.includes("Admin")) {
    redirect("/dashboard");
  }

  const [{ data: users }, { data: allUserRoles }, { data: perfiles }] =
    await Promise.all([
      supabase.from("users_view").select("*").order("full_name"),
      supabase.from("user_roles_intranet").select("user_id, perfil_id"),
      supabase.from("perfiles_intranet").select("*").order("id"),
    ]);

  return (
    <AdminUsuariosClient
      users={(users ?? []) as UserWithRolesRaw[]}
      perfiles={(perfiles ?? []) as Perfil[]}
      userRolesMap={(allUserRoles ?? []) as { user_id: string; perfil_id: number }[]}
      currentUserId={user!.id}
    />
  );
}

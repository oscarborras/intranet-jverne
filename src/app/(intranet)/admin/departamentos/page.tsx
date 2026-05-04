import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminDepartamentosClient } from "./AdminDepartamentosClient";
import type { Departamento } from "@/lib/types";

export default async function AdminDepartamentosPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: rolesData } = await supabase
    .from("user_roles_intranet")
    .select("perfiles_intranet(nombre)")
    .eq("user_id", user!.id);

  const roleNames = (rolesData ?? [])
    .map((r) => (r.perfiles_intranet as unknown as { nombre: string })?.nombre)
    .filter(Boolean);

  if (!roleNames.includes("Admin")) redirect("/dashboard");

  const [{ data: departamentos }, { data: miembros }, { data: users }] = await Promise.all([
    supabase.from("departamentos").select("*").order("nombre"),
    supabase.from("departamento_miembros").select("user_id, departamento_id"),
    supabase.from("users_view").select("id, full_name, email"),
  ]);

  return (
    <AdminDepartamentosClient
      initialDepartamentos={(departamentos ?? []) as Departamento[]}
      initialMiembros={(miembros ?? []) as { user_id: string; departamento_id: number }[]}
      users={(users ?? []) as { id: string; full_name: string; email: string }[]}
    />
  );
}

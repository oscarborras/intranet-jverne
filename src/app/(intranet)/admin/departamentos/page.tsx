import { createClient } from "@/lib/supabase/server";
import { AdminDepartamentosClient } from "./AdminDepartamentosClient";
import type { Departamento } from "@/lib/types";
import { requireRole } from "@/lib/auth";

export default async function AdminDepartamentosPage() {
  await requireRole(["Admin"]);
  const supabase = await createClient();

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

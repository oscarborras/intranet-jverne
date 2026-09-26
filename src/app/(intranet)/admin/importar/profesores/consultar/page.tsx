import { createAdminClient } from "@/lib/supabase/admin";
import { ConsultarProfesoresClient } from "./ConsultarProfesoresClient";
import type { ProfesorDbRow } from "@/lib/import/profesores";
import { requireRole } from "@/lib/auth";

export const metadata = { title: "Listado de profesores" };

export default async function ConsultarProfesoresPage() {
  await requireRole(["Admin"]);

  const admin = createAdminClient();
  const { data } = await admin
    .from("profesores")
    .select("id, profesor, puesto, dni, email, fecha_alta, fecha_cese")
    .order("profesor");

  return <ConsultarProfesoresClient profesores={(data ?? []) as ProfesorDbRow[]} />;
}

import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import OrdenanzasClient from "./OrdenanzasClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Citas del día – IES Julio Verne",
};

export default async function OrdenanzasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rolesData } = await supabase
    .from("user_roles_intranet")
    .select("perfiles_intranet(nombre)")
    .eq("user_id", user.id);

  const roleNames = (rolesData ?? [])
    .map((r) => (r.perfiles_intranet as unknown as { nombre: string } | null)?.nombre)
    .filter(Boolean) as string[];

  const allowed = roleNames.some((r) => ["Admin", "Directiva", "Ordenanza"].includes(r));
  if (!allowed) redirect("/dashboard");

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const admin = createAdminClient();

  const [{ data: citasRaw }, { data: profesoresRaw }] = await Promise.all([
    admin
      .from("citas_familias")
      .select("id, codigo, profesor_id, alumno_nombre, alumno_curso, familiar_nombre, familiar_parentesco, hora_inicio, lugar")
      .eq("estado", "confirmada")
      .eq("fecha", todayStr)
      .order("hora_inicio", { ascending: true }),
    admin
      .from("profesores")
      .select("id, profesor"),
  ]);

  const profesoresMap: Record<string, string> = Object.fromEntries(
    (profesoresRaw ?? []).map((p) => [p.id, p.profesor as string])
  );

  interface CitaOrdenanza {
    id: number;
    codigo: string;
    profesor_id: string;
    profesor_nombre: string;
    alumno_nombre: string;
    alumno_curso: string;
    familiar_nombre: string;
    familiar_parentesco: string;
    hora_inicio: string | null;
    lugar: string | null;
  }

  const citas: CitaOrdenanza[] = (citasRaw ?? []).map((c) => ({
    ...c,
    profesor_nombre: profesoresMap[c.profesor_id as string] ?? "—",
  }));

  const profesoresConCitas = [...new Set(citas.map((c) => c.profesor_id))].map((pid) => ({
    id: pid,
    nombre: profesoresMap[pid] ?? "—",
  })).sort((a, b) => a.nombre.localeCompare(b.nombre));

  return (
    <OrdenanzasClient
      citas={citas}
      profesores={profesoresConCitas}
      todayStr={todayStr}
    />
  );
}

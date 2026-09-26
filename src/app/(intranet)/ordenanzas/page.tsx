import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import OrdenanzasClient from "./OrdenanzasClient";
import { todayMadrid } from "@/lib/dates";
import { requireRole } from "@/lib/auth";
import type { CargoDirectivoClave } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Citas del día – IES Julio Verne",
};

export default async function OrdenanzasPage() {
  await requireRole(["Admin", "Directiva", "Ordenanza"]);

  const todayStr = todayMadrid();

  const admin = createAdminClient();

  const [{ data: citasRaw }, { data: profesoresRaw }] = await Promise.all([
    admin
      .from("citas_familias")
      .select("id, codigo, profesor_id, alumno_nombre, alumno_curso, familiar_nombre, familiar_parentesco, hora_inicio, lugar, cargo")
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
    cargo: CargoDirectivoClave | null;
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

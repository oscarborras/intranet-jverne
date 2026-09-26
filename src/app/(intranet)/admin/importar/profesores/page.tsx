import { createAdminClient } from "@/lib/supabase/admin";
import { ImportarProfesoresClient } from "./ImportarProfesoresClient";
import type { ProfesorDbRow } from "@/lib/import/profesores";
import { requireRole } from "@/lib/auth";

export const metadata = { title: "Importar Profesores" };

export default async function ImportarProfesoresPage() {
  await requireRole(["Admin"]);

  const admin = createAdminClient();
  const [{ data: profesoresData }, { data: configRow }] = await Promise.all([
    admin
      .from("profesores")
      .select("id, profesor, puesto, dni, email, fecha_alta, fecha_cese")
      .order("profesor"),
    admin
      .from("config_intranet")
      .select("valor")
      .eq("clave", "ultima_importacion_profesores")
      .maybeSingle(),
  ]);

  return (
    <ImportarProfesoresClient
      profesores={(profesoresData ?? []) as ProfesorDbRow[]}
      ultimaImportacion={(configRow as { valor?: string } | null)?.valor || null}
    />
  );
}

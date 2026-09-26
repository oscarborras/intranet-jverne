import { ImportarClient } from "./ImportarClient";
import { requireRole } from "@/lib/auth";

export const metadata = { title: "Importar Datos" };

export default async function ImportarPage() {
  await requireRole(["Admin"]);

  return <ImportarClient />;
}

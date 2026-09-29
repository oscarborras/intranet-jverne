import { requireRole } from "@/lib/auth";
import { ROLES_OPERAR_V2, puedeGestionarV2 } from "@/lib/gratuidadV2/permisos";
import { ConsultaClient } from "./ConsultaClient";

export const metadata = { title: "Consulta · Gratuidad v2" };

interface Props {
  searchParams: Promise<{ codigo?: string; alumno?: string }>;
}

export default async function ConsultaV2Page({ searchParams }: Props) {
  const { roleNames } = await requireRole(ROLES_OPERAR_V2);
  const params = await searchParams;

  return (
    <ConsultaClient
      canManage={puedeGestionarV2(roleNames)}
      inicial={{ codigo: params.codigo ?? "", alumno: params.alumno ?? "" }}
    />
  );
}

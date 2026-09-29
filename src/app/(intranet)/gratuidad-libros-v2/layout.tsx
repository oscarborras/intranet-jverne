import { requireRole } from "@/lib/auth";
import { ROLES_OPERAR_V2, puedeGestionarV2 } from "@/lib/gratuidadV2/permisos";
import { SubNavV2 } from "./SubNavV2";

export default async function GratuidadV2Layout({ children }: { children: React.ReactNode }) {
  const { roleNames } = await requireRole(ROLES_OPERAR_V2);

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Gratuidad de Libros v2</h1>
        <p className="text-sm text-gray-500 mt-0.5">Entrega y devolución de libros por código de barras.</p>
      </div>
      <SubNavV2 canManage={puedeGestionarV2(roleNames)} />
      {children}
    </div>
  );
}

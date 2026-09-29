import Link from "next/link";
import { BookCopy, Library, Tags } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { ROLES_OPERAR_V2, puedeGestionarV2 } from "@/lib/gratuidadV2/permisos";
import type { SituacionV2 } from "@/lib/types/gratuidadV2";

export const metadata = { title: "Gratuidad de Libros v2" };

const SITUACIONES: { key: SituacionV2; label: string; color: string }[] = [
  { key: "en_centro", label: "En el centro", color: "text-emerald-700" },
  { key: "prestado", label: "Prestados", color: "text-blue-700" },
  { key: "perdido", label: "Perdidos", color: "text-red-600" },
  { key: "baja", label: "De baja", color: "text-gray-500" },
];

export default async function GratuidadV2Page() {
  const { roleNames } = await requireRole(ROLES_OPERAR_V2);
  const canManage = puedeGestionarV2(roleNames);
  const supabase = await createClient();

  const countSituacion = (s: SituacionV2) =>
    supabase.from("gplv2_ejemplares").select("id", { count: "exact", head: true }).eq("situacion", s);

  const [titulos, ...porSituacion] = await Promise.all([
    supabase.from("gplv2_titulos").select("id", { count: "exact", head: true }).eq("activo", true),
    ...SITUACIONES.map((s) => countSituacion(s.key)),
  ]);
  const total = porSituacion.reduce((sum, r) => sum + (r.count ?? 0), 0);

  const accesos = [
    { href: "/gratuidad-libros-v2/ejemplares", label: "Ejemplares", desc: "Dónde está cada libro", icon: BookCopy, show: true },
    { href: "/gratuidad-libros-v2/titulos", label: "Títulos", desc: "Catálogo, lotes y alta de ejemplares", icon: Library, show: canManage },
    { href: "/gratuidad-libros-v2/etiquetas", label: "Etiquetas", desc: "Imprimir códigos de barras", icon: Tags, show: canManage },
  ].filter((a) => a.show);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase mb-2">Ejemplares</p>
          <p className="text-3xl font-bold text-gray-900">{total}</p>
          <p className="text-xs text-gray-400 mt-1">{titulos.count ?? 0} títulos activos</p>
        </div>
        {SITUACIONES.map((s, i) => (
          <div key={s.key} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase mb-2">{s.label}</p>
            <p className={`text-3xl font-bold ${s.color}`}>{porSituacion[i].count ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {accesos.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:bg-blue-50/40 transition-colors"
          >
            <span className="w-11 h-11 rounded-xl bg-teal-600 text-white flex items-center justify-center flex-shrink-0">
              <a.icon size={22} />
            </span>
            <span>
              <span className="block font-semibold text-gray-900">{a.label}</span>
              <span className="block text-sm text-gray-500">{a.desc}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

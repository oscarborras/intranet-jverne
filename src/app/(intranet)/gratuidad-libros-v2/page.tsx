import Link from "next/link";
import { AlertTriangle, BarChart3, BookCopy, CalendarRange, ClipboardList, HandHelping, Library, ScanSearch, Tags, Undo2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { ROLES_OPERAR_V2, puedeGestionarV2 } from "@/lib/gratuidadV2/permisos";
import { GratuidadV2Progreso } from "@/components/charts/GratuidadV2Progreso";
import type { AlumnoPendienteV2, ProgresoGrupoV2, SituacionV2 } from "@/lib/types/gratuidadV2";

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

  const [titulos, incidencias, progreso, pendientes, ...porSituacion] = await Promise.all([
    supabase.from("gplv2_titulos").select("id", { count: "exact", head: true }).eq("activo", true),
    supabase.from("gplv2_incidencias").select("id", { count: "exact", head: true }).in("estado", ["abierta", "en_gestion"]),
    supabase.rpc("gplv2_progreso_grupos"),
    supabase.rpc("gplv2_alumnos_pendientes"),
    ...SITUACIONES.map((s) => countSituacion(s.key)),
  ]);
  const total = porSituacion.reduce((sum, r) => sum + (r.count ?? 0), 0);
  const bajasConLibros = ((pendientes.data ?? []) as AlumnoPendienteV2[]).filter((a) => a.baja);
  const incidenciasAbiertas = incidencias.count ?? 0;

  const accesos = [
    { href: "/gratuidad-libros-v2/entrega", label: "Entrega", desc: "Entregar libros escaneando", icon: HandHelping, show: true },
    { href: "/gratuidad-libros-v2/devolucion", label: "Devolución", desc: "Recoger libros escaneando", icon: Undo2, show: true },
    { href: "/gratuidad-libros-v2/consulta", label: "Consulta", desc: "Dónde está un libro y su historial", icon: ScanSearch, show: true },
    { href: "/gratuidad-libros-v2/ejemplares", label: "Ejemplares", desc: "Inventario de todos los libros", icon: BookCopy, show: true },
    { href: "/gratuidad-libros-v2/informes", label: "Informes", desc: "Pendientes, stock, perdidos", icon: BarChart3, show: true },
    { href: "/gratuidad-libros-v2/incidencias", label: "Incidencias", desc: "Deterioros y pérdidas", icon: ClipboardList, show: canManage },
    { href: "/gratuidad-libros-v2/titulos", label: "Títulos", desc: "Catálogo, lotes y alta de ejemplares", icon: Library, show: canManage },
    { href: "/gratuidad-libros-v2/etiquetas", label: "Etiquetas", desc: "Imprimir códigos de barras", icon: Tags, show: canManage },
    { href: "/gratuidad-libros-v2/curso", label: "Curso escolar", desc: "Cerrar el curso y abrir el siguiente", icon: CalendarRange, show: canManage },
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

      {/* Alerts */}
      {(bajasConLibros.length > 0 || (canManage && incidenciasAbiertas > 0)) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {bajasConLibros.length > 0 && (
            <Link href="/gratuidad-libros-v2/informes?tab=pendientes&bajas=1" className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 hover:bg-amber-100/60">
              <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-amber-900">
                <b>{bajasConLibros.length} {bajasConLibros.length === 1 ? "alumno dado de baja tiene" : "alumnos dados de baja tienen"}</b> libros sin devolver.
              </span>
            </Link>
          )}
          {canManage && incidenciasAbiertas > 0 && (
            <Link href="/gratuidad-libros-v2/incidencias" className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 hover:bg-red-100/60">
              <ClipboardList size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-red-900"><b>{incidenciasAbiertas} {incidenciasAbiertas === 1 ? "incidencia abierta" : "incidencias abiertas"}</b> de deterioro o pérdida.</span>
            </Link>
          )}
        </div>
      )}

      <GratuidadV2Progreso progreso={(progreso.data ?? []) as ProgresoGrupoV2[]} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {accesos.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:bg-blue-50/40 transition-colors"
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

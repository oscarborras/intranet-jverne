import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Megaphone,
  Monitor,
  Wrench,
  Building2,
  BookOpen,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Anuncio, PeticionTIC, PeticionMantenimiento } from "@/lib/types";
import { ProximasReservas, type ReservaDashboard } from "./ProximasReservas";

const moduleCards = [
  {
    slug: "calendario",
    nombre: "Calendario",
    descripcion: "Consulta eventos y días de libre disposición",
    icono: Calendar,
    color: "bg-blue-500",
    href: "/calendario",
  },
  {
    slug: "anuncios",
    nombre: "Anuncios",
    descripcion: "Noticias y comunicados",
    icono: Megaphone,
    color: "bg-cyan-500",
    href: "/anuncios",
  },
  {
    slug: "peticiones-tic",
    nombre: "Peticiones TIC",
    descripcion: "Soporte técnico informático",
    icono: Monitor,
    color: "bg-yellow-500",
    href: "/peticiones-tic",
  },
  {
    slug: "peticiones-mantenimiento",
    nombre: "Peticiones Mantenimiento",
    descripcion: "Reparaciones e infraestructura",
    icono: Wrench,
    color: "bg-red-500",
    href: "/peticiones-mantenimiento",
  },
  {
    slug: "reservas/espacios",
    nombre: "Reserva de Espacios",
    descripcion: "SUM y sala de visitas",
    icono: Building2,
    color: "bg-emerald-500",
    href: "/reservas/espacios",
  },
  {
    slug: "reservas/recursos",
    nombre: "Reserva de Recursos",
    descripcion: "Carros de portátiles y equipos",
    icono: BookOpen,
    color: "bg-gray-700",
    href: "/reservas/recursos",
  },
];

const priorityLabel: Record<string, string> = {
  normal: "Normal",
  importante: "Importante",
  urgente: "Urgente",
};

const priorityClass: Record<string, string> = {
  normal: "bg-blue-100 text-blue-700",
  importante: "bg-yellow-100 text-yellow-700",
  urgente: "bg-red-100 text-red-700",
};

const ticStatusLabel: Record<string, string> = {
  pendiente: "Pendiente",
  en_progreso: "En Progreso",
  finalizada: "Finalizado",
};

const ticStatusClass: Record<string, string> = {
  pendiente: "bg-red-100 text-red-700",
  en_progreso: "bg-yellow-100 text-yellow-700",
  finalizada: "bg-green-100 text-green-700",
};

const mntStatusLabel: Record<string, string> = {
  por_validar: "Por Validar",
  abierta: "Abierta",
  en_progreso: "En Progreso",
  finalizada: "Finalizada",
};

const mntStatusClass: Record<string, string> = {
  por_validar: "bg-gray-100 text-gray-600",
  abierta: "bg-red-100 text-red-700",
  en_progreso: "bg-yellow-100 text-yellow-700",
  finalizada: "bg-green-100 text-green-700",
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const userName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "Usuario";

  // Fetch user roles and module config in parallel
  const [{ data: userRolesData }, { data: modulosData }] = await Promise.all([
    supabase
      .from("user_roles_intranet")
      .select("perfiles_intranet(nombre)")
      .eq("user_id", user.id),
    supabase.from("modulos_config").select("slug, activo"),
  ]);

  const isAdmin = (userRolesData ?? []).some(
    (r) => (r.perfiles_intranet as unknown as { nombre: string })?.nombre === "Admin"
  );
  const activeModuleSlugs = new Set(
    (modulosData ?? []).filter((m) => m.activo).map((m) => m.slug as string)
  );
  const visibleModuleCards = moduleCards.filter(
    (m) => isAdmin || activeModuleSlugs.has(m.slug)
  );

  // Fetch latest announcements
  const { data: anuncios } = await supabase
    .from("anuncios")
    .select("id, titulo, prioridad, created_at, autor_id")
    .order("created_at", { ascending: false })
    .limit(3);

  // Fetch user's upcoming reservations (spaces + resources)
  const todayStr = new Date().toISOString().split("T")[0];

  const [{ data: reservasEspaciosRaw }, { data: reservasRecursosRaw }] = await Promise.all([
    supabase
      .from("reservas_espacios")
      .select("id, fecha, motivo, espacio_id, tramo_id, espacios(nombre), tramos_horarios(nombre, hora_inicio, hora_fin, orden)")
      .eq("user_id", user.id)
      .gte("fecha", todayStr)
      .order("fecha", { ascending: true })
      .limit(5),
    supabase
      .from("reservas_recursos")
      .select("id, fecha, aula, recurso_id, tramo_id, recursos(nombre), tramos_horarios(nombre, hora_inicio, hora_fin, orden)")
      .eq("user_id", user.id)
      .gte("fecha", todayStr)
      .order("fecha", { ascending: true })
      .limit(5),
  ]);

  const reservasEspacios: ReservaDashboard[] = (reservasEspaciosRaw ?? []).map((r) => {
    const espacio = r.espacios as unknown as { nombre: string } | null;
    const tramo = r.tramos_horarios as unknown as { nombre: string; hora_inicio: string; hora_fin: string; orden: number } | null;
    return {
      id: r.id,
      fecha: r.fecha,
      nombre: espacio?.nombre ?? "Espacio",
      tramo: tramo?.nombre ?? "",
      hora_inicio: tramo?.hora_inicio ?? "",
      hora_fin: tramo?.hora_fin ?? "",
      tramo_orden: tramo?.orden ?? 0,
      info: r.motivo ?? "",
      tipo: "espacio",
      href: "/reservas/espacios",
      user_name: userName,
    };
  });

  const reservasRecursos: ReservaDashboard[] = (reservasRecursosRaw ?? []).map((r) => {
    const recurso = r.recursos as unknown as { nombre: string } | null;
    const tramo = r.tramos_horarios as unknown as { nombre: string; hora_inicio: string; hora_fin: string; orden: number } | null;
    return {
      id: r.id,
      fecha: r.fecha,
      nombre: recurso?.nombre ?? "Recurso",
      tramo: tramo?.nombre ?? "",
      hora_inicio: tramo?.hora_inicio ?? "",
      hora_fin: tramo?.hora_fin ?? "",
      tramo_orden: tramo?.orden ?? 0,
      info: r.aula ?? "",
      tipo: "recurso",
      href: "/reservas/recursos",
      user_name: userName,
    };
  });

  const proximasReservas = [...reservasEspacios, ...reservasRecursos].sort((a, b) => {
    const dateCompare = a.fecha.localeCompare(b.fecha);
    return dateCompare !== 0 ? dateCompare : a.tramo_orden - b.tramo_orden;
  }).slice(0, 6);

  // Fetch user's open petitions (TIC + Mantenimiento)
  const { data: peticionesRaw } = await supabase
    .from("peticiones_tic")
    .select("id, codigo, titulo, estado, prioridad, created_at")
    .eq("autor_id", user.id)
    .neq("estado", "finalizada")
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: mantenimientoRaw } = await supabase
    .from("peticiones_mantenimiento")
    .select("id, codigo, titulo, estado, prioridad, created_at")
    .eq("autor_id", user.id)
    .not("estado", "in", '("finalizada","rechazada")')
    .order("created_at", { ascending: false })
    .limit(5);

  const peticionesTIC = (peticionesRaw ?? []) as Pick<
    PeticionTIC,
    "id" | "codigo" | "titulo" | "estado" | "prioridad" | "created_at"
  >[];

  const peticionesMantenimiento = (mantenimientoRaw ?? []) as Pick<
    PeticionMantenimiento,
    "id" | "codigo" | "titulo" | "estado" | "prioridad" | "created_at"
  >[];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome banner */}
      <div className="bg-blue-700 rounded-2xl px-6 py-5 text-white">
        <h1 className="text-2xl font-bold">Bienvenido/a {userName}</h1>
      </div>

      {/* Modules grid */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span>≡</span> Módulos disponibles
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {visibleModuleCards.map((mod) => {
            const Icon = mod.icono;
            return (
              <Link
                key={mod.slug}
                href={mod.href}
                className="bg-white rounded-xl p-4 border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all group cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 ${mod.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <Icon size={20} className="text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm leading-tight">{mod.nombre}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-tight hidden sm:block">{mod.descripcion}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Widgets row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Latest announcements */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="bg-blue-600 px-5 py-3 flex items-center gap-2">
            <Megaphone size={16} className="text-white" />
            <h3 className="text-white font-semibold text-sm">Últimos Anuncios</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {(anuncios ?? []).length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">No hay anuncios</p>
            ) : (
              (anuncios as Pick<Anuncio, "id" | "titulo" | "prioridad" | "created_at">[]).map((a) => (
                <div key={a.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <p className="text-sm text-gray-800 truncate">{a.titulo}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-medium ${priorityClass[a.prioridad]}`}>
                    {priorityLabel[a.prioridad]}
                  </span>
                </div>
              ))
            )}
          </div>
          <div className="px-5 py-3 border-t border-gray-100">
            <Link href="/anuncios" className="text-sm text-blue-600 hover:underline cursor-pointer">
              Ver todos →
            </Link>
          </div>
        </div>

        {/* Upcoming reservations */}
        <ProximasReservas reservas={proximasReservas} />
      </div>

      {/* TIC petitions */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="bg-yellow-500 px-5 py-3 flex items-center gap-2">
          <Monitor size={16} className="text-white" />
          <h3 className="text-white font-semibold text-sm">Mis Peticiones TIC Abiertas</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {peticionesTIC.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">No tienes peticiones TIC abiertas</p>
          ) : (
            peticionesTIC.map((p) => (
              <div key={p.id} className="px-5 py-3 flex items-center gap-3">
                <span className="text-xs font-mono text-gray-400 flex-shrink-0 bg-gray-100 px-1.5 py-0.5 rounded">
                  {p.codigo}
                </span>
                <p className="text-sm text-gray-800 flex-1 truncate">{p.titulo}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-medium ${ticStatusClass[p.estado]}`}>
                  {ticStatusLabel[p.estado] ?? p.estado}
                </span>
              </div>
            ))
          )}
        </div>
        <div className="px-5 py-3 border-t border-gray-100">
          <Link href="/peticiones-tic" className="text-sm text-yellow-600 hover:underline cursor-pointer">
            Ver todas →
          </Link>
        </div>
      </div>

      {/* Maintenance petitions */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="bg-red-500 px-5 py-3 flex items-center gap-2">
          <Wrench size={16} className="text-white" />
          <h3 className="text-white font-semibold text-sm">Mis Peticiones de Mantenimiento Abiertas</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {peticionesMantenimiento.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">No tienes peticiones de mantenimiento abiertas</p>
          ) : (
            peticionesMantenimiento.map((p) => (
              <div key={p.id} className="px-5 py-3 flex items-center gap-3">
                <span className="text-xs font-mono text-gray-400 flex-shrink-0 bg-gray-100 px-1.5 py-0.5 rounded">
                  {p.codigo}
                </span>
                <p className="text-sm text-gray-800 flex-1 truncate">{p.titulo}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-medium ${mntStatusClass[p.estado] ?? "bg-gray-100 text-gray-600"}`}>
                  {mntStatusLabel[p.estado] ?? p.estado}
                </span>
              </div>
            ))
          )}
        </div>
        <div className="px-5 py-3 border-t border-gray-100">
          <Link href="/peticiones-mantenimiento" className="text-sm text-red-600 hover:underline cursor-pointer">
            Ver todas →
          </Link>
        </div>
      </div>
    </div>
  );
}

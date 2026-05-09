import { redirect } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  Calendar,
  Megaphone,
  Monitor,
  Wrench,
  Building2,
  BookOpen,
  Laptop,
  GraduationCap,
  CalendarClock,
  Users,
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
    slug: "reservas/carros",
    nombre: "Carros de Portátiles",
    descripcion: "Reserva carros de portátiles",
    icono: Laptop,
    color: "bg-blue-500",
    href: "/reservas/carros",
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
    descripcion: "Otros recursos del centro",
    icono: BookOpen,
    color: "bg-gray-700",
    href: "/reservas/recursos",
  },
  {
    slug: "citas-familias",
    nombre: "Citas con Familias",
    descripcion: "Visitas y reuniones con familias",
    icono: Users,
    color: "bg-red-600",
    href: "/citas-familias",
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

  const admin = createAdminClient();

  // Fetch user roles, module config and profesor identity in parallel
  const [{ data: userRolesData }, { data: modulosData }, { data: configData }, { data: profesorRow }] = await Promise.all([
    supabase
      .from("user_roles_intranet")
      .select("perfil_id, perfiles_intranet(nombre)")
      .eq("user_id", user.id),
    supabase.from("modulos_config").select("slug, activo, modulo_perfiles(perfil_id)").order("orden"),
    supabase.from("config_intranet").select("clave, valor").in("clave", ["dias_vista_extraescolares", "dias_vista_citas"]),
    admin.from("profesores").select("id").eq("email", user.email!).single(),
  ]);

  const profesorId = profesorRow?.id ?? null;

  const isAdmin = (userRolesData ?? []).some(
    (r) => (r.perfiles_intranet as unknown as { nombre: string })?.nombre === "Admin"
  );
  const userPerfilIds = new Set((userRolesData ?? []).map((r) => r.perfil_id as number).filter(Boolean));

  function canSee(slug: string): boolean {
    if (isAdmin) return true;
    const modulo = (modulosData ?? []).find((m) => m.slug === slug);
    if (!modulo || !modulo.activo) return false;
    const allowed = (modulo.modulo_perfiles as { perfil_id: number }[]).map((mp) => mp.perfil_id);
    return allowed.some((id) => userPerfilIds.has(id));
  }

  const visibleModuleCards = moduleCards.filter((m) => canSee(m.slug));

  const showCalendario    = canSee("calendario");
  const showAnuncios      = canSee("anuncios");
  const showReservaCar    = canSee("reservas/carros");
  const showReservaEsp    = canSee("reservas/espacios");
  const showReservaRec    = canSee("reservas/recursos");
  const showReservas      = showReservaCar || showReservaEsp || showReservaRec;
  const showTIC            = canSee("peticiones-tic");
  const showMantenimiento  = canSee("peticiones-mantenimiento");
  const showCitasFamilias  = canSee("citas-familias");

  const diasVistaExtraescolares = parseInt(
    (configData ?? []).find((c) => c.clave === "dias_vista_extraescolares")?.valor ?? "20",
    10
  );
  const diasVistaCitas = parseInt(
    (configData ?? []).find((c) => c.clave === "dias_vista_citas")?.valor ?? "14",
    10
  );

  const _now = new Date();
  const todayStr = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, "0")}-${String(_now.getDate()).padStart(2, "0")}`;
  const _limitDate = new Date(_now);
  _limitDate.setDate(_limitDate.getDate() + diasVistaExtraescolares);
  const limitStr = `${_limitDate.getFullYear()}-${String(_limitDate.getMonth() + 1).padStart(2, "0")}-${String(_limitDate.getDate()).padStart(2, "0")}`;

  const _citasLimitDate = new Date(_now);
  _citasLimitDate.setDate(_citasLimitDate.getDate() + diasVistaCitas);
  const citasLimitStr = `${_citasLimitDate.getFullYear()}-${String(_citasLimitDate.getMonth() + 1).padStart(2, "0")}-${String(_citasLimitDate.getDate()).padStart(2, "0")}`;

  // Fetch only data for active modules
  const [
    anunciosResult,
    reservasCarrosResult,
    reservasEspaciosResult,
    reservasRecursosResult,
    peticionesResult,
    mantenimientoResult,
    extraescolaresResult,
    citasResult,
  ] = await Promise.all([
    showAnuncios
      ? supabase.from("anuncios").select("id, titulo, prioridad, created_at, autor_id").or(`visible_hasta.is.null,visible_hasta.gte.${todayStr}`).order("created_at", { ascending: false }).limit(3)
      : Promise.resolve({ data: [] }),
    showReservaCar
      ? supabase.from("reservas_carros").select("id, fecha, aula, carro_id, tramo_id, carros(nombre), tramos_horarios(nombre, hora_inicio, hora_fin, orden)").eq("user_id", user.id).gte("fecha", todayStr).order("fecha", { ascending: true }).limit(5)
      : Promise.resolve({ data: [] }),
    showReservaEsp
      ? supabase.from("reservas_espacios").select("id, fecha, motivo, espacio_id, tramo_id, espacios(nombre), tramos_horarios(nombre, hora_inicio, hora_fin, orden)").eq("user_id", user.id).gte("fecha", todayStr).order("fecha", { ascending: true }).limit(5)
      : Promise.resolve({ data: [] }),
    showReservaRec
      ? supabase.from("reservas_recursos").select("id, fecha, aula, recurso_id, tramo_id, recursos(nombre), tramos_horarios(nombre, hora_inicio, hora_fin, orden)").eq("user_id", user.id).gte("fecha", todayStr).order("fecha", { ascending: true }).limit(5)
      : Promise.resolve({ data: [] }),
    showTIC
      ? supabase.from("peticiones_tic").select("id, codigo, titulo, estado, prioridad, created_at").eq("autor_id", user.id).neq("estado", "finalizada").order("created_at", { ascending: false }).limit(5)
      : Promise.resolve({ data: [] }),
    showMantenimiento
      ? supabase.from("peticiones_mantenimiento").select("id, codigo, titulo, estado, prioridad, created_at").eq("autor_id", user.id).not("estado", "in", '("finalizada","rechazada")').order("created_at", { ascending: false }).limit(5)
      : Promise.resolve({ data: [] }),
    showCalendario
      ? supabase.from("calendar_eventos").select("id, titulo, descripcion, fecha_inicio, fecha_fin, todo_el_dia, hora_inicio, hora_fin").eq("tipo", "Activ. Extraescolar").gte("fecha_inicio", todayStr).lte("fecha_inicio", limitStr).order("fecha_inicio", { ascending: true })
      : Promise.resolve({ data: [] }),
    showCitasFamilias && profesorId
      ? supabase.from("citas_familias").select("id, codigo, alumno_nombre, alumno_curso, familiar_nombre, fecha, hora_inicio, lugar, estado").eq("profesor_id", profesorId).in("estado", ["pendiente", "confirmada"]).or(`fecha.lte.${citasLimitStr},fecha.is.null`).order("fecha", { ascending: true, nullsFirst: true }).limit(5)
      : Promise.resolve({ data: [] }),
  ]);

  const anuncios = anunciosResult.data;

  const reservasCarros: ReservaDashboard[] = ((reservasCarrosResult.data ?? []) as Record<string, unknown>[]).map((r) => {
    const carro = r.carros as { nombre: string } | null;
    const tramo = r.tramos_horarios as { nombre: string; hora_inicio: string; hora_fin: string; orden: number } | null;
    return {
      id: r.id as number,
      fecha: r.fecha as string,
      nombre: carro?.nombre ?? "Carro",
      tramo: tramo?.nombre ?? "",
      hora_inicio: tramo?.hora_inicio ?? "",
      hora_fin: tramo?.hora_fin ?? "",
      tramo_orden: tramo?.orden ?? 0,
      info: (r.aula as string) ?? "",
      tipo: "carro",
      href: "/reservas/carros",
      user_name: userName,
    };
  });

  const reservasEspacios: ReservaDashboard[] = ((reservasEspaciosResult.data ?? []) as Record<string, unknown>[]).map((r) => {
    const espacio = r.espacios as { nombre: string } | null;
    const tramo = r.tramos_horarios as { nombre: string; hora_inicio: string; hora_fin: string; orden: number } | null;
    return {
      id: r.id as number,
      fecha: r.fecha as string,
      nombre: espacio?.nombre ?? "Espacio",
      tramo: tramo?.nombre ?? "",
      hora_inicio: tramo?.hora_inicio ?? "",
      hora_fin: tramo?.hora_fin ?? "",
      tramo_orden: tramo?.orden ?? 0,
      info: (r.motivo as string) ?? "",
      tipo: "espacio",
      href: "/reservas/espacios",
      user_name: userName,
    };
  });

  const reservasRecursos: ReservaDashboard[] = ((reservasRecursosResult.data ?? []) as Record<string, unknown>[]).map((r) => {
    const recurso = r.recursos as { nombre: string } | null;
    const tramo = r.tramos_horarios as { nombre: string; hora_inicio: string; hora_fin: string; orden: number } | null;
    return {
      id: r.id as number,
      fecha: r.fecha as string,
      nombre: recurso?.nombre ?? "Recurso",
      tramo: tramo?.nombre ?? "",
      hora_inicio: tramo?.hora_inicio ?? "",
      hora_fin: tramo?.hora_fin ?? "",
      tramo_orden: tramo?.orden ?? 0,
      info: (r.aula as string) ?? "",
      tipo: "recurso",
      href: "/reservas/recursos",
      user_name: userName,
    };
  });

  const proximasReservas = [...reservasCarros, ...reservasEspacios, ...reservasRecursos].sort((a, b) => {
    const dateCompare = a.fecha.localeCompare(b.fecha);
    return dateCompare !== 0 ? dateCompare : a.tramo_orden - b.tramo_orden;
  }).slice(0, 6);

  const peticionesTIC = (peticionesResult.data ?? []) as Pick<
    PeticionTIC,
    "id" | "codigo" | "titulo" | "estado" | "prioridad" | "created_at"
  >[];

  const peticionesMantenimiento = (mantenimientoResult.data ?? []) as Pick<
    PeticionMantenimiento,
    "id" | "codigo" | "titulo" | "estado" | "prioridad" | "created_at"
  >[];

  interface CitaDashboard {
    id: number;
    codigo: string;
    alumno_nombre: string;
    alumno_curso: string;
    familiar_nombre: string;
    fecha: string | null;
    hora_inicio: string | null;
    lugar: string | null;
    estado: string;
  }
  const citasDashboard = (citasResult.data ?? []) as CitaDashboard[];
  const citasPendientesCount = citasDashboard.filter((c) => c.estado === "pendiente").length;

  interface EventoExtraescolar {
    id: number;
    titulo: string;
    descripcion: string | null;
    fecha_inicio: string;
    fecha_fin: string;
    todo_el_dia: boolean;
    hora_inicio: string | null;
    hora_fin: string | null;
  }
  const extraescolares = (extraescolaresResult.data ?? []) as EventoExtraescolar[];

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

      {/* Widgets row: anuncios + reservas */}
      {(showAnuncios || showReservas) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {showAnuncios && (
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
          )}

          {showReservas && <ProximasReservas reservas={proximasReservas} />}
        </div>
      )}

      {/* Citas con Familias + Actividades Extraescolares — side by side on desktop */}
      {(showCitasFamilias || showCalendario) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {showCitasFamilias && (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="bg-red-600 px-5 py-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CalendarClock size={16} className="text-white" />
                  <h3 className="text-white font-semibold text-sm">
                    Citas con Familias — {diasVistaCitas} días
                  </h3>
                </div>
                {citasPendientesCount > 0 && (
                  <span className="bg-amber-400 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-full">
                    {citasPendientesCount} pendiente{citasPendientesCount > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <div className="divide-y divide-gray-50">
                {citasDashboard.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-8">No hay citas próximas</p>
                ) : (
                  citasDashboard.map((c) => {
                    const fechaLabel = c.fecha
                      ? new Date(c.fecha + "T00:00:00").toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" })
                      : "Sin fecha";
                    const isPendiente = c.estado === "pendiente";
                    return (
                      <div key={c.id} className="px-5 py-3 flex items-center gap-3">
                        <div className={`flex-shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium min-w-[84px] text-center ${isPendiente ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>
                          {fechaLabel}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {c.alumno_nombre} <span className="text-gray-400 font-normal">({c.alumno_curso})</span>
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {c.familiar_nombre}
                            {c.hora_inicio && <> · {c.hora_inicio}</>}
                            {c.lugar && <> · {c.lugar}</>}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${isPendiente ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                          {isPendiente ? "Pendiente" : "Confirmada"}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="px-5 py-3 border-t border-gray-100">
                <Link href="/citas-familias" className="text-sm text-red-600 hover:underline cursor-pointer">
                  Ver todas →
                </Link>
              </div>
            </div>
          )}

          {showCalendario && (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="bg-orange-500 px-5 py-3 flex items-center gap-2">
                <GraduationCap size={16} className="text-white" />
                <h3 className="text-white font-semibold text-sm">
                  Activ. Extraescolares — {diasVistaExtraescolares} días
                </h3>
              </div>
              <div className="divide-y divide-gray-50">
                {extraescolares.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-8">
                    No hay actividades programadas
                  </p>
                ) : (
                  extraescolares.map((e) => {
                    const [y, m, d] = e.fecha_inicio.split("-").map(Number);
                    const fechaLabel = new Date(y, m - 1, d).toLocaleDateString("es-ES", {
                      weekday: "short", day: "numeric", month: "short",
                    });
                    return (
                      <div key={e.id} className="px-5 py-3 flex items-start gap-3">
                        <div className="flex-shrink-0 bg-orange-50 text-orange-600 rounded-lg px-2.5 py-1.5 text-xs font-medium capitalize min-w-[84px] text-center">
                          {fechaLabel}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{e.titulo}</p>
                          {e.descripcion && (
                            <p className="text-xs text-gray-500 mt-0.5 truncate">{e.descripcion}</p>
                          )}
                          {!e.todo_el_dia && e.hora_inicio && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {e.hora_inicio.slice(0, 5)}{e.hora_fin ? ` – ${e.hora_fin.slice(0, 5)}` : ""}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="px-5 py-3 border-t border-gray-100">
                <Link href="/calendario" className="text-sm text-orange-600 hover:underline cursor-pointer">
                  Ver calendario →
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TIC petitions */}
      {showTIC && (
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
      )}

      {/* Maintenance petitions */}
      {showMantenimiento && (
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
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Megaphone,
  Monitor,
  Wrench,
  Building2,
  BookOpen,
  Laptop,
  Users,
  Building,
  HelpCircle,
  ChevronDown,
  Settings,
  CalendarClock,
  UserX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { Perfil } from "@/lib/types";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles?: string[];
  slug?: string; // matches modulos_config.slug — hidden when inactive (unless admin)
}

interface NavGroup {
  title: string;
  items: NavItem[];
  roles?: string[];
}

const navGroups: NavGroup[] = [
  {
    title: "MENÚ PRINCIPAL",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={18} /> },
      { label: "Calendario", href: "/calendario", icon: <Calendar size={18} />, slug: "calendario" },
      { label: "Tablón de Anuncios", href: "/anuncios", icon: <Megaphone size={18} />, slug: "anuncios" },
      { label: "Citas con Familias", href: "/citas-familias", icon: <CalendarClock size={18} />, slug: "citas-familias" },
      { label: "Ausencias", href: "/ausencias", icon: <UserX size={18} />, slug: "ausencias" },
    ],
  },
  {
    title: "PETICIONES",
    items: [
      { label: "Peticiones TIC", href: "/peticiones-tic", icon: <Monitor size={18} />, slug: "peticiones-tic" },
      { label: "Peticiones Mantenimiento", href: "/peticiones-mantenimiento", icon: <Wrench size={18} />, slug: "peticiones-mantenimiento" },
    ],
  },
  {
    title: "RESERVAS",
    items: [
      { label: "Carros de Portátiles", href: "/reservas/carros", icon: <Laptop size={18} />, slug: "reservas/carros" },
      { label: "Reserva de Espacios", href: "/reservas/espacios", icon: <Building2 size={18} />, slug: "reservas/espacios" },
      { label: "Reserva de Recursos", href: "/reservas/recursos", icon: <BookOpen size={18} />, slug: "reservas/recursos" },
    ],
  },
  {
    title: "ADMINISTRACIÓN",
    roles: ["Admin", "Directiva"],
    items: [
      { label: "Gestión de Usuarios", href: "/admin/usuarios", icon: <Users size={18} />, roles: ["Admin"] },
      { label: "Departamentos", href: "/admin/departamentos", icon: <Building size={18} />, roles: ["Admin"] },
      { label: "Módulos", href: "/admin/modulos", icon: <Building size={18} />, roles: ["Admin"] },
      { label: "Configuración", href: "/configuracion", icon: <Settings size={18} />, roles: ["Admin", "Directiva"] },
    ],
  },
  {
    title: "SOPORTE",
    items: [
      { label: "Ayuda y Tutoriales", href: "/ayuda", icon: <HelpCircle size={18} /> },
    ],
  },
];

interface SidebarProps {
  userRoles: Perfil[];
  userName: string;
  inactiveModuleSlugs: string[];
  version: string;
}

export function Sidebar({ userRoles, userName, inactiveModuleSlugs, version }: SidebarProps) {
  const pathname = usePathname();
  const roleNames = userRoles.map((r) => r.nombre);
  const isAdmin = roleNames.includes("Admin");
  const isOrdenanza = roleNames.includes("Ordenanza") && !roleNames.some((r) => ["Admin", "Directiva"].includes(r));

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  function toggleGroup(title: string) {
    setCollapsed((prev) => ({ ...prev, [title]: !prev[title] }));
  }

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <aside
      className="flex flex-col h-full overflow-y-auto"
      style={{ backgroundColor: "var(--sidebar-bg)", width: "var(--sidebar-width)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-blue-800">
        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-blue-700" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" />
          </svg>
        </div>
        <div className="overflow-hidden">
          <p className="text-white font-semibold text-sm leading-tight truncate">IES Julio Verne</p>
          <p className="text-blue-300 text-xs truncate">{userName}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
        {isOrdenanza ? (
          <>
            <Link
              href="/dashboard"
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                pathname === "/dashboard"
                  ? "bg-blue-600 text-white font-medium"
                  : "text-blue-100 hover:bg-blue-800/60"
              )}
            >
              <span className="flex-shrink-0"><LayoutDashboard size={18} /></span>
              <span>Dashboard</span>
            </Link>
            <Link
              href="/ordenanzas"
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                pathname.startsWith("/ordenanzas")
                  ? "bg-blue-600 text-white font-medium"
                  : "text-blue-100 hover:bg-blue-800/60"
              )}
            >
              <span className="flex-shrink-0"><CalendarClock size={18} /></span>
              <span>Citas del día</span>
            </Link>
          </>
        ) : navGroups.map((group) => {
          // Hide admin groups from non-admins
          if (group.roles && !group.roles.some((r) => roleNames.includes(r)) && !isAdmin) {
            return null;
          }
          const isCollapsed = collapsed[group.title];

          return (
            <div key={group.title} className="mb-2">
              <button
                onClick={() => toggleGroup(group.title)}
                className="w-full flex items-center justify-between px-2 py-1 text-xs font-semibold tracking-wider text-blue-300 hover:text-blue-100 transition-colors"
              >
                {group.title}
                <ChevronDown
                  size={12}
                  className={cn("transition-transform", isCollapsed && "-rotate-90")}
                />
              </button>

              {!isCollapsed && (
                <div className="mt-1 space-y-0.5">
                  {group.items.map((item) => {
                    if (item.roles && !item.roles.some((r) => roleNames.includes(r)) && !isAdmin) {
                      return null;
                    }
                    if (item.slug && !isAdmin && inactiveModuleSlugs.includes(item.slug)) {
                      return null;
                    }
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                          active
                            ? "bg-blue-600 text-white font-medium"
                            : "text-blue-100 hover:bg-blue-800/60"
                        )}
                      >
                        <span className="flex-shrink-0">{item.icon}</span>
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Version */}
      <div className="flex-shrink-0 px-5 py-3 border-t border-blue-800 text-center">
        <p className="text-blue-400 text-xs">v{version}</p>
      </div>
    </aside>
  );
}

"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  LogOut,
  ChevronDown,
  User,
  Menu,
  X,
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
  Settings,
  CalendarClock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Perfil } from "@/lib/types";

interface HeaderProps {
  userName: string;
  userEmail: string;
  userRoles: Perfil[];
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles?: string[];
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
      { label: "Calendario", href: "/calendario", icon: <Calendar size={18} /> },
      { label: "Tablón de Anuncios", href: "/anuncios", icon: <Megaphone size={18} /> },
      { label: "Citas con Familias", href: "/citas-familias", icon: <CalendarClock size={18} /> },
    ],
  },
  {
    title: "PETICIONES",
    items: [
      { label: "Peticiones TIC", href: "/peticiones-tic", icon: <Monitor size={18} /> },
      { label: "Peticiones Mantenimiento", href: "/peticiones-mantenimiento", icon: <Wrench size={18} /> },
    ],
  },
  {
    title: "RESERVAS",
    items: [
      { label: "Carros de Portátiles", href: "/reservas/carros", icon: <Laptop size={18} /> },
      { label: "Reserva de Espacios", href: "/reservas/espacios", icon: <Building2 size={18} /> },
      { label: "Reserva de Recursos", href: "/reservas/recursos", icon: <BookOpen size={18} /> },
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

export function Header({ userName, userEmail, userRoles }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const roleNames = userRoles.map((r) => r.nombre);
  const isAdmin = roleNames.includes("Admin");
  const isOrdenanza = roleNames.includes("Ordenanza") && !roleNames.some((r) => ["Admin", "Directiva"].includes(r));

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === href;
    return pathname.startsWith(href);
  }

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <>
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 flex-shrink-0">
        {/* Left side: hamburger (mobile) + logo + title */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDrawerOpen(true)}
            className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label="Abrir menú"
          >
            <Menu size={22} />
          </button>
          <Image
            src="/logo.jpg"
            alt="Logo IES Julio Verne"
            width={36}
            height={36}
            className="rounded-lg object-contain flex-shrink-0"
            priority
          />
          <h1 className="text-base font-semibold text-gray-800 tracking-tight">
            Intranet IES Julio Verne
          </h1>
        </div>

        {/* Right side: user menu */}
        <div className="flex items-center gap-1">
          <div className="relative">
          <button
            onClick={() => setUserMenuOpen((o) => !o)}
            className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
              {initials}
            </div>
            <span className="text-sm font-medium text-gray-700 hidden sm:block max-w-[120px] truncate">
              {userName}
            </span>
            <ChevronDown size={14} className="text-gray-400" />
          </button>

          {userMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-lg border border-gray-100 z-20 py-1">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="font-medium text-gray-900 text-sm truncate">{userName}</p>
                  <p className="text-xs text-gray-500 truncate">{userEmail}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {userRoles.map((r) => (
                      <span
                        key={r.id}
                        className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full"
                      >
                        {r.nombre}
                      </span>
                    ))}
                  </div>
                </div>
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  <User size={15} />
                  Mi perfil
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={15} />
                  Cerrar sesión
                </button>
              </div>
            </>
          )}
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Drawer panel */}
          <div
            className="absolute left-0 top-0 bottom-0 w-72 flex flex-col overflow-hidden"
            style={{ backgroundColor: "var(--sidebar-bg)" }}
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-blue-800 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-700" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-semibold text-sm leading-tight">IES Julio Verne</p>
                  <p className="text-blue-300 text-xs truncate max-w-[160px]">{userName}</p>
                </div>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-lg text-blue-300 hover:text-white hover:bg-blue-800/60 transition-colors"
                aria-label="Cerrar menú"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable nav */}
            <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
              {isOrdenanza ? (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setDrawerOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-colors",
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
                    onClick={() => setDrawerOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-colors",
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
                if (group.roles && !group.roles.some((r) => roleNames.includes(r))) return null;
                const visibleItems = group.items.filter(
                  (item) => !item.roles || item.roles.some((r) => roleNames.includes(r)) || isAdmin
                );
                if (visibleItems.length === 0) return null;
                return (
                  <div key={group.title} className="mb-2">
                    <p className="px-2 py-1 text-xs font-semibold tracking-wider text-blue-300">
                      {group.title}
                    </p>
                    <div className="mt-1 space-y-0.5">
                      {visibleItems.map((item) => {
                        const active = isActive(item.href);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setDrawerOpen(false)}
                            className={cn(
                              "flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-colors",
                              active
                                ? "bg-blue-600 text-white font-medium"
                                : "text-blue-100 hover:bg-blue-800/60"
                            )}
                          >
                            <span className="flex-shrink-0">{item.icon}</span>
                            <span>{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </nav>

            {/* Drawer footer */}
            <div className="flex-shrink-0 border-t border-blue-800 p-3">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-blue-100 hover:bg-blue-800/60 transition-colors"
              >
                <LogOut size={18} />
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

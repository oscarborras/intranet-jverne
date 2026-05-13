"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Calendar, Megaphone, Monitor, Wrench, UserX } from "lucide-react";
import { cn } from "@/lib/utils";

const mobileNavItems = [
  { label: "Inicio",     href: "/dashboard",                  icon: <LayoutDashboard size={20} />, slug: undefined },
  { label: "Calendario", href: "/calendario",                 icon: <Calendar size={20} />,        slug: "calendario" },
  { label: "Anuncios",   href: "/anuncios",                   icon: <Megaphone size={20} />,       slug: "anuncios" },
  { label: "Ausencias",  href: "/ausencias",                  icon: <UserX size={20} />,           slug: "ausencias" },
  { label: "TIC",        href: "/peticiones-tic",             icon: <Monitor size={20} />,         slug: "peticiones-tic" },
  { label: "Mant.",      href: "/peticiones-mantenimiento",   icon: <Wrench size={20} />,          slug: "peticiones-mantenimiento" },
];

interface MobileNavProps {
  inactiveModuleSlugs: string[];
  isAdmin: boolean;
}

export function MobileNav({ inactiveModuleSlugs, isAdmin }: MobileNavProps) {
  const pathname = usePathname();

  const visibleItems = mobileNavItems.filter(
    (item) => !item.slug || isAdmin || !inactiveModuleSlugs.includes(item.slug)
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex md:hidden safe-area-pb">
      {visibleItems.map((item) => {
        const active =
          item.href === "/dashboard"
            ? pathname === item.href
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs transition-colors min-h-[56px]",
              active ? "text-blue-600" : "text-gray-500"
            )}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

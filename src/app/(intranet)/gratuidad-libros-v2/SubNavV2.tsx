"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Library, BookCopy, Tags, HandHelping, Undo2, ScanSearch, BarChart3, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = "/gratuidad-libros-v2";

interface Item {
  label: string;
  href: string;
  icon: React.ReactNode;
  gestor?: boolean;
}

const items: Item[] = [
  { label: "Resumen", href: BASE, icon: <LayoutGrid size={16} /> },
  { label: "Entrega", href: `${BASE}/entrega`, icon: <HandHelping size={16} /> },
  { label: "Devolución", href: `${BASE}/devolucion`, icon: <Undo2 size={16} /> },
  { label: "Consulta", href: `${BASE}/consulta`, icon: <ScanSearch size={16} /> },
  { label: "Ejemplares", href: `${BASE}/ejemplares`, icon: <BookCopy size={16} /> },
  { label: "Informes", href: `${BASE}/informes`, icon: <BarChart3 size={16} /> },
  { label: "Incidencias", href: `${BASE}/incidencias`, icon: <ClipboardList size={16} />, gestor: true },
  { label: "Títulos", href: `${BASE}/titulos`, icon: <Library size={16} />, gestor: true },
  { label: "Etiquetas", href: `${BASE}/etiquetas`, icon: <Tags size={16} />, gestor: true },
];

export function SubNavV2({ canManage }: { canManage: boolean }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Secciones de Gratuidad v2" className="-mx-4 px-4 overflow-x-auto sm:mx-0 sm:px-0">
      <ul className="flex gap-2 min-w-max">
        {items.filter((i) => !i.gestor || canManage).map((i) => {
          const active = i.href === BASE ? pathname === BASE : pathname.startsWith(i.href);
          return (
            <li key={i.href}>
              <Link
                href={i.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-colors",
                  active
                    ? "bg-gray-900 text-white"
                    : "bg-white border border-gray-300 text-gray-600 hover:border-gray-400",
                )}
              >
                {i.icon}
                {i.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

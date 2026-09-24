import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  basePath: string;
  page: number;
  totalPages: number;
  params: Record<string, string>;
}

function pageHref(basePath: string, params: Record<string, string>, page: number) {
  const sp = new URLSearchParams(Object.entries(params).filter(([, v]) => v));
  if (page > 1) sp.set("page", String(page));
  const qs = sp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function HistorialPaginacion({ basePath, page, totalPages, params }: Props) {
  if (totalPages <= 1) return null;
  const linkClass = "flex items-center gap-1 min-h-11 px-4 py-2 text-sm font-medium border border-gray-200 bg-white rounded-lg hover:bg-gray-50 transition-colors";
  const disabledClass = "flex items-center gap-1 min-h-11 px-4 py-2 text-sm font-medium border border-gray-100 bg-gray-50 text-gray-300 rounded-lg";
  return (
    <nav aria-label="Paginación" className="flex items-center justify-between gap-2">
      {page > 1 ? (
        <Link href={pageHref(basePath, params, page - 1)} className={linkClass}>
          <ChevronLeft size={16} /> Anterior
        </Link>
      ) : (
        <span className={disabledClass}><ChevronLeft size={16} /> Anterior</span>
      )}
      <span className="text-sm text-gray-500">Página {page} de {totalPages}</span>
      {page < totalPages ? (
        <Link href={pageHref(basePath, params, page + 1)} className={linkClass}>
          Siguiente <ChevronRight size={16} />
        </Link>
      ) : (
        <span className={disabledClass}>Siguiente <ChevronRight size={16} /></span>
      )}
    </nav>
  );
}

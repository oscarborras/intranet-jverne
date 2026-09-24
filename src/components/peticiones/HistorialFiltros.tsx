import Link from "next/link";
import { Search } from "lucide-react";

interface Props {
  basePath: string;
  q: string;
  desde: string;
  hasta: string;
  searchPlaceholder: string;
}

// Plain GET form: filters live in the URL so results can be shared and paginated
export function HistorialFiltros({ basePath, q, desde, hasta, searchPlaceholder }: Props) {
  const hasFilters = !!(q || desde || hasta);
  return (
    <form method="get" action={basePath} className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 space-y-3">
      <div>
        <label htmlFor="historial-q" className="block text-xs font-medium text-gray-600 mb-1">Buscar</label>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            id="historial-q"
            name="q"
            defaultValue={q}
            placeholder={searchPlaceholder}
            className="w-full min-h-11 border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="historial-desde" className="block text-xs font-medium text-gray-600 mb-1">Finalizada desde</label>
          <input
            id="historial-desde"
            type="date"
            name="desde"
            defaultValue={desde}
            className="w-full min-h-11 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label htmlFor="historial-hasta" className="block text-xs font-medium text-gray-600 mb-1">Finalizada hasta</label>
          <input
            id="historial-hasta"
            type="date"
            name="hasta"
            defaultValue={hasta}
            className="w-full min-h-11 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        {hasFilters && (
          <Link
            href={basePath}
            className="flex items-center min-h-11 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Limpiar
          </Link>
        )}
        <button
          type="submit"
          className="flex items-center gap-2 min-h-11 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
        >
          <Search size={15} />
          Buscar
        </button>
      </div>
    </form>
  );
}

import { Clock, ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getExternalUrls } from "@/lib/externalUrls";

export default async function HorariosPage() {
  await requireUser();
  const url = (await getExternalUrls()).horarios;

  return (
    <div className="flex flex-col gap-3 h-[calc(100dvh-3.5rem-1rem-5rem)] md:h-[calc(100dvh-3.5rem-3rem)]">
      <div className="flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Clock size={24} className="text-blue-600 flex-shrink-0" />
          <h1 className="text-xl font-bold text-gray-900">Horarios</h1>
        </div>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 min-h-11 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <ExternalLink size={16} />
            <span className="hidden sm:inline">Abrir en pestaña nueva</span>
            <span className="sm:hidden">Abrir</span>
          </a>
        )}
      </div>

      {url ? (
        <iframe
          src={url}
          title="Horarios del centro"
          className="flex-1 w-full rounded-xl border border-gray-200 bg-white"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-sm text-gray-500">
          La web de horarios no está configurada. Un administrador puede indicar su dirección (https) en
          Configuración → URLs.
        </div>
      )}
    </div>
  );
}

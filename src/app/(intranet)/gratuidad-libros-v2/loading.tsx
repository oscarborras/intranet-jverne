import { Loader2 } from "lucide-react";

/**
 * Shown instantly while any page of the module loads its data on the server.
 * The layout (title + sub-navigation) stays visible above it.
 */
export default function GratuidadV2Loading() {
  return (
    <div role="status" aria-live="polite" className="space-y-6">
      <div className="flex items-center justify-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-blue-800">
        <Loader2 size={20} className="animate-spin flex-shrink-0" aria-hidden="true" />
        <span className="text-sm font-medium">Cargando datos, espera un momento…</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3" aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse">
            <div className="h-3 w-20 bg-gray-200 rounded mb-3" />
            <div className="h-8 w-14 bg-gray-200 rounded" />
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse" aria-hidden="true">
        <div className="h-4 w-48 bg-gray-200 rounded mb-4" />
        <div className="h-64 bg-gray-100 rounded-lg" />
      </div>
    </div>
  );
}

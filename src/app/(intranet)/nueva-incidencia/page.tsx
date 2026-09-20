import Link from "next/link";
import { AlertCircle, Monitor, Wrench } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getModuleAccess } from "@/lib/modulos";

export default async function NuevaIncidenciaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { isAdmin, inactiveModuleSlugs } = await getModuleAccess(supabase, user!.id);

  const showTIC = isAdmin || !inactiveModuleSlugs.includes("peticiones-tic");
  const showMantenimiento = isAdmin || !inactiveModuleSlugs.includes("peticiones-mantenimiento");

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <AlertCircle size={24} className="text-blue-600" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">Nueva incidencia</h1>
          <p className="text-sm text-gray-500">¿Qué tipo de problema quieres comunicar?</p>
        </div>
      </div>

      {!showTIC && !showMantenimiento ? (
        <div className="bg-white rounded-xl border border-gray-100 py-16 text-center">
          <p className="text-sm text-gray-400">No tienes ningún tipo de incidencia disponible</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {showTIC && (
            <Link
              href="/peticiones-tic?nueva=1"
              className="flex flex-col items-start gap-3 p-5 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <div className="p-2.5 bg-blue-100 rounded-lg">
                <Monitor size={22} className="text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Un equipo o programa</p>
                <p className="text-sm text-gray-500 mt-1">
                  Ordenador, impresora, fotocopiadora, pizarra digital, proyector, red, Internet, aplicación...
                </p>
              </div>
            </Link>
          )}

          {showMantenimiento && (
            <Link
              href="/peticiones-mantenimiento?nueva=1"
              className="flex flex-col items-start gap-3 p-5 bg-white border-2 border-gray-200 rounded-xl hover:border-red-400 hover:bg-red-50 transition-colors"
            >
              <div className="p-2.5 bg-red-100 rounded-lg">
                <Wrench size={22} className="text-red-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Las instalaciones o el mobiliario</p>
                <p className="text-sm text-gray-500 mt-1">
                  Aulas, puertas, mobiliario, limpieza, luz, climatización...
                </p>
              </div>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

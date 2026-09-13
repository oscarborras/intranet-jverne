"use client";

import Link from "next/link";
import { Upload, Database, Briefcase, Users } from "lucide-react";

interface Entidad {
  slug: string;
  nombre: string;
  descripcion: string;
  icono: React.ReactNode;
  colorIcono: string;
  colorBoton: string;
}

// Añadir aquí futuras entidades importables (tutores, …)
const ENTIDADES: Entidad[] = [
  {
    slug: "profesores",
    nombre: "Profesores",
    descripcion:
      "Actualiza el listado de profesores desde el fichero de Séneca. Da de alta a los nuevos y marca el cese de los que ya no están en el centro.",
    icono: <Briefcase size={20} className="text-amber-600" />,
    colorIcono: "bg-amber-100",
    colorBoton: "bg-amber-500 hover:bg-amber-600",
  },
  {
    slug: "alumnos",
    nombre: "Alumnos",
    descripcion:
      "Actualiza el listado completo de alumnos. El sistema procesará el archivo para crear o actualizar sus registros.",
    icono: <Users size={20} className="text-blue-600" />,
    colorIcono: "bg-blue-100",
    colorBoton: "bg-blue-600 hover:bg-blue-700",
  },
];

export function ImportarClient() {
  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Cabecera */}
      <div className="flex items-center gap-3">
        <Upload size={24} className="text-blue-600" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">Importar Datos</h1>
          <p className="text-sm text-gray-500">Carga masiva de datos en el sistema</p>
        </div>
      </div>

      {/* Panel introductorio */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="bg-blue-600 px-5 py-3 flex items-center gap-2">
          <Upload size={16} className="text-white" />
          <h2 className="text-white font-semibold text-sm">Importación de Datos</h2>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-gray-600">
            Desde este panel puedes realizar la carga masiva de datos en el sistema.
            Selecciona la categoría que deseas actualizar usando el módulo correspondiente.
          </p>
        </div>
      </div>

      {/* Entidades importables */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {ENTIDADES.map((e) => (
          <div
            key={e.slug}
            className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-3"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${e.colorIcono} rounded-lg flex items-center justify-center flex-shrink-0`}>
                {e.icono}
              </div>
              <p className="font-semibold text-gray-900">{e.nombre}</p>
            </div>

            <p className="text-sm text-gray-500 leading-snug flex-1">{e.descripcion}</p>

            <div className="flex items-center gap-2 pt-1">
              <Link
                href={`/admin/importar/${e.slug}`}
                className={`flex items-center gap-1.5 ${e.colorBoton} text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors`}
              >
                <Upload size={14} /> Importar
              </Link>
              <Link
                href={`/admin/importar/${e.slug}/consultar`}
                className="flex items-center gap-1.5 border border-gray-300 text-gray-600 text-sm font-medium px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Database size={14} /> Consultar
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

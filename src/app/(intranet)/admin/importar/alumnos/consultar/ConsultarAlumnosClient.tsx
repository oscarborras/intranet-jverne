"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, X, Upload, Users2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AlumnoDbRow } from "@/lib/import/alumnos";

interface Props {
  alumnos: AlumnoDbRow[];
}

type Filtro = "activos" | "bajas" | "todos";

export function ConsultarAlumnosClient({ alumnos }: Props) {
  const [filtro, setFiltro] = useState<Filtro>("activos");
  const [soloSinUnidad, setSoloSinUnidad] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const esActivo = (a: AlumnoDbRow) => a.estado_matricula === null;

  const listado = useMemo(() => {
    const terminos = busqueda.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return alumnos
      .filter((a) => (filtro === "todos" ? true : filtro === "activos" ? esActivo(a) : !esActivo(a)))
      .filter((a) => !soloSinUnidad || !a.unidad)
      .filter((a) => {
        if (terminos.length === 0) return true;
        const texto = `${a.alumno} ${a.unidad} ${a.nie ?? ""}`.toLowerCase();
        return terminos.every((t) => texto.includes(t));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alumnos, filtro, soloSinUnidad, busqueda]);

  const activos = alumnos.filter(esActivo).length;
  const sinUnidad = alumnos.filter((a) => !a.unidad).length;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="space-y-1">
        <Link href="/admin/importar" className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft size={13} /> Importar Datos
        </Link>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Listado de alumnos</h1>
            <p className="text-sm text-gray-500">
              {activos} activos de {alumnos.length} registrados
            </p>
          </div>
          <Link
            href="/admin/importar/alumnos"
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Upload size={14} /> Importar
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          {([
            ["activos", "Activos"],
            ["bajas", "Bajas"],
            ["todos", "Todos"],
          ] as [Filtro, string][]).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setFiltro(id)}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
                filtro === id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setSoloSinUnidad((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
            soloSinUnidad
              ? "bg-amber-100 border-amber-200 text-amber-700"
              : "bg-white border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          )}
          title="Mostrar solo los alumnos sin unidad asignada"
        >
          <Users2 size={14} /> Sin unidad
          <span className={cn(
            "text-[11px] font-semibold px-1.5 py-0.5 rounded-full",
            soloSinUnidad ? "bg-amber-200 text-amber-800" : "bg-gray-100 text-gray-500"
          )}>
            {sinUnidad}
          </span>
        </button>

        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, unidad o NIE..."
            className="w-full border border-gray-200 rounded-lg pl-9 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Alumno/a</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Unidad</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">NIE</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tutor/a 1</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {listado.map((a) => (
                <tr key={a.id} className={cn("hover:bg-gray-50/50 transition-colors", !esActivo(a) && "opacity-60")}>
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{a.alumno}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {a.unidad || <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">sin unidad</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{a.nie ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {a.tutor1_nombre || a.tutor1_primer_apellido ? (
                      <div>
                        <p>{[a.tutor1_nombre, a.tutor1_primer_apellido, a.tutor1_segundo_apellido].filter(Boolean).join(" ")}</p>
                        {a.tutor1_telefono && <p className="text-xs text-gray-400">{a.tutor1_telefono}</p>}
                      </div>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {esActivo(a)
                      ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Activo</span>
                      : <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">{a.estado_matricula}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {listado.length === 0 && (
          <div className="py-16 text-center text-sm text-gray-400">No hay alumnos que coincidan con el filtro</div>
        )}
      </div>
    </div>
  );
}

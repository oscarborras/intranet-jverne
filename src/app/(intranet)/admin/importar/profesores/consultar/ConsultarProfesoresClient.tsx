"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, X, Upload, MailX } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProfesorDbRow } from "@/lib/import/profesores";

interface Props {
  profesores: ProfesorDbRow[];
}

type Filtro = "activos" | "cesados" | "todos";

function localDateISO(): string {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}

function formatFecha(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

export function ConsultarProfesoresClient({ profesores }: Props) {
  const [filtro, setFiltro] = useState<Filtro>("activos");
  const [soloSinEmail, setSoloSinEmail] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const hoy = localDateISO();
  const esActivo = (p: ProfesorDbRow) => p.fecha_cese === null || p.fecha_cese > hoy;

  const listado = useMemo(() => {
    const terminos = busqueda.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return profesores
      .filter((p) => (filtro === "todos" ? true : filtro === "activos" ? esActivo(p) : !esActivo(p)))
      .filter((p) => !soloSinEmail || !p.email)
      .filter((p) => {
        if (terminos.length === 0) return true;
        const texto = `${p.profesor} ${p.puesto} ${p.email ?? ""}`.toLowerCase();
        return terminos.every((t) => texto.includes(t));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profesores, filtro, soloSinEmail, busqueda]);

  const activos = profesores.filter(esActivo).length;
  const sinEmail = profesores.filter((p) => !p.email).length;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="space-y-1">
        <Link href="/admin/importar" className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft size={13} /> Importar Datos
        </Link>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Listado de profesores</h1>
            <p className="text-sm text-gray-500">
              {activos} activos de {profesores.length} registrados
            </p>
          </div>
          <Link
            href="/admin/importar/profesores"
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
            ["cesados", "Cesados"],
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
          onClick={() => setSoloSinEmail((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
            soloSinEmail
              ? "bg-amber-100 border-amber-200 text-amber-700"
              : "bg-white border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          )}
          title="Mostrar solo los profesores sin email"
        >
          <MailX size={14} /> Sin email
          <span className={cn(
            "text-[11px] font-semibold px-1.5 py-0.5 rounded-full",
            soloSinEmail ? "bg-amber-200 text-amber-800" : "bg-gray-100 text-gray-500"
          )}>
            {sinEmail}
          </span>
        </button>

        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, puesto o email..."
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Profesor/a</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Puesto</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Alta</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Cese</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {listado.map((p) => (
                <tr key={p.id} className={cn("hover:bg-gray-50/50 transition-colors", !esActivo(p) && "opacity-60")}>
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{p.profesor}</td>
                  <td className="px-4 py-3 text-gray-600">{p.puesto}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {p.email ?? <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">sin email</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatFecha(p.fecha_alta)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {p.fecha_cese
                      ? <span className={esActivo(p) ? "text-gray-500" : "text-red-600 font-medium"}>{formatFecha(p.fecha_cese)}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {listado.length === 0 && (
          <div className="py-16 text-center text-sm text-gray-400">No hay profesores que coincidan con el filtro</div>
        )}
      </div>
    </div>
  );
}

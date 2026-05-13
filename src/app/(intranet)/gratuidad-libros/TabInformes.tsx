"use client";

import { useMemo } from "react";
import { Users, RotateCcw, AlertTriangle, Download, Printer, BookOpen } from "lucide-react";
import type { PrestamoLibro, LibroCatalogo, Alumno } from "@/lib/types";

interface Props {
  prestamos: PrestamoLibro[];       // active loans (not returned)
  todosPrestamos: PrestamoLibro[];  // all loans this course including returned
  libros: LibroCatalogo[];
  alumnos: Alumno[];
  unidadesGratuidad: string[];
  cursoEscolar: string;
}

const ESO_LEVELS = [
  { label: "1º ESO", prefix: "1" },
  { label: "2º ESO", prefix: "2" },
  { label: "3º ESO", prefix: "3" },
  { label: "4º ESO", prefix: "4" },
];

function pct(num: number, den: number) {
  if (den === 0) return 0;
  return Math.round((num / den) * 100);
}

interface BarRowProps {
  label: string;
  value: string | number;
  barPct: number;
  sub?: string;
  color?: string;
}

function BarRow({ label, value, barPct, sub, color = "bg-blue-500" }: BarRowProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-700">{label}</span>
        <span className="text-sm font-semibold text-gray-900">{value}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${Math.max(barPct, barPct > 0 ? 2 : 0)}%` }}
        />
      </div>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export function TabInformes({
  prestamos,
  todosPrestamos,
  libros,
  alumnos,
  unidadesGratuidad,
  cursoEscolar,
}: Props) {
  const alumnosEnPrograma = useMemo(
    () => alumnos.filter((a) => unidadesGratuidad.includes(a.unidad)),
    [alumnos, unidadesGratuidad]
  );

  const kpis = useMemo(() => {
    const totalAlumnos = alumnosEnPrograma.length;

    const conLote = new Set(
      prestamos.map((p) => p.alumno_id ?? p.alumno_nombre)
    ).size;

    const perStudent = todosPrestamos.reduce<Record<string, { total: number; returned: number }>>(
      (acc, p) => {
        const key = p.alumno_id ?? p.alumno_nombre;
        if (!acc[key]) acc[key] = { total: 0, returned: 0 };
        acc[key].total++;
        if (p.fecha_devolucion) acc[key].returned++;
        return acc;
      },
      {}
    );
    const conAlgunPrestamo = Object.keys(perStudent).length;
    const cerrados = Object.values(perStudent).filter(
      (s) => s.total > 0 && s.total === s.returned
    ).length;

    const incidencias = todosPrestamos.filter(
      (p) => p.estado_devolucion === "deteriorado" || p.estado_devolucion === "perdido"
    ).length;

    const alumnosConPrestamoIds = new Set(
      todosPrestamos.map((p) => p.alumno_id ?? p.alumno_nombre)
    );
    const sinLote = alumnosEnPrograma.filter(
      (a) => !alumnosConPrestamoIds.has(a.id) && !alumnosConPrestamoIds.has(a.alumno)
    ).length;

    return { totalAlumnos, conLote, cerrados, conAlgunPrestamo, incidencias, sinLote };
  }, [alumnosEnPrograma, prestamos, todosPrestamos]);

  // ── Entrega por curso ───────────────────────────────────────────────────────
  const entregaPorCurso = useMemo(() => {
    return ESO_LEVELS.map(({ label, prefix }) => {
      const alumnosNivel = alumnosEnPrograma.filter((a) => a.unidad.startsWith(prefix)).length;
      const conLoteNivel = new Set(
        prestamos
          .filter((p) => p.alumno_grupo.startsWith(prefix))
          .map((p) => p.alumno_id ?? p.alumno_nombre)
      ).size;
      return { label, total: alumnosNivel, conLote: conLoteNivel, pct: pct(conLoteNivel, alumnosNivel) };
    }).filter((row) => row.total > 0);
  }, [alumnosEnPrograma, prestamos]);

  // ── Tasa de devolución por curso ────────────────────────────────────────────
  const devolucionesPorCurso = useMemo(() => {
    return ESO_LEVELS.map(({ label, prefix }) => {
      const prestamosNivel = todosPrestamos.filter((p) => p.alumno_grupo.startsWith(prefix));
      const totalNivel = prestamosNivel.length;
      const devueltosNivel = prestamosNivel.filter((p) => p.fecha_devolucion !== null).length;
      return { label, total: totalNivel, devueltos: devueltosNivel, pct: pct(devueltosNivel, totalNivel) };
    }).filter((row) => row.total > 0);
  }, [todosPrestamos]);

  // ── Incidencias por tipo ────────────────────────────────────────────────────
  const incidenciasPorTipo = useMemo(() => {
    const deteriorados = todosPrestamos.filter((p) => p.estado_devolucion === "deteriorado").length;
    const perdidos = todosPrestamos.filter((p) => p.estado_devolucion === "perdido").length;
    const max = Math.max(deteriorados, perdidos, 1);
    return [
      { label: "Deterioro", count: deteriorados, barPct: Math.round((deteriorados / max) * 100), color: "bg-amber-400" },
      { label: "Pérdida",   count: perdidos,     barPct: Math.round((perdidos / max) * 100),     color: "bg-red-400" },
    ];
  }, [todosPrestamos]);

  // ── Libros con más incidencias ──────────────────────────────────────────────
  const librosConIncidencias = useMemo(() => {
    const counts = todosPrestamos
      .filter((p) => p.estado_devolucion === "deteriorado" || p.estado_devolucion === "perdido")
      .reduce<Record<string, { titulo: string; deteriorado: number; perdido: number }>>((acc, p) => {
        const titulo = p.libro?.titulo ?? p.libro_id;
        if (!acc[titulo]) acc[titulo] = { titulo, deteriorado: 0, perdido: 0 };
        if (p.estado_devolucion === "deteriorado") acc[titulo].deteriorado++;
        else acc[titulo].perdido++;
        return acc;
      }, {});
    const sorted = Object.values(counts)
      .map((r) => ({ ...r, total: r.deteriorado + r.perdido }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
    const max = sorted[0]?.total ?? 1;
    return sorted.map((r) => ({ ...r, barPct: Math.round((r.total / max) * 100) }));
  }, [todosPrestamos]);

  // ── Grupos con entrega más baja ─────────────────────────────────────────────
  const gruposPorEntrega = useMemo(() => {
    return unidadesGratuidad
      .map((grupo) => {
        const totalEnGrupo = alumnosEnPrograma.filter((a) => a.unidad === grupo).length;
        const conLoteEnGrupo = new Set(
          prestamos
            .filter((p) => p.alumno_grupo === grupo)
            .map((p) => p.alumno_id ?? p.alumno_nombre)
        ).size;
        return { grupo, total: totalEnGrupo, conLote: conLoteEnGrupo, pct: pct(conLoteEnGrupo, totalEnGrupo) };
      })
      .filter((row) => row.total > 0)
      .sort((a, b) => a.pct - b.pct);
  }, [unidadesGratuidad, alumnosEnPrograma, prestamos]);

  // ── Stock por editorial ─────────────────────────────────────────────────────
  const stockPorEditorial = useMemo(() => {
    const byEditorial = libros
      .filter((l) => l.activo && l.editorial)
      .reduce<Record<string, number>>((acc, l) => {
        const ed = l.editorial!;
        acc[ed] = (acc[ed] ?? 0) + l.stock_total;
        return acc;
      }, {});
    const sorted = Object.entries(byEditorial)
      .map(([editorial, total]) => ({ editorial, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 7);
    const max = sorted[0]?.total ?? 1;
    return sorted.map((s) => ({ ...s, barPct: Math.round((s.total / max) * 100) }));
  }, [libros]);

  // ── CSV export ──────────────────────────────────────────────────────────────
  function exportarCSV() {
    const headers = [
      "Alumno", "Grupo", "Libro", "Asignatura", "Nivel",
      "Nº Ejemplar", "Fecha Préstamo", "Fecha Devolución",
      "Estado Devolución", "Observaciones",
    ];
    const rows = todosPrestamos.map((p) => [
      p.alumno_nombre, p.alumno_grupo,
      p.libro?.titulo ?? "", p.libro?.asignatura ?? "", p.libro?.nivel ?? "",
      p.num_ejemplar ?? "", p.fecha_prestamo,
      p.fecha_devolucion ?? "", p.estado_devolucion ?? "", p.observaciones ?? "",
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gratuidad_libros_${cursoEscolar}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Informes · {cursoEscolar}</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Estado global del programa de gratuidad. Datos en tiempo real.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 border border-gray-300 text-gray-600 text-sm font-medium px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Printer size={14} />
            PDF
          </button>
          <button
            onClick={exportarCSV}
            className="flex items-center gap-1.5 border border-gray-300 text-gray-600 text-sm font-medium px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download size={14} />
            CSV
          </button>
        </div>
      </div>

      {/* Aviso alumnos sin lote — al principio para que sea visible de inmediato */}
      {kpis.sinLote > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">{kpis.sinLote} alumnos</span> del programa no tienen
            ningún libro asignado todavía.
          </p>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Users size={14} className="text-blue-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Alumnado</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{kpis.totalAlumnos}</p>
          <p className="text-xs text-gray-400 mt-1">en el programa</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <BookOpen size={14} className="text-indigo-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Lotes entregados</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {pct(kpis.conLote, kpis.totalAlumnos)}%
          </p>
          <p className="text-xs text-gray-400 mt-1">{kpis.conLote} de {kpis.totalAlumnos}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <RotateCcw size={14} className="text-green-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Devoluciones</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {pct(kpis.cerrados, kpis.conAlgunPrestamo)}%
          </p>
          <p className="text-xs text-gray-400 mt-1">{kpis.cerrados} cerrados</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle size={14} className="text-red-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Incidencias activas</span>
          </div>
          <p className={`text-3xl font-bold ${kpis.incidencias > 0 ? "text-red-600" : "text-gray-900"}`}>
            {kpis.incidencias}
          </p>
          <p className="text-xs text-gray-400 mt-1">deterioro o pérdida</p>
        </div>
      </div>

      {/* Fila: Entrega por curso | Tasa de devolución por curso */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-800 mb-4 text-sm">Entrega por curso</h3>
          {entregaPorCurso.length === 0 ? (
            <p className="text-sm text-gray-400">Sin datos</p>
          ) : (
            <div className="space-y-4">
              {entregaPorCurso.map((row) => (
                <BarRow
                  key={row.label}
                  label={row.label}
                  value={`${row.pct}%`}
                  barPct={row.pct}
                  sub={`${row.conLote} de ${row.total} alumnos`}
                  color="bg-blue-500"
                />
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-800 mb-4 text-sm">Devolución por curso</h3>
          {devolucionesPorCurso.length === 0 ? (
            <p className="text-sm text-gray-400">Sin datos</p>
          ) : (
            <div className="space-y-4">
              {devolucionesPorCurso.map((row) => (
                <BarRow
                  key={row.label}
                  label={row.label}
                  value={`${row.pct}%`}
                  barPct={row.pct}
                  sub={`${row.devueltos} de ${row.total} libros devueltos`}
                  color="bg-green-500"
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Fila: Incidencias por tipo | Libros con más incidencias */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-800 mb-4 text-sm">Incidencias por tipo</h3>
          {kpis.incidencias === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Sin incidencias registradas</p>
          ) : (
            <div className="space-y-4">
              {incidenciasPorTipo.map((row) => (
                <BarRow
                  key={row.label}
                  label={row.label}
                  value={row.count}
                  barPct={row.barPct}
                  color={row.color}
                />
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-800 mb-4 text-sm">Libros con más incidencias</h3>
          {librosConIncidencias.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Sin incidencias registradas</p>
          ) : (
            <div className="space-y-3">
              {librosConIncidencias.map((row) => (
                <BarRow
                  key={row.titulo}
                  label={row.titulo}
                  value={row.total}
                  barPct={row.barPct}
                  sub={`${row.deteriorado > 0 ? `${row.deteriorado} deteriorado${row.deteriorado > 1 ? "s" : ""}` : ""}${row.deteriorado > 0 && row.perdido > 0 ? " · " : ""}${row.perdido > 0 ? `${row.perdido} perdido${row.perdido > 1 ? "s" : ""}` : ""}`}
                  color="bg-orange-400"
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Grupos con entrega más baja — ancho completo */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-semibold text-gray-800 mb-1 text-sm">Entrega por grupo</h3>
        <p className="text-xs text-gray-400 mb-4">Ordenado de menor a mayor tasa de entrega</p>
        {gruposPorEntrega.length === 0 ? (
          <p className="text-sm text-gray-400">Sin datos</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
            {gruposPorEntrega.map((row) => (
              <BarRow
                key={row.grupo}
                label={row.grupo}
                value={`${row.pct}%`}
                barPct={row.pct}
                sub={`${row.conLote} de ${row.total} alumnos`}
                color={row.pct < 50 ? "bg-red-400" : row.pct < 80 ? "bg-amber-400" : "bg-blue-500"}
              />
            ))}
          </div>
        )}
      </div>

      {/* Stock por editorial — ancho completo */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-semibold text-gray-800 mb-4 text-sm">Stock por editorial</h3>
        {stockPorEditorial.length === 0 ? (
          <p className="text-sm text-gray-400">Sin datos de editorial en el catálogo</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            {stockPorEditorial.map((row) => (
              <BarRow
                key={row.editorial}
                label={row.editorial}
                value={`${row.total} ej.`}
                barPct={row.barPct}
                color="bg-violet-500"
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

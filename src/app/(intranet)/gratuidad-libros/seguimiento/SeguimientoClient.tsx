"use client";

import { useState, useMemo, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  BookOpen, CheckCircle, AlertTriangle, XCircle, Clock,
  ChevronDown, ChevronUp, Download, RotateCcw,
} from "lucide-react";
import type { PrestamoLibro, EstadoDevolucion, Alumno } from "@/lib/types";

interface Props {
  prestamos: PrestamoLibro[];
  cursoEscolarActual: string;
  alumnos?: Alumno[];
  onNavigateToTab?: (tab: "prestamos" | "devoluciones", grupo: string) => void;
}

type Vista = "cursos" | "grupos" | "libros";

const ESO_NIVELES = ["1º ESO", "2º ESO", "3º ESO", "4º ESO"];

const estadoLabel: Record<EstadoDevolucion, string> = {
  bueno: "Bueno",
  deteriorado: "Deteriorado",
  perdido: "Perdido",
};

const estadoIcon: Record<EstadoDevolucion, React.ReactNode> = {
  bueno: <CheckCircle size={13} className="text-green-600" />,
  deteriorado: <AlertTriangle size={13} className="text-amber-600" />,
  perdido: <XCircle size={13} className="text-red-600" />,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nivelFromGrupo(nombre: string): string | null {
  for (const n of ESO_NIVELES) {
    if (nombre.startsWith(n.slice(0, 5))) return n; // "1º ES" prefix match
  }
  if (nombre.startsWith("1")) return "1º ESO";
  if (nombre.startsWith("2")) return "2º ESO";
  if (nombre.startsWith("3")) return "3º ESO";
  if (nombre.startsWith("4")) return "4º ESO";
  return null;
}

function shortGroupName(nombre: string): string {
  // "1º ESO A" → "1ºA"
  const parts = nombre.trim().split(/\s+/);
  if (parts.length >= 3) return parts[0] + parts[parts.length - 1];
  return nombre;
}

// ─── Sub-componente: GrupoCard ────────────────────────────────────────────────

interface GrupoCardProps {
  grupo: string;
  tutor: string | null;
  entregados: number;
  total: number;
  onPrestamos?: () => void;
  onDevoluciones?: () => void;
}

function GrupoCard({ grupo, tutor, entregados, total, onPrestamos, onDevoluciones }: GrupoCardProps) {
  const pct = total > 0 ? Math.round((entregados / total) * 100) : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-2">
      {/* Nombre del grupo + botones */}
      <div className="flex items-start justify-between gap-1">
        <div>
          <p className="text-2xl font-bold text-gray-900 leading-tight">{shortGroupName(grupo)}</p>
          {tutor && (
            <p className="text-xs text-gray-400 mt-0.5">
              <span className="text-gray-500">Tutor/a</span> · {tutor}
            </p>
          )}
        </div>
        {(onPrestamos || onDevoluciones) && (
          <div className="flex gap-0.5 flex-shrink-0">
            {onPrestamos && (
              <button
                onClick={onPrestamos}
                title="Ir a Préstamos"
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <BookOpen size={15} />
              </button>
            )}
            {onDevoluciones && (
              <button
                onClick={onDevoluciones}
                title="Ir a Devoluciones"
                className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              >
                <RotateCcw size={15} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Entregados */}
      <div className="mt-1">
        <p className="text-sm text-gray-700">
          <span className="font-bold text-gray-900">{entregados}/{total}</span> entregados
        </p>
        <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-orange-500 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function SeguimientoClient({ prestamos, cursoEscolarActual, alumnos = [], onNavigateToTab }: Props) {
  const [vista, setVista] = useState<Vista>("cursos");
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [filtroNivel, setFiltroNivel] = useState<string>("todos");
  const [tutorMap, setTutorMap] = useState<Record<string, string>>({});
  const [gratuidadGrupos, setGratuidadGrupos] = useState<Set<string>>(new Set());

  // Fetch tutores para la vista por cursos
  useEffect(() => {
    async function fetchTutores() {
      const supabase = createClient();
      const { data: cursosData } = await supabase
        .from("cursos")
        .select("nombre, email_tutor")
        .eq("gratuidad", true);

      if (!cursosData?.length) return;

      setGratuidadGrupos(new Set(cursosData.map((c) => c.nombre as string)));

      const emails = cursosData
        .map((c) => c.email_tutor as string | null)
        .filter((e): e is string => Boolean(e));

      if (emails.length === 0) return;

      const { data: profData } = await supabase
        .from("profesores")
        .select("email, profesor")
        .in("email", emails);

      const emailToName = Object.fromEntries(
        (profData ?? []).map((p) => [p.email as string, p.profesor as string])
      );

      const map: Record<string, string> = {};
      for (const c of cursosData) {
        if (c.email_tutor && emailToName[c.email_tutor as string]) {
          map[c.nombre as string] = emailToName[c.email_tutor as string];
        }
      }
      setTutorMap(map);
    }
    fetchTutores();
  }, []);

  function toggleKey(key: string) {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // ── Stats ────────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = prestamos.length;
    const devueltos = prestamos.filter((p) => p.fecha_devolucion !== null).length;
    const activos = total - devueltos;
    const deteriorados = prestamos.filter((p) => p.estado_devolucion === "deteriorado").length;
    const perdidos = prestamos.filter((p) => p.estado_devolucion === "perdido").length;
    return { total, devueltos, activos, deteriorados, perdidos };
  }, [prestamos]);

  // ── Vista por cursos ─────────────────────────────────────────────────────────

  const porNivel = useMemo(() => {
    // Get unique groups from alumnos filtered to gratuidad groups only
    const grupos = [...new Set(alumnos.map((a) => a.unidad))]
      .filter((g) => gratuidadGrupos.size === 0 || gratuidadGrupos.has(g))
      .sort();

    // Count active loans per group (students with at least one active loan)
    const activeLoansPerGroup = prestamos.reduce<Record<string, Set<string>>>((acc, p) => {
      if (!acc[p.alumno_grupo]) acc[p.alumno_grupo] = new Set();
      acc[p.alumno_grupo].add(p.alumno_id ?? p.alumno_nombre);
      return acc;
    }, {});

    const result: Record<string, { grupo: string; total: number; entregados: number }[]> = {};
    for (const grupo of grupos) {
      const nivel = nivelFromGrupo(grupo);
      if (!nivel) continue;
      const totalEnGrupo = alumnos.filter((a) => a.unidad === grupo).length;
      const entregados = activeLoansPerGroup[grupo]?.size ?? 0;
      if (!result[nivel]) result[nivel] = [];
      result[nivel].push({ grupo, total: totalEnGrupo, entregados });
    }
    return result;
  }, [alumnos, prestamos, gratuidadGrupos]);

  const nivelesConDatos = ESO_NIVELES.filter((n) => porNivel[n]?.length);

  const nivelesVisibles = filtroNivel === "todos"
    ? nivelesConDatos
    : nivelesConDatos.filter((n) => n === filtroNivel);

  // ── Vista por grupos ─────────────────────────────────────────────────────────

  const porGrupo = useMemo(() => {
    return prestamos
      .filter((p) => !p.fecha_devolucion)
      .reduce<Record<string, PrestamoLibro[]>>((acc, p) => {
        const key = p.alumno_grupo;
        if (!acc[key]) acc[key] = [];
        acc[key].push(p);
        return acc;
      }, {});
  }, [prestamos]);

  const gruposOrdenados = useMemo(() => Object.keys(porGrupo).sort(), [porGrupo]);

  // ── Vista por libros ─────────────────────────────────────────────────────────

  const porLibro = useMemo(() => {
    return prestamos.reduce<Record<string, { titulo: string; activos: number; devueltos: number; deteriorados: number; perdidos: number }>>((acc, p) => {
      const titulo = p.libro?.titulo ?? p.libro_id;
      if (!acc[titulo]) acc[titulo] = { titulo, activos: 0, devueltos: 0, deteriorados: 0, perdidos: 0 };
      if (!p.fecha_devolucion) {
        acc[titulo].activos++;
      } else {
        acc[titulo].devueltos++;
        if (p.estado_devolucion === "deteriorado") acc[titulo].deteriorados++;
        if (p.estado_devolucion === "perdido") acc[titulo].perdidos++;
      }
      return acc;
    }, {});
  }, [prestamos]);

  const librosOrdenados = useMemo(
    () => Object.values(porLibro).sort((a, b) => a.titulo.localeCompare(b.titulo)),
    [porLibro]
  );

  // ── CSV export ────────────────────────────────────────────────────────────────

  function exportarCSV() {
    const headers = [
      "Alumno", "Grupo", "Libro", "Asignatura", "Nivel",
      "Nº Ejemplar", "Fecha Préstamo", "Fecha Devolución",
      "Estado Devolución", "Entregado por", "Devuelto por", "Observaciones",
    ];
    const rows = prestamos.map((p) => [
      p.alumno_nombre, p.alumno_grupo,
      p.libro?.titulo ?? "", p.libro?.asignatura ?? "", p.libro?.nivel ?? "",
      p.num_ejemplar ?? "", p.fecha_prestamo,
      p.fecha_devolucion ?? "", p.estado_devolucion ?? "",
      p.entregado_por_nombre?.profesor ?? "",
      p.devuelto_por_nombre?.profesor ?? "",
      p.observaciones ?? "",
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prestamos_${cursoEscolarActual}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Cabecera */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Seguimiento</h1>
          <p className="text-sm text-gray-500 mt-0.5">{cursoEscolarActual}</p>
        </div>
        <button
          onClick={exportarCSV}
          className="flex items-center gap-2 border border-gray-300 text-gray-700 text-sm font-medium px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Download size={15} />
          Exportar CSV
        </button>
      </div>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total préstamos", value: stats.total,  color: "text-blue-700 bg-blue-50 border-blue-200" },
          { label: "Pendientes",      value: stats.activos, color: "text-amber-700 bg-amber-50 border-amber-200", icon: <Clock size={16} /> },
          { label: "Devueltos",       value: stats.devueltos, color: "text-green-700 bg-green-50 border-green-200", icon: <CheckCircle size={16} /> },
          { label: "Incidencias",     value: stats.deteriorados + stats.perdidos, color: "text-red-700 bg-red-50 border-red-200", icon: <AlertTriangle size={16} /> },
        ].map((card) => (
          <div key={card.label} className={`border rounded-xl p-4 ${card.color}`}>
            <div className="flex items-center gap-1.5 mb-1">
              {"icon" in card && card.icon}
              <span className="text-xs font-medium opacity-80">{card.label}</span>
            </div>
            <p className="text-3xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Selector de vista */}
      <div className="flex bg-gray-100 rounded-lg p-1 w-fit">
        {(["cursos", "grupos", "libros"] as Vista[]).map((v) => (
          <button
            key={v}
            onClick={() => setVista(v)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              vista === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {v === "cursos" ? "Por cursos" : v === "grupos" ? "Por grupos" : "Por libros"}
          </button>
        ))}
      </div>

      {/* ── Vista por cursos ──────────────────────────────────────────────── */}
      {vista === "cursos" && (
        <div className="space-y-6">
          {/* Filtro de nivel */}
          <div className="flex flex-wrap gap-2">
            {["todos", ...ESO_NIVELES].map((n) => (
              <button
                key={n}
                onClick={() => setFiltroNivel(n)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                  filtroNivel === n
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white border-gray-300 text-gray-600 hover:border-gray-400"
                }`}
              >
                {n === "todos" ? "Todos" : n}
              </button>
            ))}
          </div>

          {nivelesVisibles.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <BookOpen size={36} className="mx-auto mb-2 opacity-40" />
              <p className="font-medium">No hay datos para este nivel</p>
            </div>
          ) : (
            nivelesVisibles.map((nivel) => {
              const grupos = porNivel[nivel];
              const totalAlumnosNivel = grupos.reduce((s, g) => s + g.total, 0);
              return (
                <div key={nivel}>
                  {/* Cabecera de nivel */}
                  <div className="mb-3">
                    <span className="text-sm font-bold text-gray-900">{nivel}</span>
                    <span className="text-xs text-gray-400 ml-2">
                      {grupos.length} {grupos.length === 1 ? "grupo" : "grupos"} · {totalAlumnosNivel} alumnos
                    </span>
                  </div>
                  {/* Grid de cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {grupos.map(({ grupo, total, entregados }) => (
                      <GrupoCard
                        key={grupo}
                        grupo={grupo}
                        tutor={tutorMap[grupo] ?? null}
                        entregados={entregados}
                        total={total}
                        onPrestamos={onNavigateToTab ? () => onNavigateToTab("prestamos", grupo) : undefined}
                        onDevoluciones={onNavigateToTab ? () => onNavigateToTab("devoluciones", grupo) : undefined}
                      />
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Vista por grupos ──────────────────────────────────────────────── */}
      {vista === "grupos" && (
        <div className="space-y-2">
          {gruposOrdenados.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <CheckCircle size={36} className="mx-auto mb-2 opacity-40" />
              <p className="font-medium">Todos los libros están devueltos</p>
            </div>
          ) : (
            gruposOrdenados.map((grupo) => {
              const alumnos_ = porGrupo[grupo];
              const porAlumno = alumnos_.reduce<Record<string, PrestamoLibro[]>>((acc, p) => {
                if (!acc[p.alumno_nombre]) acc[p.alumno_nombre] = [];
                acc[p.alumno_nombre].push(p);
                return acc;
              }, {});
              const isExpanded = expandedKeys.has(grupo);
              return (
                <div key={grupo} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleKey(grupo)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-semibold text-gray-800">{grupo}</span>
                    <span className="flex items-center gap-2 text-sm text-gray-500">
                      <span className="bg-amber-100 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full">
                        {alumnos_.length} pendientes
                      </span>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="divide-y divide-gray-100 border-t border-gray-100">
                      {Object.entries(porAlumno)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([nombre, librosAlumno]) => (
                          <div key={nombre} className="px-4 py-2.5">
                            <p className="text-sm font-medium text-gray-800">{nombre}</p>
                            <div className="mt-1 space-y-0.5">
                              {librosAlumno.map((p) => (
                                <p key={p.id} className="text-xs text-gray-500 flex items-center gap-1">
                                  <BookOpen size={11} className="flex-shrink-0" />
                                  {p.libro?.titulo ?? "—"}
                                  {p.num_ejemplar && <span className="text-gray-400">· Ej. {p.num_ejemplar}</span>}
                                </p>
                              ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Vista por libros ──────────────────────────────────────────────── */}
      {vista === "libros" && (
        <div className="space-y-2">
          {librosOrdenados.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <BookOpen size={36} className="mx-auto mb-2 opacity-40" />
              <p className="font-medium">No hay préstamos registrados</p>
            </div>
          ) : (
            librosOrdenados.map((libro) => {
              const isExpanded = expandedKeys.has(libro.titulo);
              const prestamosLibro = prestamos.filter(
                (p) => (p.libro?.titulo ?? p.libro_id) === libro.titulo
              );
              return (
                <div key={libro.titulo} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleKey(libro.titulo)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    <span className="font-medium text-gray-800 text-sm truncate mr-2">{libro.titulo}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {libro.activos > 0 && (
                        <span className="text-xs bg-amber-100 text-amber-700 font-medium px-2 py-0.5 rounded-full">
                          {libro.activos} fuera
                        </span>
                      )}
                      {libro.devueltos > 0 && (
                        <span className="text-xs bg-green-100 text-green-700 font-medium px-2 py-0.5 rounded-full">
                          {libro.devueltos} devueltos
                        </span>
                      )}
                      {(libro.deteriorados + libro.perdidos) > 0 && (
                        <span className="text-xs bg-red-100 text-red-700 font-medium px-2 py-0.5 rounded-full">
                          {libro.deteriorados + libro.perdidos} incid.
                        </span>
                      )}
                      {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="divide-y divide-gray-100 border-t border-gray-100">
                      {prestamosLibro.map((p) => (
                        <div key={p.id} className="flex items-center justify-between px-4 py-2.5 gap-3">
                          <div className="min-w-0">
                            <p className="text-sm text-gray-800">
                              {p.alumno_nombre}
                              <span className="text-gray-400 ml-1.5 text-xs">{p.alumno_grupo}</span>
                            </p>
                            {p.num_ejemplar && <p className="text-xs text-gray-400">Ej. {p.num_ejemplar}</p>}
                          </div>
                          <div className="flex-shrink-0 text-xs">
                            {p.fecha_devolucion ? (
                              <span className="flex items-center gap-1 text-gray-600">
                                {p.estado_devolucion && estadoIcon[p.estado_devolucion]}
                                {p.estado_devolucion ? estadoLabel[p.estado_devolucion] : "—"}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-amber-600">
                                <Clock size={13} /> Pendiente
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

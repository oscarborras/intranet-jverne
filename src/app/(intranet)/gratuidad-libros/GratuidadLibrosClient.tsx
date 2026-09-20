"use client";

import { useEffect, useState } from "react";
import { BookOpen, Library, BarChart2, RotateCcw, FileBarChart, ShieldAlert, ClipboardCheck, ChevronDown, History } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { LibroCatalogo, PrestamoLibro, Alumno } from "@/lib/types";
import { CatalogoLibrosClient } from "./catalogo/CatalogoLibrosClient";
import { SeguimientoClient } from "./seguimiento/SeguimientoClient";
import { TabPrestamoSimple } from "./TabPrestamoSimple";
import { TabPrestamoAvanzado } from "./TabPrestamoAvanzado";
import { TabDevolucionesLote } from "./TabDevolucionesLote";
import { TabRevisionesLote } from "./TabRevisionesLote";
import { TabInformes } from "./TabInformes";
import { TabIncidencias } from "./TabIncidencias";

interface Profesor { id: string; nombre: string; }

type TabId = "prestamos" | "devoluciones" | "revisiones" | "inventario" | "seguimiento" | "informes" | "incidencias";
interface Tab { id: TabId; label: string; icon: React.ReactNode; }

type ModoGratuidad = "prestamo" | "devolucion" | "completo" | "revision" | "revision_devolucion";

interface Props {
  prestamos: PrestamoLibro[];
  todosPrestamos: PrestamoLibro[];
  libros: LibroCatalogo[];
  alumnos: Alumno[];
  alumnosInactivos: Alumno[];
  cursoEscolarActual: string;
  myProfesorId: string | null;
  canManage: boolean;
  canManageInventario: boolean;
  profesores: Profesor[];
  unidadesGratuidad: string[];
  completadosIniciales: string[];
  modoGratuidad: ModoGratuidad;
}

export function GratuidadLibrosClient({
  prestamos,
  todosPrestamos,
  libros,
  alumnos,
  alumnosInactivos,
  cursoEscolarActual,
  myProfesorId,
  canManage,
  canManageInventario,
  profesores,
  unidadesGratuidad,
  completadosIniciales,
  modoGratuidad,
}: Props) {
  // For professors, visibility of base tabs depends on the configured mode
  const showPrestamos    = canManage || modoGratuidad === "prestamo"   || modoGratuidad === "completo";
  const showDevoluciones = canManage || modoGratuidad === "devolucion" || modoGratuidad === "completo" || modoGratuidad === "revision_devolucion";
  const showRevisiones   = canManage || modoGratuidad === "revision"   || modoGratuidad === "revision_devolucion";

  const defaultTab: TabId = showPrestamos ? "prestamos" : showRevisiones ? "revisiones" : "devoluciones";
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab);
  const [pendingGrupo, setPendingGrupo] = useState<string | null>(null);
  // Fuente de verdad compartida entre pestañas para préstamos activos
  const [livePrestamosList, setLivePrestamos] = useState<PrestamoLibro[]>(prestamos);
  const [liveTodosPrestamos, setLiveTodosPrestamos] = useState<PrestamoLibro[]>(todosPrestamos);

  // Selector de curso escolar (solo gestores): permite consultar años anteriores en modo lectura
  const [cursoSeleccionado, setCursoSeleccionado] = useState(cursoEscolarActual);
  const [cursosDisponibles, setCursosDisponibles] = useState<string[]>([cursoEscolarActual]);
  const [loadingCurso, setLoadingCurso] = useState(false);
  const isHistorico = canManage && cursoSeleccionado !== cursoEscolarActual;
  const effectiveCanManage = canManage && !isHistorico;

  useEffect(() => {
    if (!canManage) return;
    const supabase = createClient();
    supabase
      .from("prestamos_libros")
      .select("curso_escolar")
      .then(({ data }) => {
        const years = Array.from(
          new Set([cursoEscolarActual, ...(data ?? []).map((r) => r.curso_escolar as string)])
        ).sort().reverse();
        setCursosDisponibles(years);
      });
  }, [canManage, cursoEscolarActual]);

  useEffect(() => {
    if (cursoSeleccionado === cursoEscolarActual) {
      setLivePrestamos(prestamos);
      setLiveTodosPrestamos(todosPrestamos);
      return;
    }
    let cancelled = false;
    setLoadingCurso(true);
    const supabase = createClient();
    supabase
      .from("prestamos_libros")
      .select("*, libro:libros_catalogo(titulo, asignatura, nivel)")
      .eq("curso_escolar", cursoSeleccionado)
      .order("alumno_grupo")
      .order("alumno_nombre")
      .then(({ data }) => {
        if (cancelled) return;
        const rows = (data ?? []) as unknown as PrestamoLibro[];
        setLivePrestamos(rows);
        setLiveTodosPrestamos(rows);
        setLoadingCurso(false);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursoSeleccionado]);

  useEffect(() => {
    if (isHistorico && ["prestamos", "devoluciones", "revisiones", "inventario"].includes(activeTab)) {
      setActiveTab("seguimiento");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHistorico]);

  function navigateToTab(tab: "prestamos" | "devoluciones", grupo: string) {
    setPendingGrupo(grupo);
    setActiveTab(tab);
  }

  const tabs: Tab[] = [
    ...(showPrestamos    ? [{ id: "prestamos"    as TabId, label: "Préstamos",    icon: <BookOpen       size={15} /> }] : []),
    ...(showDevoluciones ? [{ id: "devoluciones" as TabId, label: "Devoluciones", icon: <RotateCcw      size={15} /> }] : []),
    ...(showRevisiones   ? [{ id: "revisiones"   as TabId, label: "Revisiones",   icon: <ClipboardCheck size={15} /> }] : []),
    ...(canManageInventario ? [
      { id: "inventario" as TabId, label: "Inventario", icon: <Library size={15} /> },
    ] : []),
    ...(canManage ? [
      { id: "seguimiento" as TabId, label: "Seguimiento", icon: <BarChart2    size={15} /> },
      { id: "informes"    as TabId, label: "Informes",    icon: <FileBarChart size={15} /> },
      { id: "incidencias" as TabId, label: "Incidencias", icon: <ShieldAlert  size={15} /> },
    ] : []),
  ].filter((tab) => !isHistorico || !["prestamos", "devoluciones", "revisiones", "inventario"].includes(tab.id));

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Cabecera */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gratuidad de Libros</h1>
        {canManage ? (
          <div className="relative inline-block mt-1">
            <select
              value={cursoSeleccionado}
              disabled={loadingCurso}
              onChange={(e) => setCursoSeleccionado(e.target.value)}
              className="appearance-none text-sm text-gray-600 bg-transparent border border-gray-200 rounded-md pl-2 pr-7 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
            >
              {cursosDisponibles.map((c) => (
                <option key={c} value={c}>
                  {c}{c === cursoEscolarActual ? " (activo)" : ""}
                </option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        ) : (
          <p className="text-sm text-gray-500 mt-0.5">{cursoEscolarActual}</p>
        )}
      </div>

      {isHistorico && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <History size={16} />
          Viendo datos de {cursoSeleccionado} · Solo lectura, excepto Incidencias
        </div>
      )}

      {/* Tab bar */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setPendingGrupo(null); setActiveTab(tab.id); }}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Contenido */}
      {activeTab === "prestamos" && !isHistorico && (
        effectiveCanManage ? (
          <TabPrestamoAvanzado
            alumnos={alumnos}
            alumnosInactivos={alumnosInactivos}
            libros={libros.filter((l) => l.activo)}
            prestamos={livePrestamosList}
            onPrestamosChange={setLivePrestamos}
            cursoEscolar={cursoSeleccionado}
            myProfesorId={myProfesorId}
            profesores={profesores}
            unidadesGratuidad={unidadesGratuidad}
            completadosIniciales={completadosIniciales}
            initialGrupo={pendingGrupo ?? undefined}
          />
        ) : (
          <TabPrestamoSimple
            alumnos={alumnos}
            alumnosInactivos={alumnosInactivos}
            libros={libros.filter((l) => l.activo)}
            prestamos={livePrestamosList}
            onPrestamosChange={setLivePrestamos}
            cursoEscolar={cursoSeleccionado}
            myProfesorId={myProfesorId}
            profesores={profesores}
            unidadesGratuidad={unidadesGratuidad}
            initialGrupo={pendingGrupo ?? undefined}
          />
        )
      )}
      {activeTab === "devoluciones" && !isHistorico && (
        <TabDevolucionesLote
          prestamosActivos={livePrestamosList}
          onPrestamosChange={setLivePrestamos}
          cursoEscolar={cursoSeleccionado}
          myProfesorId={myProfesorId}
          canManage={effectiveCanManage}
          profesores={profesores}
          alumnosInactivos={alumnosInactivos}
          initialGrupo={pendingGrupo ?? undefined}
        />
      )}
      {activeTab === "revisiones" && !isHistorico && (
        <TabRevisionesLote
          prestamosActivos={livePrestamosList}
          onPrestamosChange={setLivePrestamos}
          cursoEscolar={cursoSeleccionado}
          myProfesorId={myProfesorId}
          canManage={effectiveCanManage}
          profesores={profesores}
          alumnosInactivos={alumnosInactivos}
          initialGrupo={pendingGrupo ?? undefined}
        />
      )}
      {activeTab === "inventario" && canManageInventario && !isHistorico && (
        <CatalogoLibrosClient libros={libros} prestamos={livePrestamosList} />
      )}
      {activeTab === "seguimiento" && canManage && (
        <SeguimientoClient
          prestamos={liveTodosPrestamos}
          cursoEscolarActual={cursoSeleccionado}
          alumnos={alumnos}
          onNavigateToTab={isHistorico ? () => {} : navigateToTab}
          isHistorico={isHistorico}
        />
      )}
      {activeTab === "informes" && canManage && (
        <TabInformes
          prestamos={livePrestamosList}
          todosPrestamos={liveTodosPrestamos}
          libros={libros}
          alumnos={alumnos}
          unidadesGratuidad={unidadesGratuidad}
          cursoEscolar={cursoSeleccionado}
          isHistorico={isHistorico}
        />
      )}
      {activeTab === "incidencias" && canManage && (
        <TabIncidencias
          libros={libros}
          alumnos={alumnos}
          cursoEscolar={cursoSeleccionado}
          myProfesorId={myProfesorId}
          canManage={canManage}
          profesores={profesores}
        />
      )}
    </div>
  );
}

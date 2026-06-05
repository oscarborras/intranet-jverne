"use client";

import { useState } from "react";
import { BookOpen, Library, BarChart2, RotateCcw, FileBarChart, ShieldAlert } from "lucide-react";
import type { LibroCatalogo, PrestamoLibro, Alumno } from "@/lib/types";
import { CatalogoLibrosClient } from "./catalogo/CatalogoLibrosClient";
import { SeguimientoClient } from "./seguimiento/SeguimientoClient";
import { TabPrestamosLote } from "./TabPrestamosLote";
import { TabDevolucionesLote } from "./TabDevolucionesLote";
import { TabInformes } from "./TabInformes";
import { TabIncidencias } from "./TabIncidencias";

interface Profesor { id: string; nombre: string; }

type TabId = "prestamos" | "devoluciones" | "inventario" | "seguimiento" | "informes" | "incidencias";
interface Tab { id: TabId; label: string; icon: React.ReactNode; }

type ModoGratuidad = "prestamo" | "devolucion" | "completo";

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
  const showPrestamos   = canManage || modoGratuidad === "prestamo"   || modoGratuidad === "completo";
  const showDevoluciones = canManage || modoGratuidad === "devolucion" || modoGratuidad === "completo";

  const defaultTab: TabId = showPrestamos ? "prestamos" : "devoluciones";
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab);
  const [pendingGrupo, setPendingGrupo] = useState<string | null>(null);
  // Fuente de verdad compartida entre pestañas para préstamos activos
  const [livePrestamosList, setLivePrestamos] = useState<PrestamoLibro[]>(prestamos);

  function navigateToTab(tab: "prestamos" | "devoluciones", grupo: string) {
    setPendingGrupo(grupo);
    setActiveTab(tab);
  }

  const tabs: Tab[] = [
    ...(showPrestamos    ? [{ id: "prestamos"    as TabId, label: "Préstamos",    icon: <BookOpen  size={15} /> }] : []),
    ...(showDevoluciones ? [{ id: "devoluciones" as TabId, label: "Devoluciones", icon: <RotateCcw size={15} /> }] : []),
    ...(canManageInventario ? [
      { id: "inventario" as TabId, label: "Inventario", icon: <Library size={15} /> },
    ] : []),
    ...(canManage ? [
      { id: "seguimiento" as TabId, label: "Seguimiento", icon: <BarChart2    size={15} /> },
      { id: "informes"    as TabId, label: "Informes",    icon: <FileBarChart size={15} /> },
      { id: "incidencias" as TabId, label: "Incidencias", icon: <ShieldAlert  size={15} /> },
    ] : []),
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Cabecera */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gratuidad de Libros</h1>
        <p className="text-sm text-gray-500 mt-0.5">{cursoEscolarActual}</p>
      </div>

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
      {activeTab === "prestamos" && (
        <TabPrestamosLote
          alumnos={alumnos}
          alumnosInactivos={alumnosInactivos}
          libros={libros.filter((l) => l.activo)}
          prestamos={livePrestamosList}
          onPrestamosChange={setLivePrestamos}
          cursoEscolar={cursoEscolarActual}
          myProfesorId={myProfesorId}
          canManage={canManage}
          profesores={profesores}
          unidadesGratuidad={unidadesGratuidad}
          completadosIniciales={completadosIniciales}
          initialGrupo={pendingGrupo ?? undefined}
        />
      )}
      {activeTab === "devoluciones" && (
        <TabDevolucionesLote
          prestamosActivos={livePrestamosList}
          onPrestamosChange={setLivePrestamos}
          cursoEscolar={cursoEscolarActual}
          myProfesorId={myProfesorId}
          canManage={canManage}
          profesores={profesores}
          alumnosInactivos={alumnosInactivos}
          initialGrupo={pendingGrupo ?? undefined}
        />
      )}
      {activeTab === "inventario" && canManageInventario && (
        <CatalogoLibrosClient libros={libros} prestamos={livePrestamosList} />
      )}
      {activeTab === "seguimiento" && canManage && (
        <SeguimientoClient
          prestamos={todosPrestamos}
          cursoEscolarActual={cursoEscolarActual}
          alumnos={alumnos}
          onNavigateToTab={navigateToTab}
        />
      )}
      {activeTab === "informes" && canManage && (
        <TabInformes
          prestamos={livePrestamosList}
          todosPrestamos={todosPrestamos}
          libros={libros}
          alumnos={alumnos}
          unidadesGratuidad={unidadesGratuidad}
          cursoEscolar={cursoEscolarActual}
        />
      )}
      {activeTab === "incidencias" && canManage && (
        <TabIncidencias
          libros={libros}
          alumnos={alumnos}
          cursoEscolar={cursoEscolarActual}
          myProfesorId={myProfesorId}
          canManage={canManage}
          profesores={profesores}
        />
      )}
    </div>
  );
}

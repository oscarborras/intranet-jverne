"use client";

import { useState } from "react";
import {
  CheckCircle, AlertTriangle, X, Users, BookOpen, ChevronDown, List, Loader2, Trash2,
} from "lucide-react";
import type { Alumno, LibroCatalogo, PrestamoLibro } from "@/lib/types";
import { usePrestamosLoteData, initials, todayString, type Profesor } from "./usePrestamosLoteData";

interface Props {
  alumnos: Alumno[];
  alumnosInactivos: Alumno[];
  libros: LibroCatalogo[];
  prestamos: PrestamoLibro[];
  onPrestamosChange: React.Dispatch<React.SetStateAction<PrestamoLibro[]>>;
  cursoEscolar: string;
  myProfesorId: string | null;
  profesores: Profesor[];
  unidadesGratuidad: string[];
  initialGrupo?: string;
}

// Modo simple para profesorado: un libro, marcar/desmarcar entrega al instante
// por alumno, sin acciones por lotes. Pensado para minimizar la posibilidad de
// error de quien no está familiarizado con la aplicación.
export function TabPrestamoSimple({
  alumnos, alumnosInactivos, libros, prestamos, onPrestamosChange,
  cursoEscolar, myProfesorId, profesores, unidadesGratuidad, initialGrupo,
}: Props) {
  const {
    selectedUnidad, setSelectedUnidad,
    unidades, nivel,
    alumnosDelGrupo,
    loteLibros, disponibles,
    alumnoLibrosMap, prestamoPorAlumnoYLibro,
    efectivoProfesorId,
    insertarPrestamos, eliminarPrestamos,
  } = usePrestamosLoteData({
    alumnos, alumnosInactivos, libros, prestamos, onPrestamosChange,
    cursoEscolar, myProfesorId, profesores, unidadesGratuidad, initialGrupo,
    incluirNoActivos: false,
  });

  const [selectedLibroId, setSelectedLibroId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmarAnular, setConfirmarAnular] = useState<{ alumno: Alumno; prestamoId: string; libroTitulo: string } | null>(null);
  const [detalleAlumno, setDetalleAlumno] = useState<Alumno | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function handleUnidadChange(unidad: string) {
    setSelectedUnidad(unidad);
    setSelectedLibroId(null);
    setErrorMsg(null);
  }

  function toggleLibro(id: string) {
    setSelectedLibroId((prev) => (prev === id ? null : id));
    setErrorMsg(null);
  }

  async function handleToggleAlumno(alumno: Alumno) {
    if (!selectedLibroId) return;
    const yaLoTiene = alumnoLibrosMap[alumno.id]?.has(selectedLibroId) ?? false;

    if (yaLoTiene) {
      const prestamo = prestamoPorAlumnoYLibro[alumno.id]?.[selectedLibroId];
      if (!prestamo) return;
      const libro = loteLibros.find((l) => l.id === selectedLibroId);
      setConfirmarAnular({ alumno, prestamoId: prestamo.id, libroTitulo: libro?.titulo ?? "este libro" });
      return;
    }

    if (!efectivoProfesorId) {
      setErrorMsg("No se ha podido identificar tu perfil de profesor. Contacta con administración.");
      return;
    }
    if (disponibles(selectedLibroId) <= 0) {
      setErrorMsg("No quedan ejemplares disponibles de este libro. Avisa a coordinación de gratuidad.");
      return;
    }

    setProcessingId(alumno.id);
    setErrorMsg(null);
    const { error } = await insertarPrestamos([{ alumnoId: alumno.id, libroId: selectedLibroId }], todayString());
    setProcessingId(null);
    if (error) setErrorMsg(`Error al registrar la entrega: ${error}`);
  }

  async function confirmarAnularEntrega() {
    if (!confirmarAnular) return;
    setProcessingId(confirmarAnular.alumno.id);
    const { error } = await eliminarPrestamos([confirmarAnular.prestamoId]);
    setProcessingId(null);
    setConfirmarAnular(null);
    if (error) setErrorMsg(`Error al anular la entrega: ${error}`);
  }

  const librosDelDetalle = detalleAlumno
    ? prestamos.filter((p) => p.alumno_id === detalleAlumno.id && loteLibros.some((l) => l.id === p.libro_id))
    : [];

  const ningunaUnidad = !selectedUnidad;
  const sinLote = selectedUnidad && !nivel;
  const sinLibrosEnLote = nivel && loteLibros.length === 0;

  return (
    <div className="space-y-5">

      {/* Selector de grupo */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <select
            value={selectedUnidad}
            onChange={(e) => handleUnidadChange(e.target.value)}
            className="appearance-none border border-gray-300 rounded-lg pl-3 pr-8 py-2.5 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-44"
          >
            <option value="">Selecciona tu grupo...</option>
            {unidades.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        {selectedUnidad && (
          <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium px-2.5 py-1.5 rounded-full">
            <Users size={12} />
            {alumnosDelGrupo.length} alumnos/as
          </span>
        )}
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-lg">
          <AlertTriangle size={15} className="flex-shrink-0" />
          {errorMsg}
          <button onClick={() => setErrorMsg(null)} className="ml-auto text-red-400 hover:text-red-600">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Estados vacíos */}
      {ningunaUnidad && (
        <div className="text-center py-16 text-gray-400">
          <Users size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">Selecciona tu grupo para comenzar</p>
        </div>
      )}
      {sinLote && (
        <div className="text-center py-12 text-gray-400">
          <BookOpen size={36} className="mx-auto mb-2 opacity-40" />
          <p className="font-medium">No hay lote definido para este grupo</p>
        </div>
      )}
      {sinLibrosEnLote && (
        <div className="text-center py-12 text-gray-400">
          <BookOpen size={36} className="mx-auto mb-2 opacity-40" />
          <p className="font-medium">No hay libros activos para el nivel {nivel}</p>
        </div>
      )}

      {selectedUnidad && loteLibros.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">

          {/* Paso 1 — un solo libro */}
          <div className="md:col-span-2 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
              <span className="text-sm font-medium text-gray-700">Elige el libro que vas a entregar</span>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="divide-y divide-gray-50">
                {loteLibros.map((libro) => {
                  const disp = disponibles(libro.id);
                  const sinStock = disp === 0;
                  const isSelected = selectedLibroId === libro.id;
                  return (
                    <label
                      key={libro.id}
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors select-none ${sinStock ? "opacity-60" : ""} ${isSelected && !sinStock ? "bg-blue-50" : "hover:bg-gray-50"}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleLibro(libro.id)}
                        disabled={sinStock}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{libro.titulo}</p>
                        {libro.editorial && <p className="text-xs text-gray-400">{libro.editorial}</p>}
                      </div>
                      <span className={`text-sm font-semibold tabular-nums flex-shrink-0 ${sinStock ? "text-red-500" : "text-gray-700"}`}>
                        {disp}/{libro.stock_total}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Paso 2 — alumnos */}
          <div className="md:col-span-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
              <span className="text-sm font-medium text-gray-700">
                {selectedLibroId ? "Marca quién recibe el libro" : "Elige antes un libro en el paso 1"}
              </span>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="divide-y divide-gray-50">
                {alumnosDelGrupo.map((alumno) => {
                  const tieneLibro = selectedLibroId ? (alumnoLibrosMap[alumno.id]?.has(selectedLibroId) ?? false) : false;
                  const isProcessing = processingId === alumno.id;
                  const tieneAlgunLibro = (alumnoLibrosMap[alumno.id]?.size ?? 0) > 0;
                  return (
                    <div key={alumno.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={tieneLibro}
                        disabled={!selectedLibroId || isProcessing}
                        onChange={() => handleToggleAlumno(alumno)}
                        className="rounded border-gray-300 text-green-600 focus:ring-green-500 flex-shrink-0 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                        {initials(alumno)}
                      </div>
                      <span className="text-sm text-gray-800 flex-1 min-w-0 truncate">{alumno.alumno}</span>
                      {isProcessing ? (
                        <Loader2 size={14} className="text-gray-400 animate-spin flex-shrink-0" />
                      ) : tieneLibro ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full flex-shrink-0">
                          <CheckCircle size={11} />
                          Entregado
                        </span>
                      ) : null}
                      {tieneAlgunLibro && (
                        <button
                          onClick={() => setDetalleAlumno(alumno)}
                          title="Ver libros asignados"
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
                        >
                          <List size={13} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Confirmación de anulación */}
      {confirmarAnular && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="px-5 py-4 border-b flex items-center gap-3">
              <Trash2 size={20} className="text-red-500 flex-shrink-0" />
              <h2 className="font-semibold text-gray-900">Anular entrega</h2>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-gray-600">
                ¿Seguro que quieres anular la entrega de <span className="font-medium text-gray-800">{confirmarAnular.libroTitulo}</span> a{" "}
                <span className="font-medium text-gray-800">{confirmarAnular.alumno.alumno}</span>?
              </p>
              <p className="text-xs text-gray-400 mt-2">Usa esto solo si te has equivocado al marcarlo.</p>
            </div>
            <div className="flex gap-3 px-5 py-4 border-t">
              <button
                onClick={() => setConfirmarAnular(null)}
                className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarAnularEntrega}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
              >
                Anular
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detalle de libros del alumno (solo lectura) */}
      {detalleAlumno && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 flex-shrink-0">
                  {initials(detalleAlumno)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm truncate max-w-[180px]">{detalleAlumno.alumno}</p>
                  <p className="text-xs text-gray-500">Libros asignados del lote</p>
                </div>
              </div>
              <button onClick={() => setDetalleAlumno(null)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={18} />
              </button>
            </div>
            <div className="divide-y divide-gray-100">
              {librosDelDetalle.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10">Sin libros asignados del lote</p>
              ) : librosDelDetalle.map((p) => (
                <div key={p.id} className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-800 truncate">{p.libro?.titulo ?? "—"}</p>
                  <p className="text-xs text-gray-400">{p.libro?.asignatura ?? ""}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

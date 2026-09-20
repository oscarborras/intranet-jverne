"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Alumno, LibroCatalogo, PrestamoLibro } from "@/lib/types";

export const NO_ACTIVOS = "__no_activos__";

export interface Profesor { id: string; nombre: string; }

export function nivelFromUnidad(unidad: string): string | null {
  if (unidad.startsWith("1º ESO")) return "1º ESO";
  if (unidad.startsWith("2º ESO")) return "2º ESO";
  if (unidad.startsWith("3º ESO")) return "3º ESO";
  if (unidad.startsWith("4º ESO")) return "4º ESO";
  if (unidad.startsWith("1º BACH")) return "1º Bach";
  if (unidad.startsWith("2º BACH")) return "2º Bach";
  if (/CFGB|FPBS/i.test(unidad)) return "FP Básica";
  return null;
}

export function initials(alumno: Alumno): string {
  const p = alumno.primer_apellido?.[0] ?? "";
  const n = alumno.nombre?.[0] ?? "";
  return (p + n).toUpperCase() || alumno.alumno.slice(0, 2).toUpperCase();
}

export function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface Args {
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
  // El modo simple (profesor) no necesita gestionar el histórico de alumnos
  // que ya no están en el grupo — solo el modo avanzado lo expone.
  incluirNoActivos: boolean;
}

// Datos y escrituras compartidas entre el modo simple (profesor) y el modo
// avanzado (coordinación) de la pestaña Préstamos. Cada componente decide su
// propia interacción (selección, confirmaciones, mensajes); este hook solo
// calcula el estado derivado y ejecuta las operaciones contra Supabase.
export function usePrestamosLoteData({
  alumnos, alumnosInactivos, libros, prestamos, onPrestamosChange,
  cursoEscolar, myProfesorId, profesores, unidadesGratuidad, initialGrupo, incluirNoActivos,
}: Args) {
  const supabase = createClient();

  const [selectedUnidad, setSelectedUnidad] = useState<string>(initialGrupo ?? "");
  const [overrideProfesorId, setOverrideProfesorId] = useState<string>(myProfesorId ?? "");

  const efectivoProfesorId = myProfesorId ?? (overrideProfesorId || null);

  // ── Refresh activos desde BD al montar ────────────────────────────────────
  useEffect(() => {
    async function refreshActivos() {
      const { data } = await supabase
        .from("prestamos_libros")
        .select("id, libro_id, alumno_id, alumno_nombre, alumno_grupo, num_ejemplar, fecha_prestamo, entregado_por, devuelto_por, curso_escolar, fecha_devolucion, estado_devolucion, observaciones, created_at, libro:libros_catalogo(titulo, asignatura, nivel, diversificacion)")
        .eq("curso_escolar", cursoEscolar)
        .is("fecha_devolucion", null)
        .order("alumno_grupo")
        .order("alumno_nombre");

      if (!data) return;

      const profIds = [...new Set(data.map((p) => p.entregado_por).filter(Boolean) as string[])];
      let nameMap: Record<string, string> = {};
      if (profIds.length > 0) {
        const { data: profData } = await supabase.from("profesores").select("id, profesor").in("id", profIds);
        nameMap = Object.fromEntries((profData ?? []).map((p) => [p.id as string, p.profesor as string]));
      }

      const updated = data.map((p) => ({
        ...p,
        libro: (p.libro as unknown as { titulo: string; asignatura: string; nivel: string; diversificacion?: boolean } | null) ?? undefined,
        entregado_por_nombre: { profesor: nameMap[p.entregado_por as string] ?? "—" },
      })) as PrestamoLibro[];

      onPrestamosChange(updated);
    }
    refreshActivos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursoEscolar]);

  // ── Derived ────────────────────────────────────────────────────────────────

  const unidades = useMemo(() => {
    const gratuidadSet = new Set(unidadesGratuidad);
    const groups = [...new Set(alumnos.map((a) => a.unidad))]
      .filter((u) => gratuidadSet.has(u))
      .sort();
    if (incluirNoActivos && alumnosInactivos.length > 0) groups.push(NO_ACTIVOS);
    return groups;
  }, [alumnos, unidadesGratuidad, alumnosInactivos, incluirNoActivos]);

  const isNoActivos = selectedUnidad === NO_ACTIVOS;
  const nivel = selectedUnidad && !isNoActivos ? nivelFromUnidad(selectedUnidad) : null;

  const alumnosDelGrupo = useMemo(
    () => isNoActivos ? alumnosInactivos : alumnos.filter((a) => a.unidad === selectedUnidad),
    [alumnos, alumnosInactivos, selectedUnidad, isNoActivos]
  );

  const loteLibros = useMemo(
    () => (nivel ? libros.filter((l) => l.nivel === nivel && l.activo) : []),
    [libros, nivel]
  );

  const loanCountsPerLibro = useMemo(() =>
    prestamos.reduce<Record<string, number>>((acc, p) => {
      acc[p.libro_id] = (acc[p.libro_id] ?? 0) + 1;
      return acc;
    }, {}),
    [prestamos]);

  const disponibles = useCallback(
    (libroId: string) => {
      const libro = libros.find((l) => l.id === libroId);
      return Math.max(0, (libro?.stock_total ?? 0) - (loanCountsPerLibro[libroId] ?? 0));
    },
    [libros, loanCountsPerLibro]
  );

  const alumnoLibrosMap = useMemo(() => {
    const loteIds = new Set(loteLibros.map((l) => l.id));
    const map: Record<string, Set<string>> = {};
    for (const p of prestamos) {
      if (p.alumno_id && loteIds.has(p.libro_id)) {
        if (!map[p.alumno_id]) map[p.alumno_id] = new Set();
        map[p.alumno_id].add(p.libro_id);
      }
    }
    return map;
  }, [prestamos, loteLibros]);

  // Fila concreta de préstamo por alumno+libro, para poder anular un libro
  // exacto (si hubiera más de una fila histórica, se usa la más reciente).
  const prestamoPorAlumnoYLibro = useMemo(() => {
    const map: Record<string, Record<string, PrestamoLibro>> = {};
    const loteIds = new Set(loteLibros.map((l) => l.id));
    for (const p of prestamos) {
      if (p.alumno_id && loteIds.has(p.libro_id)) {
        if (!map[p.alumno_id]) map[p.alumno_id] = {};
        const previo = map[p.alumno_id][p.libro_id];
        if (!previo || p.created_at > previo.created_at) map[p.alumno_id][p.libro_id] = p;
      }
    }
    return map;
  }, [prestamos, loteLibros]);

  const libroTituloMap = useMemo(() =>
    Object.fromEntries(loteLibros.map((l) => [l.id, l.titulo])),
    [loteLibros]);

  const profesorNombreMap = useMemo(
    () => Object.fromEntries(profesores.map((p) => [p.id, p.nombre])),
    [profesores]
  );

  // Map: alumno_id → todos los préstamos activos (usado en modo No activos)
  const allPrestamosMap = useMemo(() => {
    const map: Record<string, PrestamoLibro[]> = {};
    for (const p of prestamos) {
      if (!p.alumno_id) continue;
      if (!map[p.alumno_id]) map[p.alumno_id] = [];
      map[p.alumno_id].push(p);
    }
    return map;
  }, [prestamos]);

  function handleUnidadChange(unidad: string) {
    setSelectedUnidad(unidad);
  }

  // ── Escrituras ─────────────────────────────────────────────────────────────

  async function insertarPrestamos(
    pares: { alumnoId: string; libroId: string }[],
    fecha: string
  ): Promise<{ insertados: number; error?: string }> {
    if (!efectivoProfesorId) {
      return { insertados: 0, error: "Selecciona el profesor que registra la entrega antes de continuar." };
    }
    if (pares.length === 0) return { insertados: 0 };

    const inserts = pares.map(({ alumnoId, libroId }) => {
      const alumno = alumnos.find((a) => a.id === alumnoId) ?? alumnosInactivos.find((a) => a.id === alumnoId);
      return {
        libro_id: libroId,
        alumno_id: alumnoId,
        alumno_nombre: alumno?.alumno ?? "",
        alumno_grupo: alumno?.unidad ?? "",
        curso_escolar: cursoEscolar,
        fecha_prestamo: fecha,
        entregado_por: efectivoProfesorId,
      };
    });

    const { data, error } = await supabase
      .from("prestamos_libros")
      .insert(inserts)
      .select("id, libro_id, alumno_id, alumno_nombre, alumno_grupo, num_ejemplar, fecha_prestamo, entregado_por, devuelto_por, curso_escolar, fecha_devolucion, estado_devolucion, observaciones, en_revision, estado_revision, fecha_revision, created_at, libro:libros_catalogo(titulo, asignatura, nivel)");

    if (error || !data) {
      return { insertados: 0, error: error?.message ?? "Respuesta inesperada del servidor" };
    }

    const nombreProfesor = profesorNombreMap[efectivoProfesorId] ?? "—";
    const newPrestamos: PrestamoLibro[] = data.map((p) => ({
      ...p,
      libro: (p.libro as unknown as { titulo: string; asignatura: string; nivel: string }[] | null)?.[0] ?? undefined,
      entregado_por_nombre: { profesor: nombreProfesor },
      en_revision: false,
      estado_revision: null,
      fecha_revision: null,
      revisado_por: null,
      devolucion_registrada_at: null,
    }));
    onPrestamosChange((prev) => [...prev, ...newPrestamos]);
    return { insertados: newPrestamos.length };
  }

  async function eliminarPrestamos(ids: string[]): Promise<{ error?: string }> {
    if (ids.length === 0) return {};
    const { error } = await supabase.from("prestamos_libros").delete().in("id", ids);
    if (error) return { error: error.message };
    onPrestamosChange((prev) => prev.filter((p) => !ids.includes(p.id)));
    return {};
  }

  return {
    // grupo / alumnos
    selectedUnidad, setSelectedUnidad: handleUnidadChange,
    unidades, isNoActivos, nivel,
    alumnosDelGrupo, allPrestamosMap,
    // libros / stock
    loteLibros, disponibles,
    // relación alumno↔libro
    alumnoLibrosMap, prestamoPorAlumnoYLibro, libroTituloMap,
    // profesor
    profesorNombreMap, overrideProfesorId, setOverrideProfesorId, efectivoProfesorId,
    // escrituras
    insertarPrestamos, eliminarPrestamos,
  };
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GraduationCap, Mail, Phone, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  coincide, cursoDeUnidad, esBaja, nombreTutor, textoBusqueda, type AlumnoFicha,
} from "@/lib/alumnado";

interface Props {
  alumnos: AlumnoFicha[];
}

/** Results rendered at first; more are added on demand */
const PASO = 50;

const selectCls = "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";

export function AlumnadoClient({ alumnos }: Props) {
  const [busqueda, setBusqueda] = useState("");
  const [curso, setCurso] = useState("");
  const [grupo, setGrupo] = useState("");
  const [incluirBajas, setIncluirBajas] = useState(false);
  const [mostrar, setMostrar] = useState(PASO);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) inputRef.current?.focus();
  }, []);

  // Search text is built once per student
  const indexados = useMemo(() => alumnos.map((a) => ({ a, texto: textoBusqueda(a), baja: esBaja(a) })), [alumnos]);

  const grupos = useMemo(
    () => [...new Set(alumnos.filter((a) => incluirBajas || !esBaja(a)).map((a) => a.unidad).filter(Boolean))]
      .sort((x, y) => x.localeCompare(y, "es")),
    [alumnos, incluirBajas],
  );
  const cursos = useMemo(() => [...new Set(grupos.map(cursoDeUnidad))].sort((x, y) => x.localeCompare(y, "es")), [grupos]);
  const gruposDelCurso = useMemo(() => (curso ? grupos.filter((g) => cursoDeUnidad(g) === curso) : grupos), [grupos, curso]);

  const resultados = useMemo(() => indexados.filter(({ a, texto, baja }) =>
    (incluirBajas || !baja)
    && (!curso || cursoDeUnidad(a.unidad) === curso)
    && (!grupo || a.unidad === grupo)
    && coincide(texto, busqueda),
  ), [indexados, incluirBajas, curso, grupo, busqueda]);

  // Back to the first page of results whenever the filters change
  useEffect(() => { setMostrar(PASO); }, [busqueda, curso, grupo, incluirBajas]);

  const hayFiltros = Boolean(busqueda.trim() || curso || grupo);

  function limpiar() {
    setBusqueda("");
    setCurso("");
    setGrupo("");
    inputRef.current?.focus();
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <GraduationCap size={24} className="text-indigo-600" aria-hidden="true" />
          Alumnado
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Datos del alumnado y contacto de las familias.</p>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-2">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={inputRef}
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Escribe nombre, apellidos, grupo, NIE, tutor, teléfono o email…"
            aria-label="Buscar alumnado"
            className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <p className="text-xs text-gray-400">Se buscan todas las palabras, en cualquier orden y sin importar tildes ni mayúsculas. Ej.: «garcia 2 eso».</p>
        <div className="grid grid-cols-2 lg:grid-cols-[1fr_1fr_auto] gap-2 items-center">
          <select
            value={curso}
            onChange={(e) => { setCurso(e.target.value); setGrupo(""); }}
            aria-label="Curso"
            className={selectCls}
          >
            <option value="">Todos los cursos</option>
            {cursos.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={grupo} onChange={(e) => setGrupo(e.target.value)} aria-label="Grupo" className={selectCls}>
            <option value="">{curso ? `Todos los grupos de ${curso}` : "Todos los grupos"}</option>
            {gruposDelCurso.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <label className="col-span-2 lg:col-span-1 flex items-center gap-2 text-sm text-gray-600 cursor-pointer px-1">
            <input type="checkbox" checked={incluirBajas} onChange={(e) => setIncluirBajas(e.target.checked)} className="w-4 h-4 rounded" />
            Incluir alumnos dados de baja
          </label>
        </div>
        <div className="flex items-center justify-between pt-1">
          <p className="text-sm text-gray-500" aria-live="polite">
            {hayFiltros
              ? `${resultados.length} ${resultados.length === 1 ? "alumno" : "alumnos"}`
              : `${indexados.filter((x) => incluirBajas || !x.baja).length} alumnos en total`}
          </p>
          {hayFiltros && (
            <button onClick={limpiar} className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
              <X size={14} /> Quitar filtros
            </button>
          )}
        </div>
      </div>

      {/* Results: only once something has been typed or a course / group chosen */}
      {!hayFiltros ? (
        <div className="text-center py-16 text-gray-400">
          <Search size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">Escribe en el buscador o elige un curso o grupo</p>
          <p className="text-sm mt-1">Los resultados aparecerán aquí.</p>
        </div>
      ) : resultados.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <GraduationCap size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">No hay alumnos con esos filtros</p>
          {!incluirBajas && <p className="text-sm mt-1">Prueba a incluir también a los alumnos dados de baja.</p>}
        </div>
      ) : (
        <>
          <ul className="grid gap-3 lg:grid-cols-2">
            {resultados.slice(0, mostrar).map(({ a, baja }) => (
              <li key={a.id} className={cn("bg-white border border-gray-200 rounded-xl p-4", baja && "opacity-75")}>
                <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
                  <h2 className="font-semibold text-gray-900 flex-1 min-w-0">{a.alumno}</h2>
                  {a.unidad && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">{a.unidad}</span>}
                  {baja && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Baja</span>}
                </div>
                <dl className="mt-1 text-sm text-gray-600 flex flex-wrap gap-x-4 gap-y-0.5">
                  {a.unidad && (<div><dt className="inline text-gray-400">Curso: </dt><dd className="inline">{cursoDeUnidad(a.unidad)}</dd></div>)}
                  {a.edad_matricula && (
                    <div><dt className="inline text-gray-400">Edad: </dt><dd className="inline" title="Edad en el momento de la matrícula">{a.edad_matricula} años</dd></div>
                  )}
                  {a.nie && (<div><dt className="inline text-gray-400">NIE: </dt><dd className="inline font-mono">{a.nie}</dd></div>)}
                </dl>
                <div className="mt-3 grid sm:grid-cols-2 gap-3">
                  <Tutor titulo="Tutor/a 1" nombre={nombreTutor(a, 1)} telefono={a.tutor1_telefono} email={a.tutor1_email} />
                  <Tutor titulo="Tutor/a 2" nombre={nombreTutor(a, 2)} telefono={a.tutor2_telefono} email={a.tutor2_email} />
                </div>
              </li>
            ))}
          </ul>
          {resultados.length > mostrar && (
            <div className="text-center">
              <button
                onClick={() => setMostrar((m) => m + PASO)}
                className="px-4 py-2.5 text-sm font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50"
              >
                Mostrar más ({resultados.length - mostrar} restantes)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Tutor({ titulo, nombre, telefono, email }: { titulo: string; nombre: string; telefono: string | null; email: string | null }) {
  const sinDatos = !nombre && !telefono && !email;
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2 min-w-0">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{titulo}</p>
      {sinDatos ? (
        <p className="text-sm text-gray-400">Sin datos</p>
      ) : (
        <>
          {nombre && <p className="text-sm font-medium text-gray-800 truncate">{nombre}</p>}
          {telefono && (
            <a href={`tel:${telefono.replace(/\s+/g, "")}`} className="flex items-center gap-1.5 text-sm text-blue-700 hover:underline py-0.5">
              <Phone size={14} className="flex-shrink-0" /> {telefono}
            </a>
          )}
          {email && (
            <a href={`mailto:${email}`} className="flex items-center gap-1.5 text-sm text-blue-700 hover:underline py-0.5 min-w-0">
              <Mail size={14} className="flex-shrink-0" /> <span className="truncate">{email}</span>
            </a>
          )}
        </>
      )}
    </div>
  );
}

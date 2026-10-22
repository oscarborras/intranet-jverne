"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Phone, Plus, Search, Trash2, UserCheck, X } from "lucide-react";
import { cursoDeUnidad } from "@/lib/alumnado";
import {
  textoBusquedaAutorizados, type AlumnoConAutorizados, type AutorizadoRecogida,
} from "@/lib/autorizados";
import { useTextFilter } from "@/lib/useTextFilter";

interface Props {
  alumnosIniciales: AlumnoConAutorizados[];
  puedeGestionar: boolean;
}

/** Results rendered at first; more are added on demand */
const PASO = 50;

const selectCls = "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";
const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500";

function formatFechaHora(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function AutorizadosClient({ alumnosIniciales, puedeGestionar }: Props) {
  const [alumnos, setAlumnos] = useState(alumnosIniciales);
  const [busqueda, setBusqueda] = useState("");
  const [curso, setCurso] = useState("");
  const [grupo, setGrupo] = useState("");
  const [soloSin, setSoloSin] = useState(false);
  const [mostrar, setMostrar] = useState(PASO);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) inputRef.current?.focus();
  }, []);

  const grupos = useMemo(
    () => [...new Set(alumnos.map((a) => a.unidad).filter(Boolean))].sort((x, y) => x.localeCompare(y, "es")),
    [alumnos],
  );
  const cursos = useMemo(() => [...new Set(grupos.map(cursoDeUnidad))].sort((x, y) => x.localeCompare(y, "es")), [grupos]);
  const gruposDelCurso = useMemo(() => (curso ? grupos.filter((g) => cursoDeUnidad(g) === curso) : grupos), [grupos, curso]);

  const porFiltros = useMemo(() => alumnos.filter((a) =>
    (!soloSin || a.autorizados_recogida.length === 0)
    && (!curso || cursoDeUnidad(a.unidad) === curso)
    && (!grupo || a.unidad === grupo),
  ), [alumnos, soloSin, curso, grupo]);
  const resultados = useTextFilter(porFiltros, textoBusquedaAutorizados, busqueda);

  // Back to the first page of results whenever the filters change
  useEffect(() => { setMostrar(PASO); }, [busqueda, curso, grupo, soloSin]);

  const hayFiltros = Boolean(busqueda.trim() || curso || grupo || soloSin);
  const totalAutorizados = useMemo(() => alumnos.reduce((n, a) => n + a.autorizados_recogida.length, 0), [alumnos]);

  function limpiar() {
    setBusqueda("");
    setCurso("");
    setGrupo("");
    setSoloSin(false);
    inputRef.current?.focus();
  }

  function onAnadido(alumnoId: string, autorizado: AutorizadoRecogida) {
    setAlumnos((prev) => prev.map((a) => a.id === alumnoId
      ? {
        ...a,
        autorizados_recogida: [...a.autorizados_recogida, autorizado].sort((x, y) => x.nombre.localeCompare(y.nombre, "es")),
      }
      : a));
  }

  function onEliminado(alumnoId: string, autorizadoId: string) {
    setAlumnos((prev) => prev.map((a) => a.id === alumnoId
      ? { ...a, autorizados_recogida: a.autorizados_recogida.filter((p) => p.id !== autorizadoId) }
      : a));
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <UserCheck size={24} className="text-emerald-600" aria-hidden="true" />
          Autorizados a recoger
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Personas autorizadas a recoger al alumnado del centro.</p>
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
            placeholder="Escribe alumno/a, grupo, persona autorizada, DNI o teléfono…"
            aria-label="Buscar autorizados"
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
            <input type="checkbox" checked={soloSin} onChange={(e) => setSoloSin(e.target.checked)} className="w-4 h-4 rounded" />
            Solo alumnos sin autorizados
          </label>
        </div>
        <div className="flex items-center justify-between pt-1">
          <p className="text-sm text-gray-500" aria-live="polite">
            {hayFiltros
              ? `${resultados.length} ${resultados.length === 1 ? "alumno" : "alumnos"}`
              : `${totalAutorizados} personas autorizadas · ${alumnos.length} alumnos`}
          </p>
          {hayFiltros && (
            <button onClick={limpiar} className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
              <X size={14} /> Quitar filtros
            </button>
          )}
        </div>
      </div>

      {/* Results: only once something has been typed or a filter chosen */}
      {!hayFiltros ? (
        <div className="text-center py-16 text-gray-400">
          <Search size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">Escribe en el buscador o elige un curso o grupo</p>
          <p className="text-sm mt-1">Los resultados aparecerán aquí.</p>
        </div>
      ) : resultados.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <UserCheck size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">No hay alumnos con esos filtros</p>
        </div>
      ) : (
        <>
          <ul className="grid gap-3 lg:grid-cols-2">
            {resultados.slice(0, mostrar).map((a) => (
              <FichaAlumno
                key={a.id}
                alumno={a}
                puedeGestionar={puedeGestionar}
                onAnadido={onAnadido}
                onEliminado={onEliminado}
              />
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

function FichaAlumno({ alumno, puedeGestionar, onAnadido, onEliminado }: {
  alumno: AlumnoConAutorizados;
  puedeGestionar: boolean;
  onAnadido: (alumnoId: string, autorizado: AutorizadoRecogida) => void;
  onEliminado: (alumnoId: string, autorizadoId: string) => void;
}) {
  const [anadiendo, setAnadiendo] = useState(false);

  return (
    <li className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
        <h2 className="font-semibold text-gray-900 flex-1 min-w-0">{alumno.alumno}</h2>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">{alumno.unidad}</span>
      </div>

      {alumno.autorizados_recogida.length === 0 ? (
        <p className="mt-3 text-sm text-gray-400 bg-gray-50 rounded-lg px-3 py-2">Sin personas autorizadas</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {alumno.autorizados_recogida.map((p) => (
            <Autorizado
              key={p.id}
              autorizado={p}
              puedeGestionar={puedeGestionar}
              onEliminado={() => onEliminado(alumno.id, p.id)}
            />
          ))}
        </ul>
      )}

      {puedeGestionar && (
        anadiendo ? (
          <FormularioAlta
            alumnoId={alumno.id}
            onCancelar={() => setAnadiendo(false)}
            onGuardado={(autorizado) => { onAnadido(alumno.id, autorizado); setAnadiendo(false); }}
          />
        ) : (
          <button
            onClick={() => setAnadiendo(true)}
            className="mt-3 flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2"
          >
            <Plus size={16} /> Añadir autorizado
          </button>
        )
      )}
    </li>
  );
}

function Autorizado({ autorizado: p, puedeGestionar, onEliminado }: {
  autorizado: AutorizadoRecogida;
  puedeGestionar: boolean;
  onEliminado: () => void;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fecha = formatFechaHora(p.fecha_alta);

  async function eliminar() {
    setEliminando(true);
    setError(null);
    const res = await fetch(`/api/autorizados/${p.id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json().catch(() => ({})) as { error?: string };
      setError(json.error ?? "No se ha podido eliminar.");
      setEliminando(false);
      return;
    }
    onEliminado();
  }

  return (
    <li className="bg-gray-50 rounded-lg px-3 py-2">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-800">
            {p.nombre}
            {p.origen === "manual" && (
              <span className="ml-2 text-[11px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 align-middle">Manual</span>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-sm text-gray-600">
            {p.dni && <span><span className="text-gray-400">DNI: </span><span className="font-mono">{p.dni}</span></span>}
            {p.telefono && (
              <a href={`tel:${p.telefono.replace(/\s+/g, "")}`} className="flex items-center gap-1.5 text-blue-700 hover:underline py-0.5">
                <Phone size={14} className="flex-shrink-0" /> {p.telefono}
              </a>
            )}
          </div>
          {(p.usuario_alta || fecha) && (
            <p className="text-xs text-gray-400 mt-0.5">
              Alta{fecha && ` el ${fecha}`}{p.usuario_alta && ` por ${p.usuario_alta}`}
            </p>
          )}
        </div>
        {puedeGestionar && !confirmando && (
          <button
            onClick={() => setConfirmando(true)}
            aria-label={`Eliminar a ${p.nombre}`}
            className="p-2 -m-1 text-gray-400 hover:text-red-600 rounded-lg"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
      {confirmando && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-red-700">¿Eliminar esta persona autorizada?</span>
          <button
            onClick={eliminar}
            disabled={eliminando}
            className="flex items-center gap-1 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-medium px-3 py-1.5 rounded-lg"
          >
            {eliminando && <Loader2 size={14} className="animate-spin" />} Eliminar
          </button>
          <button
            onClick={() => { setConfirmando(false); setError(null); }}
            disabled={eliminando}
            className="border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-white"
          >
            Cancelar
          </button>
        </div>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </li>
  );
}

function FormularioAlta({ alumnoId, onCancelar, onGuardado }: {
  alumnoId: string;
  onCancelar: () => void;
  onGuardado: (autorizado: AutorizadoRecogida) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [dni, setDni] = useState("");
  const [telefono, setTelefono] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    setGuardando(true);
    setError(null);
    const res = await fetch("/api/autorizados", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alumno_id: alumnoId, nombre, dni, telefono }),
    });
    const json = await res.json().catch(() => ({})) as { success?: boolean; error?: string; autorizado?: AutorizadoRecogida };
    if (!res.ok || !json.autorizado) {
      setError(json.error ?? "No se ha podido guardar.");
      setGuardando(false);
      return;
    }
    onGuardado(json.autorizado);
  }

  return (
    <form onSubmit={guardar} className="mt-3 space-y-2 border border-emerald-200 bg-emerald-50/40 rounded-lg p-3">
      <p className="text-sm font-semibold text-gray-700">Nueva persona autorizada</p>
      <input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Apellidos, Nombre *"
        aria-label="Apellidos y nombre"
        autoFocus
        className={inputCls}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input value={dni} onChange={(e) => setDni(e.target.value)} placeholder="DNI/NIE" aria-label="DNI o NIE" className={inputCls} />
        <input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Teléfono" aria-label="Teléfono" type="tel" inputMode="tel" className={inputCls} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={guardando}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-sm font-medium px-4 py-2.5 rounded-lg"
        >
          {guardando && <Loader2 size={14} className="animate-spin" />} Guardar
        </button>
        <button
          type="button"
          onClick={onCancelar}
          disabled={guardando}
          className="border border-gray-300 text-gray-600 text-sm px-4 py-2.5 rounded-lg hover:bg-white"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

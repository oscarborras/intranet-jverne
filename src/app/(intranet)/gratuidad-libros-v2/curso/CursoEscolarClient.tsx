"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CalendarRange, CheckCircle2, ChevronDown, ChevronUp, History, Loader2, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/gratuidad-v2/Modal";
import {
  MENSAJES_ERROR_V2,
  type CerrarCursoResult, type CierreCursoV2, type ProgresoGrupoV2, type ResumenCierreV2,
} from "@/lib/types/gratuidadV2";

type CierreConProfesor = CierreCursoV2 & { profesor: { profesor: string } | null };

interface Props {
  resumen: ResumenCierreV2;
  cierres: CierreConProfesor[];
  /** false = the year is still worked out from the date (never closed) */
  cursoFijado: boolean;
}

function fechaHora(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function CursoEscolarClient({ resumen, cierres, cursoFijado }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [crearIncidencias, setCrearIncidencias] = useState(resumen.bajas_libros > 0);
  const [confirmando, setConfirmando] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Extract<CerrarCursoResult, { ok: true }> | null>(null);
  const [verGrupos, setVerGrupos] = useState(false);
  const [cierreAbierto, setCierreAbierto] = useState<string | null>(null);

  const yaCerrado = cierres.some((c) => c.curso_escolar === resumen.curso);

  async function cerrar() {
    setCerrando(true);
    setError(null);
    const { data, error: err } = await supabase.rpc("gplv2_cerrar_curso", {
      p_curso: resumen.curso,
      p_incidencias_bajas: crearIncidencias && resumen.bajas_libros > 0,
    });
    setCerrando(false);
    const res = data as CerrarCursoResult | null;
    if (err || !res) { setError(err?.message ?? "Error al cerrar el curso"); return; }
    if (!res.ok) { setError(MENSAJES_ERROR_V2[res.error]); return; }
    setResultado(res);
    setConfirmando(false);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {resultado && (
        <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-900">
          <CheckCircle2 size={20} className="flex-shrink-0 mt-0.5" />
          <p>
            Curso <b>{resultado.curso_cerrado}</b> cerrado. El curso activo es ahora <b>{resultado.nuevo_curso}</b>.
            {resultado.incidencias_creadas > 0 && ` Se han creado ${resultado.incidencias_creadas} incidencias de pérdida.`}
          </p>
        </div>
      )}

      {/* Active year */}
      <section className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap items-center gap-4">
        <span className="w-12 h-12 rounded-xl bg-teal-600 text-white flex items-center justify-center"><CalendarRange size={24} /></span>
        <div className="flex-1 min-w-[12rem]">
          <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase">Curso escolar activo</p>
          <p className="text-2xl font-bold text-gray-900">{resumen.curso}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {cursoFijado
              ? "Fijado al cerrar el curso anterior. Solo cambia cuando se cierra este curso."
              : "Calculado por la fecha: cambia solo el 1 de septiembre. Tras el primer cierre, cambiará solo al cerrar el curso."}
          </p>
        </div>
      </section>

      {/* Pre-closing summary */}
      <section aria-labelledby="sec-situacion" className="space-y-3">
        <h2 id="sec-situacion" className="font-semibold text-gray-900">Situación actual</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="Libros prestados" value={resumen.prestamos_activos} hint={`${resumen.alumnos_con_libros} alumnos`} />
          <Stat label="De cursos anteriores" value={resumen.de_cursos_anteriores} hint="prestados antes de este curso" />
          <Stat label={`Entregados en ${resumen.curso}`} value={resumen.entregados_curso} hint={`${resumen.devueltos_curso} devueltos · ${resumen.perdidos_curso} perdidos`} />
          <Stat label="Incidencias abiertas" value={resumen.incidencias_abiertas} hint="deterioros y pérdidas" warn={resumen.incidencias_abiertas > 0} />
        </div>

        {(resumen.bajas_alumnos > 0 || resumen.incidencias_abiertas > 0 || resumen.prestamos_activos > 0) && (
          <ul className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1.5 text-sm text-amber-900">
            {resumen.prestamos_activos > 0 && (
              <li className="flex gap-2">
                <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                <span>
                  {resumen.prestamos_activos} libros siguen prestados. Al cerrar el curso <b>no se pierden</b>: seguirán pendientes de devolver.{" "}
                  <Link href="/gratuidad-libros-v2/informes?tab=pendientes" className="underline">Ver pendientes</Link>
                </span>
              </li>
            )}
            {resumen.bajas_alumnos > 0 && (
              <li className="flex gap-2">
                <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                <span>
                  {resumen.bajas_alumnos} alumnos dados de baja tienen {resumen.bajas_libros} libros sin devolver.{" "}
                  <Link href="/gratuidad-libros-v2/informes?tab=pendientes&bajas=1" className="underline">Ver listado</Link>
                </span>
              </li>
            )}
            {resumen.incidencias_abiertas > 0 && (
              <li className="flex gap-2">
                <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                <span>
                  Hay {resumen.incidencias_abiertas} incidencias abiertas; seguirán abiertas en el curso nuevo.{" "}
                  <Link href="/gratuidad-libros-v2/incidencias" className="underline">Ver incidencias</Link>
                </span>
              </li>
            )}
          </ul>
        )}

        {resumen.grupos.length > 0 && (
          <div>
            <button onClick={() => setVerGrupos((v) => !v)} aria-expanded={verGrupos} className="flex items-center gap-1 text-sm font-medium text-blue-700 hover:underline">
              {verGrupos ? <ChevronUp size={16} /> : <ChevronDown size={16} />} Detalle por grupo
            </button>
            {verGrupos && <TablaGrupos grupos={resumen.grupos} />}
          </div>
        )}
      </section>

      {/* Closing */}
      <section aria-labelledby="sec-cierre" className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <h2 id="sec-cierre" className="font-semibold text-gray-900 flex items-center gap-2"><Lock size={16} /> Cerrar el curso {resumen.curso}</h2>
        {yaCerrado ? (
          <p className="text-sm text-gray-600">Este curso ya está cerrado.</p>
        ) : !resumen.siguiente ? (
          <p className="text-sm text-red-600">{MENSAJES_ERROR_V2.curso_invalido}.</p>
        ) : (
          <>
            <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
              <li>Se guarda una foto del curso con las cifras de arriba y el detalle por grupo.</li>
              <li>El curso activo pasa a ser <b>{resumen.siguiente}</b>. Las nuevas entregas quedarán registradas en ese curso.</li>
              <li>Los libros no devueltos se mantienen prestados. En Entrega aparecerán como «del curso anterior» y se podrán renovar.</li>
            </ul>
            <label className={cn("flex items-start gap-2 text-sm cursor-pointer", resumen.bajas_libros === 0 && "opacity-50 cursor-not-allowed")}>
              <input
                type="checkbox"
                checked={crearIncidencias && resumen.bajas_libros > 0}
                disabled={resumen.bajas_libros === 0}
                onChange={(e) => setCrearIncidencias(e.target.checked)}
                className="w-4 h-4 rounded mt-0.5"
              />
              <span>
                Crear una incidencia de pérdida por cada libro de alumnos dados de baja ({resumen.bajas_libros})
                <span className="block text-xs text-gray-400">Con el importe del libro, para reclamarlo. El préstamo sigue abierto por si el libro aparece.</span>
              </span>
            </label>
            <button
              onClick={() => { setError(null); setConfirmando(true); }}
              className="px-4 py-3 text-sm font-semibold rounded-lg bg-gray-900 text-white hover:bg-gray-800"
            >
              Cerrar {resumen.curso} y abrir {resumen.siguiente}
            </button>
          </>
        )}
      </section>

      {/* History */}
      <section aria-labelledby="sec-historial" className="space-y-2">
        <h2 id="sec-historial" className="font-semibold text-gray-900 flex items-center gap-2"><History size={16} /> Cursos cerrados</h2>
        {cierres.length === 0 ? (
          <p className="text-sm text-gray-400">Aún no se ha cerrado ningún curso.</p>
        ) : (
          <ul className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
            {cierres.map((c) => {
              const abierto = cierreAbierto === c.id;
              const r = c.resumen;
              return (
                <li key={c.id} className="px-4 py-3">
                  <button onClick={() => setCierreAbierto(abierto ? null : c.id)} aria-expanded={abierto} className="w-full flex flex-wrap items-center gap-x-4 gap-y-1 text-left">
                    <span className="font-semibold text-gray-900">{c.curso_escolar}</span>
                    <span className="text-xs text-gray-500">
                      Cerrado el {fechaHora(c.cerrado_at)}{c.profesor && ` por ${c.profesor.profesor}`}
                    </span>
                    <span className="text-sm text-gray-600 sm:ml-auto">
                      {r.entregados_curso} entregados · {r.devueltos_curso} devueltos · {r.prestamos_activos} pendientes
                    </span>
                    {abierto ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </button>
                  {abierto && (
                    <div className="mt-3 space-y-2 text-sm text-gray-600">
                      <p>
                        {r.perdidos_curso} perdidos · {r.de_cursos_anteriores} de cursos anteriores · {r.bajas_libros} libros de alumnos de baja ·{" "}
                        {r.incidencias_abiertas} incidencias abiertas
                        {c.incidencias_bajas > 0 && ` (${c.incidencias_bajas} creadas al cerrar)`}
                      </p>
                      {r.grupos?.length > 0 && <TablaGrupos grupos={r.grupos} />}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {confirmando && (
        <Modal
          titulo={`Cerrar el curso ${resumen.curso}`}
          onClose={() => !cerrando && setConfirmando(false)}
          footer={
            <>
              <button onClick={() => setConfirmando(false)} disabled={cerrando} className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button onClick={cerrar} disabled={cerrando} className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold bg-gray-900 hover:bg-gray-800 text-white rounded-lg disabled:opacity-50">
                {cerrando && <Loader2 size={15} className="animate-spin" />} Cerrar curso
              </button>
            </>
          }
        >
          <div className="space-y-3 text-sm text-gray-700">
            <p>
              El curso activo pasará de <b>{resumen.curso}</b> a <b>{resumen.siguiente}</b> para todo el módulo.
              Los {resumen.prestamos_activos} libros prestados seguirán pendientes de devolver.
            </p>
            {crearIncidencias && resumen.bajas_libros > 0 && (
              <p>Se crearán <b>{resumen.bajas_libros}</b> incidencias de pérdida para alumnos dados de baja.</p>
            )}
            <p className="text-gray-500">Asegúrate de haber exportado los informes que necesites del curso {resumen.curso}.</p>
            {error && <p className="text-red-600">{error}</p>}
          </div>
        </Modal>
      )}
    </div>
  );
}

function Stat({ label, value, hint, warn }: { label: string; value: number; hint: string; warn?: boolean }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase mb-2">{label}</p>
      <p className={cn("text-3xl font-bold", warn ? "text-amber-600" : "text-gray-900")}>{value}</p>
      <p className="text-xs text-gray-400 mt-1">{hint}</p>
    </div>
  );
}

function TablaGrupos({ grupos }: { grupos: ProgresoGrupoV2[] }) {
  return (
    <div className="mt-2 bg-white border border-gray-200 rounded-xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
          <tr>
            <th scope="col" className="text-left px-4 py-2">Grupo</th>
            <th scope="col" className="text-right px-3 py-2">Alumnos</th>
            <th scope="col" className="text-right px-3 py-2">Lote completo</th>
            <th scope="col" className="text-right px-3 py-2">Entregados</th>
            <th scope="col" className="text-right px-3 py-2">Pendientes</th>
            <th scope="col" className="text-right px-4 py-2">Devueltos</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {grupos.map((g) => (
            <tr key={g.grupo}>
              <th scope="row" className="text-left font-medium text-gray-800 px-4 py-2">{g.grupo}</th>
              <td className="text-right px-3 tabular-nums">{g.alumnos}</td>
              <td className="text-right px-3 tabular-nums">{g.completos}</td>
              <td className="text-right px-3 tabular-nums">{g.entregados} / {g.esperados}</td>
              <td className="text-right px-3 tabular-nums">{g.prestados}</td>
              <td className="text-right px-4 tabular-nums">{g.devueltos}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

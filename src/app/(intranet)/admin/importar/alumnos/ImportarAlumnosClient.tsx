"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Upload, UploadCloud, FileText, RefreshCw, Info, AlertTriangle, AlertCircle,
  ChevronRight, Loader2, CheckCircle2, ArrowLeft, Database, UserPlus, UserMinus, HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  parseAlumnosCsv, calcularDiff, CsvFormatError, ETIQUETA_CAMPO,
  type AlumnoDbRow, type DiffImportacion,
} from "@/lib/import/alumnos";

interface Props {
  alumnos: AlumnoDbRow[];
  ultimaImportacion: string | null;
}

type Paso = 1 | 2 | 3;

const PASOS: { n: Paso; label: string }[] = [
  { n: 1, label: "Subir archivo" },
  { n: 2, label: "Actualizar" },
  { n: 3, label: "Nuevos" },
];

interface Resultado {
  actualizados: number;
  insertados: number;
  bajas: number;
  errores: string[];
}

function localDateISO(): string {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}

function formatFecha(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

async function leerTexto(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const head = new Uint8Array(buf.slice(0, 4));

  if (head[0] === 0xd0 && head[1] === 0xcf) {
    throw new CsvFormatError(
      "El fichero es un Excel binario (.xls). Ábrelo con Excel o LibreOffice y guárdalo como CSV (UTF-8, delimitador punto y coma) siguiendo los pasos de esta página."
    );
  }
  if (head[0] === 0x50 && head[1] === 0x4b) {
    throw new CsvFormatError(
      "El fichero es un Excel (.xlsx). Ábrelo con Excel o LibreOffice y guárdalo como CSV (UTF-8, delimitador punto y coma) siguiendo los pasos de esta página."
    );
  }

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    return new TextDecoder("windows-1252").decode(buf);
  }
}

export function ImportarAlumnosClient({ alumnos, ultimaImportacion }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [paso, setPaso] = useState<Paso>(1);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [diff, setDiff] = useState<DiffImportacion | null>(null);

  const [selActualizar, setSelActualizar] = useState<Set<string>>(new Set());
  const [selNuevos, setSelNuevos] = useState<Set<string>>(new Set());
  const [selBajas, setSelBajas] = useState<Set<string>>(new Set());

  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  async function handleFile(file: File) {
    setParseError(null);
    setFileName(file.name);
    try {
      const texto = await leerTexto(file);
      const filas = parseAlumnosCsv(texto);
      const d = calcularDiff(filas, alumnos);
      setDiff(d);
      setSelActualizar(new Set(d.actualizar.map((f) => f.id)));
      setSelNuevos(new Set(d.nuevos.map((f) => f.clave)));
      setSelBajas(new Set(d.bajas.map((f) => f.id)));
      setPaso(2);
    } catch (e) {
      setDiff(null);
      setParseError(
        e instanceof CsvFormatError ? e.message : "No se ha podido leer el fichero. Comprueba que es un CSV válido."
      );
    }
  }

  function toggle(set: Set<string>, key: string, apply: (s: Set<string>) => void) {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    apply(next);
  }

  async function handleApply() {
    if (!diff) return;
    setApplying(true);
    setApplyError(null);

    const actualizar = diff.actualizar
      .filter((f) => selActualizar.has(f.id))
      .map((f) => ({ id: f.id, patch: f.patch }));

    const nuevos = diff.nuevos
      .filter((f) => selNuevos.has(f.clave))
      .map((f) => ({ alumno: f.alumno, patch: f.patch }));

    const res = await fetch("/api/admin/importar/alumnos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actualizar, nuevos, bajas: [...selBajas] }),
    });

    const json = await res.json() as { success?: boolean; error?: string } & Resultado;

    if (!res.ok || !json.success) {
      setApplyError(json.error ?? "Error al aplicar la importación.");
      setApplying(false);
      return;
    }

    setResultado({
      actualizados: json.actualizados,
      insertados: json.insertados,
      bajas: json.bajas,
      errores: json.errores ?? [],
    });
    setApplying(false);
    router.refresh();
  }

  function reiniciar() {
    setPaso(1);
    setDiff(null);
    setFileName(null);
    setParseError(null);
    setResultado(null);
    setApplyError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ─── Resultado final ────────────────────────────────────────────────────────
  if (resultado) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <Cabecera />
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="bg-green-600 px-5 py-3 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-white" />
            <h2 className="text-white font-semibold text-sm">Importación completada</h2>
          </div>
          <div className="px-5 py-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Stat label="ACTUALIZADOS" valor={String(resultado.actualizados)} icono={<RefreshCw size={18} className="text-blue-600" />} />
              <Stat label="NUEVOS" valor={String(resultado.insertados)} icono={<UserPlus size={18} className="text-green-600" />} />
              <Stat label="BAJAS" valor={String(resultado.bajas)} icono={<UserMinus size={18} className="text-amber-600" />} />
            </div>

            {resultado.errores.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 space-y-1">
                <p className="text-sm font-semibold text-red-700 flex items-center gap-1.5">
                  <AlertCircle size={14} /> Algunas filas no se pudieron aplicar
                </p>
                {resultado.errores.map((e, i) => (
                  <p key={i} className="text-xs text-red-600">{e}</p>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={reiniciar}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <Upload size={14} /> Importar otro fichero
              </button>
              <Link
                href="/admin/importar/alumnos/consultar"
                className="flex items-center gap-1.5 border border-gray-300 text-gray-600 text-sm font-medium px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Database size={14} /> Consultar listado
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <Cabecera />

      {/* Stepper */}
      <div className="flex items-center gap-1 flex-wrap">
        {PASOS.map((p, i) => (
          <div key={p.n} className="flex items-center gap-1">
            <button
              onClick={() => { if (diff && p.n < paso) setPaso(p.n); }}
              disabled={!diff || p.n > paso}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors",
                paso === p.n
                  ? "bg-blue-600 text-white"
                  : p.n < paso
                    ? "bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer"
                    : "bg-gray-100 text-gray-400"
              )}
            >
              <span className={cn(
                "w-4 h-4 rounded-full flex items-center justify-center text-[10px]",
                paso === p.n ? "bg-white/25" : p.n < paso ? "bg-blue-200 text-blue-700" : "bg-gray-200 text-gray-500"
              )}>
                {p.n}
              </span>
              {p.label}
            </button>
            {i < PASOS.length - 1 && <ChevronRight size={14} className="text-gray-300" />}
          </div>
        ))}
      </div>

      {/* ── Paso 1: subir archivo ── */}
      {paso === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Stat
              label="ALUMNOS REGISTRADOS"
              valor={String(alumnos.length)}
              icono={<FileText size={18} className="text-blue-600" />}
            />
            <Stat
              label="ÚLTIMA IMPORTACIÓN"
              valor={ultimaImportacion ? formatFecha(ultimaImportacion) : "Nunca"}
              icono={<RefreshCw size={18} className="text-blue-600" />}
            />
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
              <Info size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">
                Sube el CSV exportado de Séneca (Alumnado del Centro). Se usan <strong>Alumno/a</strong>,{" "}
                <strong>Nº Id. Escolar</strong>, <strong>Estado Matrícula</strong>, <strong>Unidad</strong>, nombre y
                apellidos, sexo, los datos de contacto de los tutores, y fecha/edad de matrícula. El resto de columnas
                (dirección, salud, custodia, familia numerosa…) se ignoran porque la aplicación no las necesita.
              </p>
            </div>

            {parseError && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                <AlertCircle size={15} className="flex-shrink-0 mt-0.5" /> {parseError}
              </div>
            )}

            <label
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const f = e.dataTransfer.files?.[0];
                if (f) handleFile(f);
              }}
              className={cn(
                "flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl py-14 px-6 cursor-pointer transition-colors",
                dragging ? "border-blue-400 bg-blue-50/50" : "border-gray-200 hover:border-blue-300 hover:bg-gray-50/50"
              )}
            >
              <UploadCloud size={36} className="text-gray-300" />
              <p className="text-sm font-semibold text-gray-700">
                Arrastra el CSV aquí o haz clic para seleccionar
              </p>
              <p className="text-xs text-gray-400">Formato CSV separado por punto y coma o coma</p>
              {fileName && <p className="text-xs text-blue-600 font-medium mt-1">{fileName}</p>}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <InfoCard
              icono={<Info size={16} className="text-blue-500" />}
              titulo="Cómo obtener el fichero CSV"
              items={[
                "Desde Séneca ir a Alumnado → Listados → Alumnado del Centro.",
                'Exportar datos como "Hoja Microsoft Excel".',
                "Abre el archivo con LibreOffice o Microsoft Excel.",
                "Guárdalo como CSV con codificación Unicode (UTF-8) y delimitador de campo punto y coma (;).",
                "Sube el archivo CSV a la aplicación.",
              ]}
            />
            <InfoCard
              icono={<AlertTriangle size={16} className="text-amber-500" />}
              titulo="Qué hace el sistema"
              items={[
                "Identifica a cada alumno/a por su Nº Id. Escolar y, si aún no lo tiene, por nombre.",
                "Actualiza unidad, tutores, sexo, edad y fecha de matrícula de los ya existentes.",
                "Si un alumno aparece varias veces, se queda con la matrícula más reciente.",
                "Da de alta a los alumnos nuevos.",
                "Marca como baja a los que ya no aparecen en el fichero.",
                "Nunca borra un alumno: los datos de préstamos e incidencias de gratuidad de libros quedan intactos.",
              ]}
            />
          </div>
        </div>
      )}

      {/* ── Paso 2: actualizar + bajas ── */}
      {paso === 2 && diff && (
        <div className="space-y-4">
          <Resumen diff={diff} />

          {diff.ambiguos.length > 0 && (
            <Panel
              color="bg-purple-600"
              icono={<HelpCircle size={16} className="text-white" />}
              titulo={`Sin identificar de forma segura (${diff.ambiguos.length})`}
            >
              <div className="flex items-start gap-2 bg-purple-50 border border-purple-200 rounded-lg px-4 py-3 mb-2">
                <AlertTriangle size={15} className="text-purple-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-purple-800">
                  Hay más de un alumno activo con este nombre y ninguno tiene todavía Nº Id. Escolar asignado, así que
                  no se puede saber a cuál corresponde esta fila. No se aplicará ningún cambio para ellos en esta
                  importación — añade el NIE en Séneca y vuelve a importar para resolverlo.
                </p>
              </div>
              <div className="divide-y divide-gray-50">
                {diff.ambiguos.map((f) => (
                  <div key={f.clave} className="py-2.5">
                    <p className="text-sm font-medium text-gray-900">{f.alumno}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{f.motivo}</p>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          <Panel
            color="bg-blue-600"
            icono={<RefreshCw size={16} className="text-white" />}
            titulo={`Alumnos a actualizar (${selActualizar.size} de ${diff.actualizar.length})`}
          >
            {diff.actualizar.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No hay cambios sobre alumnos existentes.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {diff.actualizar.map((f) => (
                  <label key={f.id} className="flex items-start gap-3 py-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selActualizar.has(f.id)}
                      onChange={() => toggle(selActualizar, f.id, setSelActualizar)}
                      className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">{f.alumno}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {f.cambios.map((c) => (
                          <span key={c.campo} className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {ETIQUETA_CAMPO[c.campo]}:{" "}
                            <span className="text-gray-400 line-through">{c.antes ?? "vacío"}</span>
                            {" → "}
                            <span className="text-gray-800 font-medium">{c.despues ?? "vacío"}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </Panel>

          <Panel
            color="bg-amber-500"
            icono={<UserMinus size={16} className="text-white" />}
            titulo={`Bajas: ya no aparecen en el fichero (${selBajas.size} de ${diff.bajas.length})`}
          >
            {diff.bajas.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">Todos los alumnos activos aparecen en el fichero.</p>
            ) : (
              <>
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-2">
                  <AlertTriangle size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800">
                    Estos alumnos están activos en la intranet pero no vienen en el fichero. Se marcarán como baja y
                    dejarán de aparecer en los desplegables de gratuidad de libros. Desmarca los que quieras mantener
                    activos.
                  </p>
                </div>
                <div className="divide-y divide-gray-50">
                  {diff.bajas.map((f) => (
                    <label key={f.id} className="flex items-center gap-3 py-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selBajas.has(f.id)}
                        onChange={() => toggle(selBajas, f.id, setSelBajas)}
                        className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">{f.alumno}</p>
                        <p className="text-xs text-gray-400">{f.unidad || "sin unidad"}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </>
            )}
          </Panel>

          <Navegacion onBack={reiniciar} backLabel="Cambiar fichero" onNext={() => setPaso(3)} />
        </div>
      )}

      {/* ── Paso 3: nuevos + aplicar ── */}
      {paso === 3 && diff && (
        <div className="space-y-4">
          <Panel
            color="bg-green-600"
            icono={<UserPlus size={16} className="text-white" />}
            titulo={`Alumnos nuevos (${selNuevos.size} de ${diff.nuevos.length})`}
          >
            {diff.nuevos.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No hay alumnos nuevos en el fichero.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {diff.nuevos.map((f) => (
                  <label key={f.clave} className="flex items-start gap-3 py-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selNuevos.has(f.clave)}
                      onChange={() => toggle(selNuevos, f.clave, setSelNuevos)}
                      className="mt-1 w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">{f.alumno}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1 text-[11px] text-gray-500">
                        {f.unidad ? (
                          <span className="bg-gray-100 px-2 py-0.5 rounded-full">{f.unidad}</span>
                        ) : (
                          <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">sin unidad</span>
                        )}
                        {f.nie && <span className="bg-gray-100 px-2 py-0.5 rounded-full">NIE: {f.nie}</span>}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </Panel>

          <Panel color="bg-gray-700" icono={<CheckCircle2 size={16} className="text-white" />} titulo="Resumen de la importación">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-1">
              <Stat label="A ACTUALIZAR" valor={String(selActualizar.size)} icono={<RefreshCw size={18} className="text-blue-600" />} />
              <Stat label="NUEVOS" valor={String(selNuevos.size)} icono={<UserPlus size={18} className="text-green-600" />} />
              <Stat label="BAJAS" valor={String(selBajas.size)} icono={<UserMinus size={18} className="text-amber-600" />} />
            </div>
          </Panel>

          {applyError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" /> {applyError}
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => setPaso(2)}
              className="flex items-center gap-1.5 border border-gray-300 text-gray-600 text-sm font-medium px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft size={14} /> Atrás
            </button>
            <button
              onClick={handleApply}
              disabled={applying}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
            >
              {applying ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
              Aplicar importación
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Piezas de UI ─────────────────────────────────────────────────────────────

function Cabecera() {
  return (
    <div className="space-y-1">
      <Link href="/admin/importar" className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors">
        <ArrowLeft size={13} /> Importar Datos
      </Link>
      <h1 className="text-xl font-bold text-gray-900">Importar Alumnos</h1>
      <p className="text-sm text-gray-500">
        Actualiza el listado de alumnado del centro a partir del fichero exportado de Séneca.
      </p>
    </div>
  );
}

function Stat({ label, valor, icono }: { label: string; valor: string; icono: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 px-5 py-4 flex items-center gap-3">
      <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">{icono}</div>
      <div className="min-w-0">
        <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">{label}</p>
        <p className="text-xl font-bold text-gray-900 leading-tight">{valor}</p>
      </div>
    </div>
  );
}

function Panel({ color, icono, titulo, children }: {
  color: string; icono: React.ReactNode; titulo: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className={`${color} px-5 py-3 flex items-center gap-2`}>
        {icono}
        <h2 className="text-white font-semibold text-sm">{titulo}</h2>
      </div>
      <div className="px-5 py-3">{children}</div>
    </div>
  );
}

function InfoCard({ icono, titulo, items }: { icono: React.ReactNode; titulo: string; items: string[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-3">
        {icono}
        <p className="font-semibold text-gray-900 text-sm">{titulo}</p>
      </div>
      <ol className="space-y-1.5">
        {items.map((t, i) => (
          <li key={i} className="text-xs text-gray-500 leading-relaxed">
            <span className="text-gray-400 font-medium">{i + 1}.-</span> {t}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Resumen({ diff }: { diff: DiffImportacion }) {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-gray-500 bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
      <span><strong className="text-gray-700">{diff.totalCsv}</strong> alumnos en el fichero</span>
      <span><strong className="text-gray-700">{diff.actualizar.length}</strong> con cambios</span>
      <span><strong className="text-gray-700">{diff.nuevos.length}</strong> nuevos</span>
      <span><strong className="text-gray-700">{diff.bajas.length}</strong> posibles bajas</span>
      <span><strong className="text-gray-700">{diff.sinCambios}</strong> sin cambios</span>
      {diff.ambiguos.length > 0 && (
        <span><strong className="text-purple-700">{diff.ambiguos.length}</strong> sin identificar</span>
      )}
    </div>
  );
}

function Navegacion({ onBack, onNext, backLabel = "Atrás" }: {
  onBack: () => void; onNext: () => void; backLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 border border-gray-300 text-gray-600 text-sm font-medium px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <ArrowLeft size={14} /> {backLabel}
      </button>
      <button
        onClick={onNext}
        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        Siguiente <ChevronRight size={14} />
      </button>
    </div>
  );
}

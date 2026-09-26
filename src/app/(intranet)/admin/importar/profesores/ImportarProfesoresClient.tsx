"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Upload, UploadCloud, FileText, RefreshCw, Info, AlertTriangle, AlertCircle,
  ChevronRight, Loader2, CheckCircle2, ArrowLeft, Database, UserPlus, UserMinus, Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  parseProfesoresCsv, calcularDiff, CsvFormatError, ETIQUETA_CAMPO,
  type ProfesorDbRow, type DiffImportacion, type CampoImportable,
} from "@/lib/import/profesores";
import { todayMadrid } from "@/lib/dates";

interface Props {
  profesores: ProfesorDbRow[];
  ultimaImportacion: string | null;
}

type Paso = 1 | 2 | 3 | 4;

const PASOS: { n: Paso; label: string }[] = [
  { n: 1, label: "Subir archivo" },
  { n: 2, label: "Actualizar" },
  { n: 3, label: "Nuevos" },
  { n: 4, label: "Emails" },
];

interface Resultado {
  actualizados: number;
  insertados: number;
  bajas: number;
  errores: string[];
}

function formatFecha(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

function valorLegible(campo: CampoImportable, valor: string | null): string {
  if (valor === null || valor === "") return "vacío";
  return campo === "fecha_alta" || campo === "fecha_cese" ? formatFecha(valor) : valor;
}

async function leerTexto(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const head = new Uint8Array(buf.slice(0, 4));

  // Binary .xls (OLE) / .xlsx (ZIP) — the export must be saved as CSV first.
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
    // Excel on Windows often saves as Windows-1252 instead of UTF-8.
    return new TextDecoder("windows-1252").decode(buf);
  }
}

export function ImportarProfesoresClient({ profesores, ultimaImportacion }: Props) {
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
  const [emails, setEmails] = useState<Record<string, string>>({});

  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  async function handleFile(file: File) {
    setParseError(null);
    setFileName(file.name);
    try {
      const texto = await leerTexto(file);
      const filas = parseProfesoresCsv(texto);
      const d = calcularDiff(filas, profesores, todayMadrid());
      setDiff(d);
      setSelActualizar(new Set(d.actualizar.map((f) => f.id)));
      setSelNuevos(new Set(d.nuevos.map((f) => f.clave)));
      setSelBajas(new Set(d.bajas.map((f) => f.id)));
      setEmails({});
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

  // The Séneca account is not the intranet login, so every new professor needs one typed by hand.
  // Los cesados/inactivos no necesitan acceso a la intranet, así que no se piden aquí.
  const hoy = todayMadrid();
  const esActivo = (p: ProfesorDbRow) => p.fecha_cese === null || p.fecha_cese > hoy;
  const faltanEmail = diff
    ? [
        ...diff.nuevos
          .filter((n) => selNuevos.has(n.clave))
          .map((n) => ({ clave: `nuevo:${n.clave}`, profesor: n.profesor, puesto: n.puesto, nuevo: true })),
        ...profesores
          .filter((p) => !p.email && !selBajas.has(p.id) && esActivo(p))
          .map((p) => ({ clave: `id:${p.id}`, profesor: p.profesor, puesto: p.puesto, nuevo: false })),
      ]
    : [];

  // Typed emails must be well formed and must not collide with an existing one:
  // the unique index on lower(email) would reject the write.
  const erroresEmail: Record<string, string> = {};
  {
    const porEmailDb = new Map<string, ProfesorDbRow>();
    for (const p of profesores) if (p.email) porEmailDb.set(p.email.toLowerCase(), p);

    const vistos = new Map<string, string>();
    for (const [clave, valor] of Object.entries(emails)) {
      const v = valor.trim().toLowerCase();
      if (!v) continue;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
        erroresEmail[clave] = "Formato de email no válido";
        continue;
      }
      const propioId = clave.startsWith("id:") ? clave.slice(3) : null;
      const dueno = porEmailDb.get(v);
      if (dueno && dueno.id !== propioId) {
        erroresEmail[clave] = `Ese email ya lo tiene ${dueno.profesor}`;
        continue;
      }
      const previo = vistos.get(v);
      if (previo !== undefined && previo !== clave) {
        erroresEmail[clave] = "Email repetido en esta importación";
        continue;
      }
      vistos.set(v, clave);
    }
  }
  const hayErroresEmail = Object.keys(erroresEmail).length > 0;

  async function handleApply() {
    if (!diff) return;
    setApplying(true);
    setApplyError(null);

    const actualizar = diff.actualizar
      .filter((f) => selActualizar.has(f.id))
      .map((f) => ({ id: f.id, patch: { ...f.patch } }));

    // Merge manually typed emails for existing professors
    for (const [clave, valor] of Object.entries(emails)) {
      const email = valor.trim().toLowerCase();
      if (!email || !clave.startsWith("id:")) continue;
      const id = clave.slice(3);
      const existente = actualizar.find((a) => a.id === id);
      if (existente) existente.patch.email = email;
      else actualizar.push({ id, patch: { email } });
    }

    const nuevos = diff.nuevos
      .filter((f) => selNuevos.has(f.clave))
      .map((f) => ({
        profesor: f.profesor,
        puesto: f.puesto,
        dni: f.dni,
        email: emails[`nuevo:${f.clave}`]?.trim().toLowerCase() || null,
        fecha_alta: f.fecha_alta,
        fecha_cese: f.fecha_cese,
      }));

    const res = await fetch("/api/admin/importar/profesores", {
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
                href="/admin/importar/profesores/consultar"
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
              label="PROFESORES REGISTRADOS"
              valor={String(profesores.length)}
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
                Sube el CSV exportado de Séneca. Se usarán las columnas <strong>Empleado/a</strong>,{" "}
                <strong>DNI/Pasaporte</strong>, <strong>Puesto</strong>, <strong>Fecha de toma de posesión</strong> y{" "}
                <strong>Fecha de cese</strong>. El resto se ignoran, incluida <strong>Cuenta Google/Microsoft</strong>:
                esa no es la cuenta de acceso a la intranet, los emails se asignan a mano en el paso 4.
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
                "Desde Séneca ir a Personal → Personal del Centro.",
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
                "Identifica a cada profesor por DNI y, si no lo tiene aún, por nombre.",
                "Actualiza puesto, DNI, fecha de alta y fecha de cese de los ya existentes.",
                "Si un profesor aparece varias veces, se queda con el contrato más reciente.",
                "Da de alta a los profesores nuevos.",
                "Marca la fecha de cese de los que ya no aparecen en el fichero.",
                "Pide a mano el email de acceso de los profesores que no lo tengan.",
                "Nunca modifica el email de un profesor ya registrado.",
              ]}
            />
          </div>
        </div>
      )}

      {/* ── Paso 2: actualizar + bajas ── */}
      {paso === 2 && diff && (
        <div className="space-y-4">
          <Resumen diff={diff} />

          <Panel
            color="bg-blue-600"
            icono={<RefreshCw size={16} className="text-white" />}
            titulo={`Profesores a actualizar (${selActualizar.size} de ${diff.actualizar.length})`}
          >
            {diff.actualizar.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No hay cambios sobre profesores existentes.</p>
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
                      <p className="text-sm font-medium text-gray-900">{f.profesor}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {f.cambios.map((c) => (
                          <span key={c.campo} className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {ETIQUETA_CAMPO[c.campo]}:{" "}
                            <span className="text-gray-400 line-through">{valorLegible(c.campo, c.antes)}</span>
                            {" → "}
                            <span className="text-gray-800 font-medium">{valorLegible(c.campo, c.despues)}</span>
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
              <p className="text-sm text-gray-400 py-4 text-center">Todos los profesores activos aparecen en el fichero.</p>
            ) : (
              <>
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-2">
                  <AlertTriangle size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800">
                    Estos profesores están activos en la intranet pero no vienen en el fichero. Se les asignará la fecha
                    de cese de hoy y dejarán de aparecer en los desplegables. Desmarca los que quieras mantener activos.
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
                        <p className="text-sm font-medium text-gray-900">{f.profesor}</p>
                        <p className="text-xs text-gray-400">{f.puesto}</p>
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

      {/* ── Paso 3: nuevos ── */}
      {paso === 3 && diff && (
        <div className="space-y-4">
          <Panel
            color="bg-green-600"
            icono={<UserPlus size={16} className="text-white" />}
            titulo={`Profesores nuevos (${selNuevos.size} de ${diff.nuevos.length})`}
          >
            {diff.nuevos.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No hay profesores nuevos en el fichero.</p>
            ) : (
              <>
                <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 mb-2">
                  <Info size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800">
                    Los que selecciones aquí se darán de alta. En el paso siguiente tendrás que asignarles a mano su
                    email de acceso a la intranet.
                  </p>
                </div>
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
                        <p className="text-sm font-medium text-gray-900">{f.profesor}</p>
                        <p className="text-xs text-gray-500">{f.puesto}</p>
                        <div className="flex flex-wrap gap-1.5 mt-1 text-[11px] text-gray-500">
                          <span className="bg-gray-100 px-2 py-0.5 rounded-full">Alta: {formatFecha(f.fecha_alta)}</span>
                          {f.fecha_cese && (
                            <span className="bg-gray-100 px-2 py-0.5 rounded-full">Cese: {formatFecha(f.fecha_cese)}</span>
                          )}
                          {f.dni && <span className="bg-gray-100 px-2 py-0.5 rounded-full">DNI: {f.dni}</span>}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </>
            )}
          </Panel>

          <Navegacion onBack={() => setPaso(2)} onNext={() => setPaso(4)} />
        </div>
      )}

      {/* ── Paso 4: emails ── */}
      {paso === 4 && diff && (
        <div className="space-y-4">
          <Panel
            color="bg-indigo-600"
            icono={<Mail size={16} className="text-white" />}
            titulo={`Profesores sin email (${faltanEmail.length})`}
          >
            {faltanEmail.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">Todos los profesores tienen email asignado.</p>
            ) : (
              <>
                <div className="flex items-start gap-2 bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3 mb-2">
                  <Info size={15} className="text-indigo-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-indigo-800">
                    El email es lo que vincula a cada profesor con su cuenta de acceso a la intranet. No se puede
                    importar de Séneca, hay que escribirlo aquí. Sin él, esa persona no podrá registrar ausencias ni
                    gestionar sus citas. Puedes dejarlo en blanco y asignarlo en una importación posterior.
                  </p>
                </div>
                <div className="divide-y divide-gray-50">
                  {faltanEmail.map((f) => (
                    <div key={f.clave} className="flex flex-col sm:flex-row sm:items-start gap-2 py-2.5">
                      <div className="min-w-0 sm:flex-1 sm:pt-2">
                        <p className="text-sm font-medium text-gray-900">
                          {f.profesor}
                          {f.nuevo && (
                            <span className="ml-2 text-[11px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                              nuevo
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400">{f.puesto}</p>
                      </div>
                      <div className="w-full sm:w-72">
                        <input
                          type="email"
                          value={emails[f.clave] ?? ""}
                          onChange={(e) => setEmails((prev) => ({ ...prev, [f.clave]: e.target.value }))}
                          placeholder="nombre@iesjulioverne.es"
                          className={cn(
                            "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2",
                            erroresEmail[f.clave]
                              ? "border-red-300 focus:ring-red-500"
                              : "border-gray-200 focus:ring-blue-500"
                          )}
                        />
                        {erroresEmail[f.clave] && (
                          <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                            <AlertCircle size={12} /> {erroresEmail[f.clave]}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
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
              onClick={() => setPaso(3)}
              className="flex items-center gap-1.5 border border-gray-300 text-gray-600 text-sm font-medium px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft size={14} /> Atrás
            </button>
            <button
              onClick={handleApply}
              disabled={applying || hayErroresEmail}
              title={hayErroresEmail ? "Corrige los emails marcados en rojo" : undefined}
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
      <h1 className="text-xl font-bold text-gray-900">Importar Profesores</h1>
      <p className="text-sm text-gray-500">
        Actualiza el listado de profesorado del centro a partir del fichero exportado de Séneca.
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
      <span><strong className="text-gray-700">{diff.totalCsv}</strong> profesores en el fichero</span>
      <span><strong className="text-gray-700">{diff.actualizar.length}</strong> con cambios</span>
      <span><strong className="text-gray-700">{diff.nuevos.length}</strong> nuevos</span>
      <span><strong className="text-gray-700">{diff.bajas.length}</strong> posibles bajas</span>
      <span><strong className="text-gray-700">{diff.sinCambios}</strong> sin cambios</span>
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

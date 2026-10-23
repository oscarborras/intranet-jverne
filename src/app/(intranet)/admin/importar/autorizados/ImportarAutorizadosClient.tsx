"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Upload, UploadCloud, FileText, RefreshCw, Info, AlertTriangle, AlertCircle,
  Loader2, CheckCircle2, ArrowLeft, Database, UserCheck, HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CsvFormatError, leerTextoCsv } from "@/lib/import/alumnos";
import {
  parseAutorizadosCsv, emparejarAutorizados,
  type AlumnoParaEmparejar, type ResultadoEmparejamiento,
} from "@/lib/import/autorizados";

interface Props {
  alumnos: AlumnoParaEmparejar[];
  totalActual: number;
  manualesActual: number;
  ultimaImportacion: string | null;
}

function formatFecha(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

export function ImportarAutorizadosClient({ alumnos, totalActual, manualesActual, ultimaImportacion }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [resultado, setResultado] = useState<ResultadoEmparejamiento | null>(null);

  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [insertados, setInsertados] = useState<number | null>(null);

  async function handleFile(file: File) {
    setParseError(null);
    setFileName(file.name);
    try {
      const texto = await leerTextoCsv(file);
      const filas = parseAutorizadosCsv(texto);
      setResultado(emparejarAutorizados(filas, alumnos));
    } catch (e) {
      setResultado(null);
      setParseError(
        e instanceof CsvFormatError ? e.message : "No se ha podido leer el fichero. Comprueba que es un CSV válido."
      );
    }
  }

  async function handleApply() {
    if (!resultado) return;
    setApplying(true);
    setApplyError(null);

    const autorizados = resultado.autorizados.map(({ alumno_id, nombre, dni, telefono, usuario_alta, fecha_alta }) => ({
      alumno_id, nombre, dni, telefono, usuario_alta, fecha_alta,
    }));

    const res = await fetch("/api/admin/importar/autorizados", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ autorizados }),
    });
    const json = await res.json().catch(() => ({})) as { success?: boolean; error?: string; insertados?: number };

    if (!res.ok || !json.success) {
      setApplyError(json.error ?? "Error al aplicar la importación.");
      setApplying(false);
      return;
    }

    setInsertados(json.insertados ?? autorizados.length);
    setApplying(false);
    router.refresh();
  }

  function reiniciar() {
    setResultado(null);
    setFileName(null);
    setParseError(null);
    setInsertados(null);
    setApplyError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ─── Resultado final ────────────────────────────────────────────────────────
  if (insertados !== null) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <Cabecera />
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="bg-green-600 px-5 py-3 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-white" />
            <h2 className="text-white font-semibold text-sm">Importación completada</h2>
          </div>
          <div className="px-5 py-5 space-y-4">
            <Stat label="PERSONAS AUTORIZADAS IMPORTADAS" valor={String(insertados)} icono={<UserCheck size={18} className="text-green-600" />} />
            <div className="flex flex-wrap gap-2">
              <button
                onClick={reiniciar}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <Upload size={14} /> Importar otro fichero
              </button>
              <Link
                href="/alumnado"
                className="flex items-center gap-1.5 border border-gray-300 text-gray-600 text-sm font-medium px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Database size={14} /> Consultar en Alumnado
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

      {/* ── Subir archivo ── */}
      {!resultado && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Stat
              label="AUTORIZADOS REGISTRADOS"
              valor={String(totalActual)}
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
                Sube el CSV exportado de Séneca con las personas autorizadas a recoger al alumnado. Se usan las
                columnas <strong>Alumno/a</strong>, <strong>Persona autorizada</strong>, <strong>DNI/NIE</strong>,{" "}
                <strong>Teléfono</strong>, <strong>Usuario alta</strong> y <strong>Fecha alta</strong>.
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
              <p className="text-sm font-semibold text-gray-700 text-center">
                Arrastra el CSV aquí o haz clic para seleccionar
              </p>
              <p className="text-xs text-gray-400">Formato CSV separado por coma o punto y coma</p>
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
                "Desde Séneca, abrir el listado de personas autorizadas a recoger al alumnado (RegPerAutRecAlu).",
                'Exportar datos como "Fichero CSV".',
                "Sube el archivo CSV a la aplicación.",
              ]}
            />
            <InfoCard
              icono={<AlertTriangle size={16} className="text-amber-500" />}
              titulo="Qué hace el sistema"
              items={[
                "Identifica a cada alumno/a por su nombre y, si hay varios iguales, por su edad.",
                "Importa antes el alumnado: los alumnos que no existan en la intranet se omiten.",
                "Sustituye por completo la lista actual de autorizados, incluidos los añadidos a mano.",
              ]}
            />
          </div>
        </div>
      )}

      {/* ── Vista previa ── */}
      {resultado && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Stat label="AUTORIZADOS A IMPORTAR" valor={String(resultado.autorizados.length)} icono={<UserCheck size={18} className="text-green-600" />} />
            <Stat label="ALUMNOS CON AUTORIZADOS" valor={String(resultado.alumnosConAutorizados)} icono={<FileText size={18} className="text-blue-600" />} />
            <Stat label="ALUMNOS NO ENCONTRADOS" valor={String(resultado.noEmparejados.length)} icono={<HelpCircle size={18} className="text-purple-600" />} />
          </div>

          {totalActual > 0 && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <AlertTriangle size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                Se eliminarán los <strong>{totalActual}</strong> autorizados registrados actualmente
                {manualesActual > 0 && (
                  <>, incluidos <strong>{manualesActual}</strong> añadidos a mano</>
                )}
                , y se sustituirán por los del fichero.
              </p>
            </div>
          )}

          {resultado.noEmparejados.length > 0 && (
            <Panel
              color="bg-purple-600"
              icono={<HelpCircle size={16} className="text-white" />}
              titulo={`Alumnos no encontrados (${resultado.noEmparejados.length})`}
            >
              <p className="text-sm text-purple-800 bg-purple-50 border border-purple-200 rounded-lg px-4 py-3 mb-2">
                Sus autorizados no se importarán. Si son alumnos nuevos, importa primero el alumnado y vuelve a subir
                este fichero.
              </p>
              <div className="divide-y divide-gray-50">
                {resultado.noEmparejados.map((f) => (
                  <div key={`${f.alumno}|${f.edad ?? ""}`} className="py-2.5">
                    <p className="text-sm font-medium text-gray-900">
                      {f.alumno}
                      {f.edad && <span className="text-gray-400 font-normal"> ({f.edad} años)</span>}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {f.autorizados} {f.autorizados === 1 ? "autorizado" : "autorizados"} · {f.motivo}
                    </p>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {applyError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" /> {applyError}
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <button
              onClick={reiniciar}
              className="flex items-center gap-1.5 border border-gray-300 text-gray-600 text-sm font-medium px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft size={14} /> Cambiar fichero
            </button>
            <button
              onClick={handleApply}
              disabled={applying || resultado.autorizados.length === 0}
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
      <h1 className="text-xl font-bold text-gray-900">Importar Personas Autorizadas</h1>
      <p className="text-sm text-gray-500">
        Carga las personas autorizadas a recoger al alumnado a partir del fichero exportado de Séneca.
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

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Printer, FileDown, Loader2, Settings2, Tags, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  buildEtiquetasHtml, descargarZpl, imprimirEtiquetas, paginasNecesarias, PREVIEW_PADDING_MM,
  type EtiquetaDatos, type OpcionesEtiquetas,
} from "@/lib/gratuidadV2/etiquetas";
import type { CamposEtiqueta, PlantillaEtiqueta, SituacionV2 } from "@/lib/types/gratuidadV2";
import { PlantillasModal } from "./PlantillasModal";

export interface TituloEtiqueta {
  id: string;
  titulo: string;
  /** Lot summary printed on the label */
  curso: string;
}

interface Props {
  plantillas: PlantillaEtiqueta[];
  titulos: TituloEtiqueta[];
  cursoEscolar: string;
  inicial: { titulo: string; desde: string; hasta: string; codigos: string };
}

type Modo = "titulo" | "codigos";

const CAMPOS_LABEL: Record<keyof CamposEtiqueta, string> = {
  centro: "Nombre del centro",
  titulo: "Título del libro",
  curso: "Curso",
  curso_escolar: "Curso escolar",
};

const MM_TO_PX = 96 / 25.4;
const PREVIEW_ZEBRA_MAX = 6;

function parseCodigos(texto: string): string[] {
  return [...new Set(texto.split(/[\s,;]+/).map((c) => c.trim().toUpperCase()).filter(Boolean))];
}

function plantillaInicial(plantillas: PlantillaEtiqueta[]): PlantillaEtiqueta | undefined {
  return plantillas.find((p) => p.tipo === "a4" && p.predeterminada) ?? plantillas[0];
}

export function EtiquetasClient({ plantillas: initialPlantillas, titulos, cursoEscolar, inicial }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const titulosById = useMemo(() => new Map(titulos.map((t) => [t.id, t])), [titulos]);

  // Source of the labels
  const [modo, setModo] = useState<Modo>(inicial.codigos ? "codigos" : "titulo");
  const [tituloId, setTituloId] = useState(inicial.titulo);
  const [desde, setDesde] = useState(inicial.desde);
  const [hasta, setHasta] = useState(inicial.hasta);
  const [soloEnCentro, setSoloEnCentro] = useState(false);
  const [codigosTexto, setCodigosTexto] = useState(inicial.codigos.split(",").join("\n"));

  const [etiquetas, setEtiquetas] = useState<EtiquetaDatos[]>([]);
  const [noEncontrados, setNoEncontrados] = useState<string[]>([]);
  const [cargando, setCargando] = useState(false);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  // Print options
  const [plantillas, setPlantillas] = useState<PlantillaEtiqueta[]>(initialPlantillas);
  const [plantillaId, setPlantillaId] = useState(plantillaInicial(initialPlantillas)?.id ?? "");
  const plantilla = plantillas.find((p) => p.id === plantillaId);
  const [campos, setCampos] = useState<CamposEtiqueta>(
    plantillaInicial(initialPlantillas)?.campos ?? { centro: true, titulo: true, curso: true, curso_escolar: false },
  );
  const [posicionInicial, setPosicionInicial] = useState(1);
  const [bordes, setBordes] = useState(false);
  const [dpi, setDpi] = useState<203 | 300>(203);
  const [showPlantillas, setShowPlantillas] = useState(false);
  const [avisoPopup, setAvisoPopup] = useState(false);

  const opciones: OpcionesEtiquetas = useMemo(
    () => ({ campos, cursoEscolar, posicionInicial, bordes }),
    [campos, cursoEscolar, posicionInicial, bordes],
  );

  function elegirPlantilla(id: string) {
    const p = plantillas.find((x) => x.id === id);
    setPlantillaId(id);
    setPosicionInicial(1);
    if (p) setCampos(p.campos);
  }

  // ── Load copies ─────────────────────────────────────────────────────────────

  const aEtiqueta = useCallback((r: { codigo: string; titulo_id: string }): EtiquetaDatos => {
    const t = titulosById.get(r.titulo_id);
    return { codigo: r.codigo, titulo: t?.titulo ?? "", curso: t?.curso ?? "" };
  }, [titulosById]);

  const cargarPorTitulo = useCallback(async (id: string, d: string, h: string, enCentro: boolean) => {
    if (!id) { setEtiquetas([]); return; }
    setCargando(true);
    setErrorCarga(null);
    setNoEncontrados([]);
    const out: EtiquetaDatos[] = [];
    for (let from = 0; ; from += 1000) {
      let q = supabase.from("gplv2_ejemplares").select("codigo, titulo_id").eq("titulo_id", id).neq("situacion", "baja");
      if (enCentro) q = q.eq("situacion", "en_centro" satisfies SituacionV2);
      if (d.trim()) q = q.gte("codigo", d.trim().toUpperCase());
      if (h.trim()) q = q.lte("codigo", h.trim().toUpperCase());
      const { data, error } = await q.order("codigo").range(from, from + 999);
      if (error) { setErrorCarga(error.message); break; }
      out.push(...(data ?? []).map(aEtiqueta));
      if (!data || data.length < 1000) break;
    }
    setEtiquetas(out);
    setCargando(false);
  }, [supabase, aEtiqueta]);

  const cargarPorCodigos = useCallback(async (texto: string) => {
    const codigos = parseCodigos(texto);
    if (codigos.length === 0) { setEtiquetas([]); setNoEncontrados([]); return; }
    setCargando(true);
    setErrorCarga(null);
    const encontrados = new Map<string, EtiquetaDatos>();
    for (let i = 0; i < codigos.length; i += 200) {
      const { data, error } = await supabase.from("gplv2_ejemplares").select("codigo, titulo_id").in("codigo", codigos.slice(i, i + 200));
      if (error) { setErrorCarga(error.message); break; }
      (data ?? []).forEach((r) => encontrados.set(r.codigo, aEtiqueta(r)));
    }
    // Keep the order in which the codes were typed / scanned
    setEtiquetas(codigos.filter((c) => encontrados.has(c)).map((c) => encontrados.get(c) as EtiquetaDatos));
    setNoEncontrados(codigos.filter((c) => !encontrados.has(c)));
    setCargando(false);
  }, [supabase, aEtiqueta]);

  // Initial load when arriving with query params (from Títulos or Ejemplares)
  const initDone = useRef(false);
  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;
    if (inicial.codigos) cargarPorCodigos(inicial.codigos.split(",").join("\n"));
    else if (inicial.titulo) cargarPorTitulo(inicial.titulo, inicial.desde, inicial.hasta, false);
  }, [inicial, cargarPorCodigos, cargarPorTitulo]);

  function cargar() {
    if (modo === "titulo") cargarPorTitulo(tituloId, desde, hasta, soloEnCentro);
    else cargarPorCodigos(codigosTexto);
  }

  // ── Preview (built client-side: barcodes need the DOM) ──────────────────────

  const previewRef = useRef<HTMLDivElement>(null);
  const [previewWidth, setPreviewWidth] = useState(0);
  const [previewHtml, setPreviewHtml] = useState("");

  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setPreviewWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const porPagina = plantilla ? (plantilla.tipo === "zebra" ? 1 : plantilla.columnas * plantilla.filas) : 1;
  const previewCount = plantilla?.tipo === "zebra"
    ? Math.min(etiquetas.length, PREVIEW_ZEBRA_MAX)
    : Math.max(0, Math.min(etiquetas.length, porPagina - (posicionInicial - 1)));

  useEffect(() => {
    if (!plantilla || etiquetas.length === 0) { setPreviewHtml(""); return; }
    // Always show the first sheet (even with few labels) so the start position is visible
    setPreviewHtml(buildEtiquetasHtml(etiquetas.slice(0, previewCount), plantilla, opciones, false));
  }, [etiquetas, plantilla, opciones, previewCount]);

  const pageW = plantilla ? (plantilla.tipo === "zebra" ? plantilla.ancho_mm : 210) : 210;
  const pageH = plantilla ? (plantilla.tipo === "zebra" ? plantilla.alto_mm : 297) : 297;
  const pages = plantilla?.tipo === "zebra" ? previewCount : 1;
  const docW = (pageW + 2 * PREVIEW_PADDING_MM) * MM_TO_PX;
  const docH = (pages * (pageH + PREVIEW_PADDING_MM) + PREVIEW_PADDING_MM) * MM_TO_PX;
  const scale = previewWidth > 0 ? Math.min(plantilla?.tipo === "zebra" ? 2 : 1, previewWidth / docW) : 0;

  // ── Actions ─────────────────────────────────────────────────────────────────

  function imprimir() {
    if (!plantilla || etiquetas.length === 0) return;
    setAvisoPopup(!imprimirEtiquetas(etiquetas, plantilla, opciones));
  }

  function zpl() {
    if (!plantilla || etiquetas.length === 0) return;
    descargarZpl(etiquetas, plantilla, opciones, dpi);
  }

  const hojas = plantilla ? paginasNecesarias(etiquetas.length, plantilla, posicionInicial) : 0;
  const a4 = plantillas.filter((p) => p.tipo === "a4");
  const zebra = plantillas.filter((p) => p.tipo === "zebra");

  return (
    <div className="grid lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] gap-5 items-start">
      {/* ── Options column ── */}
      <div className="space-y-4">
        <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-3" aria-labelledby="sec-ejemplares">
          <h2 id="sec-ejemplares" className="font-semibold text-gray-900">1. Ejemplares</h2>
          <div className="grid grid-cols-2 gap-1 p-1 bg-gray-100 rounded-lg" role="tablist">
            {(["titulo", "codigos"] as Modo[]).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={modo === m}
                onClick={() => setModo(m)}
                className={cn("py-2 rounded-md text-sm font-medium", modo === m ? "bg-white shadow text-gray-900" : "text-gray-500")}
              >
                {m === "titulo" ? "Por título" : "Por códigos"}
              </button>
            ))}
          </div>

          {modo === "titulo" ? (
            <div className="space-y-2">
              <select value={tituloId} onChange={(e) => setTituloId(e.target.value)} aria-label="Título" className={inputCls}>
                <option value="">Elige un título…</option>
                {titulos.map((t) => <option key={t.id} value={t.id}>{t.titulo}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input value={desde} onChange={(e) => setDesde(e.target.value)} placeholder="Desde código" aria-label="Desde código" className={`${inputCls} font-mono`} />
                <input value={hasta} onChange={(e) => setHasta(e.target.value)} placeholder="Hasta código" aria-label="Hasta código" className={`${inputCls} font-mono`} />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" checked={soloEnCentro} onChange={(e) => setSoloEnCentro(e.target.checked)} className="w-4 h-4 rounded" />
                Solo ejemplares en el centro
              </label>
            </div>
          ) : (
            <div className="space-y-1">
              <textarea
                value={codigosTexto}
                onChange={(e) => setCodigosTexto(e.target.value)}
                rows={5}
                placeholder={"Escribe o escanea códigos,\nuno por línea"}
                aria-label="Códigos de barras"
                className={`${inputCls} font-mono resize-y`}
              />
              <p className="text-xs text-gray-400">Útil para reimprimir etiquetas dañadas.</p>
            </div>
          )}

          <button
            onClick={cargar}
            disabled={cargando || (modo === "titulo" ? !tituloId : !codigosTexto.trim())}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg border border-blue-600 text-blue-700 hover:bg-blue-50 disabled:opacity-40"
          >
            {cargando && <Loader2 size={15} className="animate-spin" />}
            Cargar ejemplares
          </button>

          <p className="text-sm text-gray-600" aria-live="polite">
            <b>{etiquetas.length}</b> etiquetas{hojas > 0 && plantilla && ` · ${hojas} ${plantilla.tipo === "zebra" ? "etiquetas de rollo" : hojas === 1 ? "hoja" : "hojas"}`}
          </p>
          {noEncontrados.length > 0 && (
            <p className="text-xs text-amber-700 flex gap-1.5">
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
              No encontrados: <span className="font-mono">{noEncontrados.join(", ")}</span>
            </p>
          )}
          {errorCarga && <p className="text-sm text-red-600">{errorCarga}</p>}
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-3" aria-labelledby="sec-plantilla">
          <div className="flex items-center justify-between">
            <h2 id="sec-plantilla" className="font-semibold text-gray-900">2. Plantilla</h2>
            <button onClick={() => setShowPlantillas(true)} className="flex items-center gap-1 text-sm text-blue-600 hover:underline p-1">
              <Settings2 size={14} /> Gestionar
            </button>
          </div>
          <select value={plantillaId} onChange={(e) => elegirPlantilla(e.target.value)} aria-label="Plantilla de etiqueta" className={inputCls}>
            {a4.length > 0 && <optgroup label="Hojas A4">{a4.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</optgroup>}
            {zebra.length > 0 && <optgroup label="Impresora Zebra">{zebra.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</optgroup>}
          </select>

          {plantilla?.tipo === "a4" && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Empezar en la etiqueta nº {posicionInicial}</p>
              <p className="text-xs text-gray-400 mb-2">Pulsa la primera etiqueta libre de la hoja para aprovechar hojas empezadas.</p>
              <div
                className="grid gap-0.5 p-1.5 bg-gray-100 rounded-lg w-fit"
                style={{ gridTemplateColumns: `repeat(${plantilla.columnas}, minmax(0, 1fr))` }}
                role="radiogroup"
                aria-label="Posición inicial en la hoja"
              >
                {Array.from({ length: porPagina }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    role="radio"
                    aria-checked={n === posicionInicial}
                    aria-label={`Etiqueta ${n}`}
                    onClick={() => setPosicionInicial(n)}
                    className={cn(
                      "h-6 rounded-sm text-[10px] font-medium",
                      plantilla.columnas <= 3 ? "w-12" : "w-9",
                      n < posicionInicial ? "bg-gray-300 text-gray-400" : n === posicionInicial ? "bg-blue-600 text-white" : "bg-white text-gray-500 hover:bg-blue-50",
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          <fieldset>
            <legend className="text-sm font-medium text-gray-700 mb-1">Contenido</legend>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(CAMPOS_LABEL) as (keyof CamposEtiqueta)[]).map((k) => (
                <label key={k} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer py-1">
                  <input type="checkbox" checked={campos[k]} onChange={(e) => setCampos({ ...campos, [k]: e.target.checked })} className="w-4 h-4 rounded" />
                  {CAMPOS_LABEL[k]}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={bordes} onChange={(e) => setBordes(e.target.checked)} className="w-4 h-4 rounded" />
            Dibujar bordes (para calibrar en papel normal)
          </label>
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-2" aria-labelledby="sec-imprimir">
          <h2 id="sec-imprimir" className="font-semibold text-gray-900">3. Imprimir</h2>
          <button
            onClick={imprimir}
            disabled={!plantilla || etiquetas.length === 0}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold rounded-lg bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-40"
          >
            <Printer size={17} /> Imprimir {etiquetas.length > 0 ? etiquetas.length : ""} etiquetas
          </button>
          {plantilla?.tipo === "a4" && (
            <p className="text-xs text-gray-400">En el diálogo de impresión elige escala «100 %» / «Tamaño real» y sin márgenes.</p>
          )}
          {plantilla?.tipo === "zebra" && (
            <>
              <p className="text-xs text-gray-400">Con el driver de Zebra instalado, imprime desde el navegador con escala al 100 %. También puedes descargar el archivo ZPL:</p>
              <div className="flex gap-2">
                <select value={dpi} onChange={(e) => setDpi(Number(e.target.value) as 203 | 300)} aria-label="Resolución de la impresora" className={`${inputCls} w-auto`}>
                  <option value={203}>203 ppp</option>
                  <option value={300}>300 ppp</option>
                </select>
                <button
                  onClick={zpl}
                  disabled={etiquetas.length === 0}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                >
                  <FileDown size={16} /> Descargar ZPL
                </button>
              </div>
            </>
          )}
          {avisoPopup && <p className="text-sm text-red-600">El navegador ha bloqueado la ventana de impresión. Permite las ventanas emergentes para esta web.</p>}
        </section>
      </div>

      {/* ── Preview column ── */}
      <section className="bg-white border border-gray-200 rounded-xl p-4 lg:sticky lg:top-4" aria-labelledby="sec-preview">
        <h2 id="sec-preview" className="font-semibold text-gray-900 mb-3">
          Vista previa {plantilla?.tipo === "zebra" && etiquetas.length > PREVIEW_ZEBRA_MAX && <span className="font-normal text-sm text-gray-400">(primeras {PREVIEW_ZEBRA_MAX})</span>}
          {plantilla?.tipo === "a4" && hojas > 1 && <span className="font-normal text-sm text-gray-400"> (primera hoja de {hojas})</span>}
        </h2>
        <div ref={previewRef} className="w-full">
          {previewHtml && scale > 0 ? (
            <div style={{ height: docH * scale }} className="overflow-hidden rounded-lg">
              <iframe
                title="Vista previa de las etiquetas"
                srcDoc={previewHtml}
                style={{ width: docW, height: docH, transform: `scale(${scale})`, transformOrigin: "top left", border: 0 }}
                sandbox=""
              />
            </div>
          ) : (
            <div className="text-center py-20 text-gray-400">
              <Tags size={40} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">Carga ejemplares para ver cómo quedarán las etiquetas.</p>
            </div>
          )}
        </div>
      </section>

      {showPlantillas && (
        <PlantillasModal
          plantillas={plantillas}
          onChange={(next) => {
            setPlantillas(next);
            if (!next.some((p) => p.id === plantillaId)) elegirPlantillaDe(next);
          }}
          onClose={() => setShowPlantillas(false)}
        />
      )}
    </div>
  );

  function elegirPlantillaDe(lista: PlantillaEtiqueta[]) {
    const p = plantillaInicial(lista);
    setPlantillaId(p?.id ?? "");
    if (p) setCampos(p.campos);
  }
}

const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";

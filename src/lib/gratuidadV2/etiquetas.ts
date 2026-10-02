// Label generation for Gratuidad v2: printable HTML (A4 sheets and Zebra rolls
// through the browser) and raw ZPL for Zebra printers. Browser-only (uses the DOM).
import JsBarcode from "jsbarcode";
import type { CamposEtiqueta, PlantillaEtiqueta } from "@/lib/types/gratuidadV2";
import { NOMBRE_CENTRO } from "./centro";

/** Grey margin around pages when the document is shown on screen (preview) */
export const PREVIEW_PADDING_MM = 4;

export interface EtiquetaDatos {
  codigo: string;
  titulo: string;
  /** Lot summary, e.g. "1º ESO" */
  curso: string;
}

export interface OpcionesEtiquetas {
  campos: CamposEtiqueta;
  cursoEscolar: string;
  /** 1-based slot where the first label goes (reuse partially used A4 sheets) */
  posicionInicial: number;
  /** Dashed outline around each label, to calibrate on plain paper */
  bordes: boolean;
}

// ─── Barcode ─────────────────────────────────────────────────────────────────

/** Code128 barcode as an SVG string that stretches to fill its container. */
export function barcodeSvg(codigo: string): string {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  JsBarcode(svg, codigo, { format: "CODE128", displayValue: false, margin: 0, width: 2, height: 80 });
  const w = parseFloat(svg.getAttribute("width") ?? "0");
  const h = parseFloat(svg.getAttribute("height") ?? "80");
  if (!svg.getAttribute("viewBox")) svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.removeAttribute("style");
  return svg.outerHTML;
}

// ─── HTML (A4 and Zebra via browser) ─────────────────────────────────────────

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
}

/** `posicion` adds absolute left/top (A4 sheets). */
function labelHtml(e: EtiquetaDatos, p: PlantillaEtiqueta, o: OpcionesEtiquetas, posicion = ""): string {
  const { campos } = o;
  const top = campos.centro || campos.curso_escolar
    ? `<div class="row small"><b>${campos.centro ? NOMBRE_CENTRO : ""}</b><span>${campos.curso_escolar ? escapeHtml(o.cursoEscolar) : ""}</span></div>`
    : "";
  const titulo = campos.titulo ? `<div class="titulo">${escapeHtml(e.titulo)}</div>` : "";
  const bottom = `<div class="row"><span class="codigo">${escapeHtml(e.codigo)}</span><span class="small">${campos.curso ? escapeHtml(e.curso) : ""}</span></div>`;
  return `<div class="label${o.bordes ? " bordes" : ""}" style="${posicion}width:${p.ancho_mm}mm;height:${p.alto_mm}mm">${top}${titulo}<div class="bc">${barcodeSvg(e.codigo)}</div>${bottom}</div>`;
}

/** Inner margin of a label in mm (older rows without the columns use the former fixed values) */
export function rellenoEtiqueta(p: PlantillaEtiqueta): { sup: number; inf: number; lat: number } {
  const n = (v: number | string | null | undefined, def: number) => (v == null || v === "" ? def : Number(v));
  return { sup: n(p.relleno_sup_mm, 1.5), inf: n(p.relleno_inf_mm, 1.5), lat: n(p.relleno_lat_mm, 3) };
}

function baseCss(p: PlantillaEtiqueta): string {
  const r = rellenoEtiqueta(p);
  // Font size scales with the label height so small labels stay readable
  const fs = Math.min(3.2, Math.max(1.8, p.alto_mm / 11));
  return `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #fff; color: #000; font-family: Arial, Helvetica, sans-serif; }
  .label { display: flex; flex-direction: column; justify-content: space-between; gap: 0.4mm;
           padding: ${r.sup}mm ${r.lat}mm ${r.inf}mm; overflow: hidden; font-size: ${fs}mm; line-height: 1.15; }
  .label.bordes { outline: 0.2mm dashed #999; outline-offset: -0.1mm; }
  .row { display: flex; justify-content: space-between; align-items: baseline; gap: 1mm; white-space: nowrap; }
  .small { font-size: ${(fs * 0.8).toFixed(2)}mm; }
  .titulo { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 600; }
  .bc { flex: 1; min-height: 5mm; }
  .bc svg { display: block; }
  .codigo { font-family: "Courier New", monospace; font-weight: 700; letter-spacing: 0.3mm; }
  .page { position: relative; overflow: hidden; page-break-after: always; break-after: page; }
  .page:last-child { page-break-after: auto; break-after: auto; }
  @media screen {
    html, body { background: #e5e7eb; }
    body { padding: ${PREVIEW_PADDING_MM}mm; }
    .page { background: #fff; margin: 0 auto ${PREVIEW_PADDING_MM}mm; box-shadow: 0 1px 3px rgba(0,0,0,.25); }
  }`;
}

/** Full printable document. With `autoPrint` it opens the print dialog on load. */
export function buildEtiquetasHtml(
  etiquetas: EtiquetaDatos[],
  p: PlantillaEtiqueta,
  o: OpcionesEtiquetas,
  autoPrint: boolean,
): string {
  let pages: string;
  let pageCss: string;

  if (p.tipo === "zebra") {
    pageCss = `@page { size: ${p.ancho_mm}mm ${p.alto_mm}mm; margin: 0; }
  .page { width: ${p.ancho_mm}mm; height: ${p.alto_mm}mm; }`;
    pages = etiquetas.map((e) => `<div class="page">${labelHtml(e, p, o)}</div>`).join("");
  } else {
    pageCss = `@page { size: A4; margin: 0; }
  .page { width: 210mm; height: 297mm; }
  .page .label { position: absolute; }`;
    const porPagina = p.columnas * p.filas;
    const offset = Math.min(Math.max(o.posicionInicial, 1), porPagina) - 1;
    const slots: (EtiquetaDatos | null)[] = [...Array<null>(offset).fill(null), ...etiquetas];
    const chunks: (EtiquetaDatos | null)[][] = [];
    for (let i = 0; i < slots.length; i += porPagina) chunks.push(slots.slice(i, i + porPagina));

    pages = chunks.map((chunk) => {
      const labels = chunk.map((e, i) => {
        if (!e) return "";
        const col = i % p.columnas;
        const row = Math.floor(i / p.columnas);
        const left = p.margen_izq_mm + col * (p.ancho_mm + p.sep_horizontal_mm);
        const top = p.margen_sup_mm + row * (p.alto_mm + p.sep_vertical_mm);
        return labelHtml(e, p, o, `left:${left}mm;top:${top}mm;`);
      }).join("");
      return `<div class="page">${labels}</div>`;
    }).join("");
  }

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Etiquetas</title>
<style>${baseCss(p)}
  ${pageCss}
</style>
</head>
<body>
${pages}
${autoPrint ? "<script>window.onload=function(){window.print()}<\/script>" : ""}
</body>
</html>`;
}

/** Opens the labels in a new tab and launches the print dialog. */
export function imprimirEtiquetas(etiquetas: EtiquetaDatos[], p: PlantillaEtiqueta, o: OpcionesEtiquetas): boolean {
  const blob = new Blob([buildEtiquetasHtml(etiquetas, p, o, true)], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (win) setTimeout(() => URL.revokeObjectURL(url), 30000);
  return Boolean(win);
}

/** Number of sheets / labels the print will use. */
export function paginasNecesarias(total: number, p: PlantillaEtiqueta, posicionInicial: number): number {
  if (total === 0) return 0;
  if (p.tipo === "zebra") return total;
  const porPagina = p.columnas * p.filas;
  const offset = Math.min(Math.max(posicionInicial, 1), porPagina) - 1;
  return Math.ceil((offset + total) / porPagina);
}

// ─── ZPL (Zebra) ─────────────────────────────────────────────────────────────

/** ZPL field data cannot contain the ^ and ~ control characters. */
function zplText(s: string): string {
  return s.replace(/[\^~\\]/g, " ");
}

function truncar(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, Math.max(0, max - 1))}…` : s;
}

/** Raw ZPL (UTF-8, ^CI28) with one label per ^XA…^XZ block. */
export function buildZpl(etiquetas: EtiquetaDatos[], p: PlantillaEtiqueta, o: OpcionesEtiquetas, dpi: 203 | 300): string {
  const dpm = dpi / 25.4;
  const d = (mm: number) => Math.round(mm * dpm);
  const w = d(p.ancho_mm);
  const h = d(p.alto_mm);
  const r = rellenoEtiqueta(p);
  const padX = d(r.lat);
  const padTop = d(r.sup);
  const padBottom = d(r.inf);
  const fs = d(Math.min(3.2, Math.max(1.8, p.alto_mm / 11)));
  const fsSmall = Math.round(fs * 0.8);
  const innerW = w - 2 * padX;
  // Approximate characters per line for the default ^A0 font (width ≈ 0.55 × height)
  const charsPorLinea = Math.floor(innerW / (fs * 0.55));
  const { campos } = o;

  return etiquetas.map((e) => {
    const lines: string[] = ["^XA", "^CI28", `^PW${w}`, `^LL${h}`, "^LH0,0"];
    let y = padTop;

    if (campos.centro || campos.curso_escolar) {
      if (campos.centro) lines.push(`^FO${padX},${y}^A0N,${fsSmall},${fsSmall}^FD${NOMBRE_CENTRO}^FS`);
      if (campos.curso_escolar) {
        lines.push(`^FO${padX},${y}^A0N,${fsSmall},${fsSmall}^FB${innerW},1,0,R^FD${zplText(o.cursoEscolar)}^FS`);
      }
      y += fsSmall + d(0.6);
    }
    if (campos.titulo) {
      lines.push(`^FO${padX},${y}^A0N,${fs},${fs}^FB${innerW},1,0,L^FD${zplText(truncar(e.titulo, charsPorLinea))}^FS`);
      y += fs + d(0.6);
    }

    const bottomH = fs + d(0.4);
    const barH = Math.max(d(5), h - y - padBottom - bottomH - d(0.6));
    // Code128 width ≈ 35 + 11 × characters modules (worst case, subset B)
    const modules = 35 + 11 * e.codigo.length;
    const moduleW = Math.max(1, Math.min(4, Math.floor(innerW / modules)));
    const barX = Math.max(padX, Math.round((w - moduleW * modules) / 2));
    lines.push(`^FO${barX},${y}^BY${moduleW},2,${barH}^BCN,${barH},N,N,N,A^FD${zplText(e.codigo)}^FS`);

    const yb = h - padBottom - fs;
    lines.push(`^FO${padX},${yb}^A0N,${fs},${fs}^FD${zplText(e.codigo)}^FS`);
    if (campos.curso && e.curso) {
      lines.push(`^FO${padX},${yb + (fs - fsSmall)}^A0N,${fsSmall},${fsSmall}^FB${innerW},1,0,R^FD${zplText(e.curso)}^FS`);
    }
    lines.push("^XZ");
    return lines.join("\n");
  }).join("\n");
}

export function descargarZpl(etiquetas: EtiquetaDatos[], p: PlantillaEtiqueta, o: OpcionesEtiquetas, dpi: 203 | 300): void {
  const blob = new Blob([buildZpl(etiquetas, p, o, dpi)], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `etiquetas_${etiquetas.length}.zpl`;
  a.click();
  URL.revokeObjectURL(url);
}

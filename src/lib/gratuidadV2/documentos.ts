// Printable documents for Gratuidad v2 (opened in a new tab with the print dialog).
import { ETIQUETAS_CONSERVACION, type ConservacionV2 } from "@/lib/types/gratuidadV2";
import { NOMBRE_CENTRO } from "./centro";

export interface LineaJustificante {
  codigo: string;
  titulo: string;
  conservacion: ConservacionV2;
}

export interface DatosJustificante {
  alumno: string;
  grupo: string;
  cursoEscolar: string;
  /** "dd/mm/yyyy" */
  fecha: string;
  profesor: string;
  libros: LineaJustificante[];
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
}

function copia(d: DatosJustificante, destinatario: string): string {
  const filas = d.libros.map((l, i) => `
    <tr><td>${i + 1}</td><td class="mono">${esc(l.codigo)}</td><td>${esc(l.titulo)}</td><td>${ETIQUETAS_CONSERVACION[l.conservacion]}</td></tr>`).join("");
  return `
  <section class="copia">
    <header>
      <div><b>${NOMBRE_CENTRO}</b><br><span class="muted">Programa de gratuidad de libros de texto · ${esc(d.cursoEscolar)}</span></div>
      <div class="dest">${destinatario}</div>
    </header>
    <h1>Justificante de entrega de libros</h1>
    <p><b>Alumno/a:</b> ${esc(d.alumno)} &nbsp;·&nbsp; <b>Grupo:</b> ${esc(d.grupo)} &nbsp;·&nbsp; <b>Fecha:</b> ${esc(d.fecha)}</p>
    <table>
      <thead><tr><th>#</th><th>Código</th><th>Título</th><th>Estado</th></tr></thead>
      <tbody>${filas}</tbody>
    </table>
    <p class="legal">Los libros son propiedad del centro y se prestan para este curso escolar. La familia se compromete a
    conservarlos en buen estado y a devolverlos al finalizar el curso. El deterioro o la pérdida por mal uso obliga a su reposición.</p>
    <div class="firmas">
      <div>Entregado por:<div class="linea"></div>${esc(d.profesor)}</div>
      <div>Recibido (alumno/a o familia):<div class="linea"></div>Fdo.:</div>
    </div>
  </section>`;
}

/** Up to this many books both copies fit on one A4 sheet; beyond it, one copy per page. */
const MAX_LIBROS_MEDIA_HOJA = 11;

export function buildJustificanteEntregaHtml(d: DatosJustificante): string {
  const unaPorPagina = d.libros.length > MAX_LIBROS_MEDIA_HOJA
    ? `.copia { height: auto; } .copia + .copia { border-top: 0; padding-top: 0; margin-top: 0; break-before: page; page-break-before: always; }`
    : "";
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Justificante de entrega · ${esc(d.alumno)}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10.5pt; color: #111; margin: 0; }
  .copia { height: 132mm; overflow: hidden; }
  .copia + .copia { border-top: 1px dashed #999; padding-top: 6mm; margin-top: 6mm; }
  header { display: flex; justify-content: space-between; align-items: flex-start; }
  .dest { font-size: 9pt; border: 1px solid #999; padding: 1mm 3mm; border-radius: 2mm; }
  .muted { color: #555; font-size: 9pt; }
  h1 { font-size: 13pt; margin: 4mm 0 2mm; }
  p { margin: 1.5mm 0; }
  table { width: 100%; border-collapse: collapse; margin: 2mm 0; font-size: 9.5pt; }
  th, td { border: 1px solid #bbb; padding: 1mm 2mm; text-align: left; }
  th { background: #f1f1f1; }
  .mono { font-family: "Courier New", monospace; }
  .legal { font-size: 8.5pt; color: #333; }
  .firmas { display: flex; gap: 10mm; margin-top: 3mm; }
  .firmas > div { flex: 1; font-size: 9pt; }
  .firmas .linea { height: 14mm; border-bottom: 1px solid #999; margin-bottom: 1mm; }
  ${unaPorPagina}
</style></head>
<body>
${copia(d, "Copia para la familia")}
${copia(d, "Copia para el centro")}
<script>window.onload=function(){window.print()}<\/script>
</body></html>`;
}

export function imprimirHtml(html: string): boolean {
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (win) setTimeout(() => URL.revokeObjectURL(url), 30000);
  return Boolean(win);
}

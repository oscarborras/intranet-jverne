// Printable documents for Gratuidad v2 (opened in a new tab with the print dialog).
// Each document prints two copies (family / school) on one A4 sheet, or one per
// page when the book list is too long.
import { ETIQUETAS_CONSERVACION, type ConservacionV2 } from "@/lib/types/gratuidadV2";
import { NOMBRE_CENTRO } from "./centro";

export interface LineaJustificante {
  codigo: string;
  titulo: string;
  conservacion: ConservacionV2;
}

interface DatosComunes {
  alumno: string;
  grupo: string;
  cursoEscolar: string;
  /** "dd/mm/yyyy" */
  fecha: string;
  profesor: string;
}

export interface DatosJustificante extends DatosComunes {
  libros: LineaJustificante[];
}

export interface DatosAlbaranDevolucion extends DatosComunes {
  devueltos: LineaJustificante[];
  /** Books the student still has */
  pendientes: { codigo: string; titulo: string }[];
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
}

function tablaLibros(libros: LineaJustificante[], columnaEstado: string): string {
  const filas = libros.map((l, i) => `
    <tr><td>${i + 1}</td><td class="mono">${esc(l.codigo)}</td><td>${esc(l.titulo)}</td><td>${ETIQUETAS_CONSERVACION[l.conservacion]}</td></tr>`).join("");
  return `<table>
      <thead><tr><th>#</th><th>Código</th><th>Título</th><th>${columnaEstado}</th></tr></thead>
      <tbody>${filas}</tbody>
    </table>`;
}

function cabecera(d: DatosComunes, titulo: string, destinatario: string): string {
  return `
    <header>
      <div><b>${NOMBRE_CENTRO}</b><br><span class="muted">Programa de gratuidad de libros de texto · ${esc(d.cursoEscolar)}</span></div>
      <div class="dest">${destinatario}</div>
    </header>
    <h1>${titulo}</h1>
    <p><b>Alumno/a:</b> ${esc(d.alumno)} &nbsp;·&nbsp; <b>Grupo:</b> ${esc(d.grupo)} &nbsp;·&nbsp; <b>Fecha:</b> ${esc(d.fecha)}</p>`;
}

function firmas(profesorLabel: string, profesor: string, otroLabel: string): string {
  return `
    <div class="firmas">
      <div>${profesorLabel}<div class="linea"></div>${esc(profesor)}</div>
      <div>${otroLabel}<div class="linea"></div>Fdo.:</div>
    </div>`;
}

/** Up to this many table rows both copies fit on one A4 sheet; beyond it, one copy per page. */
const MAX_FILAS_MEDIA_HOJA = 11;

function documento(tituloPestaña: string, filas: number, copia: (destinatario: string) => string): string {
  const unaPorPagina = filas > MAX_FILAS_MEDIA_HOJA
    ? `.copia { height: auto; } .copia + .copia { border-top: 0; padding-top: 0; margin-top: 0; break-before: page; page-break-before: always; }`
    : "";
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>${esc(tituloPestaña)}</title>
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
  h2 { font-size: 10.5pt; margin: 3mm 0 1mm; }
  p { margin: 1.5mm 0; }
  table { width: 100%; border-collapse: collapse; margin: 2mm 0; font-size: 9.5pt; }
  th, td { border: 1px solid #bbb; padding: 1mm 2mm; text-align: left; }
  th { background: #f1f1f1; }
  .mono { font-family: "Courier New", monospace; }
  .legal { font-size: 8.5pt; color: #333; }
  .ok { color: #065f46; font-weight: bold; }
  .pendiente { color: #92400e; font-weight: bold; }
  .firmas { display: flex; gap: 10mm; margin-top: 3mm; }
  .firmas > div { flex: 1; font-size: 9pt; }
  .firmas .linea { height: 14mm; border-bottom: 1px solid #999; margin-bottom: 1mm; }
  ${unaPorPagina}
</style></head>
<body>
<section class="copia">${copia("Copia para la familia")}</section>
<section class="copia">${copia("Copia para el centro")}</section>
<script>window.onload=function(){window.print()}<\/script>
</body></html>`;
}

export function buildJustificanteEntregaHtml(d: DatosJustificante): string {
  return documento(`Justificante de entrega · ${d.alumno}`, d.libros.length, (destinatario) => `
    ${cabecera(d, "Justificante de entrega de libros", destinatario)}
    ${tablaLibros(d.libros, "Estado")}
    <p class="legal">Los libros son propiedad del centro y se prestan para este curso escolar. La familia se compromete a
    conservarlos en buen estado y a devolverlos al finalizar el curso. El deterioro o la pérdida por mal uso obliga a su reposición.</p>
    ${firmas("Entregado por:", d.profesor, "Recibido (alumno/a o familia):")}`);
}

export function buildAlbaranDevolucionHtml(d: DatosAlbaranDevolucion): string {
  const filas = d.devueltos.length + (d.pendientes.length > 0 ? d.pendientes.length + 2 : 0);
  return documento(`Albarán de devolución · ${d.alumno}`, filas, (destinatario) => `
    ${cabecera(d, "Albarán de devolución de libros", destinatario)}
    ${tablaLibros(d.devueltos, "Estado al devolver")}
    ${d.pendientes.length === 0
      ? `<p class="ok">El alumno/a ha devuelto todos los libros prestados.</p>`
      : `<h2 class="pendiente">Libros pendientes de devolver (${d.pendientes.length})</h2>
         <table><thead><tr><th>Código</th><th>Título</th></tr></thead><tbody>
         ${d.pendientes.map((p) => `<tr><td class="mono">${esc(p.codigo)}</td><td>${esc(p.titulo)}</td></tr>`).join("")}
         </tbody></table>`}
    ${firmas("Recogido por:", d.profesor, "Entregado (alumno/a o familia):")}`);
}

export function imprimirHtml(html: string): boolean {
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (win) setTimeout(() => URL.revokeObjectURL(url), 30000);
  return Boolean(win);
}

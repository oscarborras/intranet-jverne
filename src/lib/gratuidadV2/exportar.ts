// CSV export shared by the Gratuidad v2 screens (Excel-friendly: UTF-8 BOM, quoted cells).

export type Celda = string | number | null | undefined;

export function descargarCsv(nombreArchivo: string, cabeceras: string[], filas: Celda[][]): void {
  const csv = [cabeceras, ...filas]
    .map((fila) => fila.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  a.click();
  URL.revokeObjectURL(url);
}

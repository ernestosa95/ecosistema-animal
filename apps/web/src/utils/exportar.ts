// Centro de exportación (§4.5 del spec UI/UX): CSV/Excel/PDF genéricos,
// reutilizables desde cualquier vista con una lista de columnas + filas.
import * as XLSX from 'xlsx';

export interface ColumnaExport<T> {
  clave: string;
  etiqueta: string;
  /** Si no se da, se lee `fila[clave]` directamente. */
  valor?: (fila: T) => string | number;
}

export function valorDe<T>(fila: T, col: ColumnaExport<T>): string | number {
  if (col.valor) return col.valor(fila);
  const v = (fila as Record<string, unknown>)[col.clave];
  return v === undefined || v === null ? '' : (v as string | number);
}

function descargar(blob: Blob, nombreArchivo: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function exportarCSV<T>(nombreArchivo: string, columnas: ColumnaExport<T>[], filas: T[]) {
  const escapar = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const encabezado = columnas.map((c) => escapar(c.etiqueta)).join(',');
  const cuerpo = filas.map((f) => columnas.map((c) => escapar(valorDe(f, c))).join(',')).join('\n');
  // BOM inicial para que Excel detecte UTF-8 y no rompa tildes/ñ al abrir el CSV.
  const blob = new Blob(['﻿' + encabezado + '\n' + cuerpo], { type: 'text/csv;charset=utf-8;' });
  descargar(blob, `${nombreArchivo}.csv`);
}

export function exportarExcel<T>(nombreArchivo: string, columnas: ColumnaExport<T>[], filas: T[]) {
  const datos = filas.map((f) => Object.fromEntries(columnas.map((c) => [c.etiqueta, valorDe(f, c)])));
  const hoja = XLSX.utils.json_to_sheet(datos);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, 'Datos');
  XLSX.writeFile(libro, `${nombreArchivo}.xlsx`);
}

/** Abre una ventana imprimible y dispara el diálogo de impresión — "Guardar como PDF" es una opción nativa de cualquier navegador, sin sumar una librería de generación de PDF en el cliente. */
export function exportarPDF<T>(nombreArchivo: string, titulo: string, columnas: ColumnaExport<T>[], filas: T[]) {
  const ventana = window.open('', '_blank');
  if (!ventana) {
    alert('El navegador bloqueó la ventana de impresión. Habilitá los pop-ups para exportar a PDF.');
    return;
  }
  const encabezado = columnas.map((c) => `<th>${c.etiqueta}</th>`).join('');
  const filasHtml = filas
    .map((f) => `<tr>${columnas.map((c) => `<td>${String(valorDe(f, c))}</td>`).join('')}</tr>`)
    .join('');
  ventana.document.write(`<!doctype html>
<html>
<head>
<title>${nombreArchivo}</title>
<meta charset="utf-8" />
<style>
  body { font-family: system-ui, sans-serif; padding: 1.5rem; color: #1f2933; }
  h1 { font-size: 1.1rem; margin-bottom: 1rem; }
  table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
  th, td { text-align: left; padding: 0.4rem 0.6rem; border-bottom: 1px solid #ddd; }
  th { text-transform: uppercase; font-size: 0.7rem; color: #6b7280; }
</style>
</head>
<body>
<h1>${titulo}</h1>
<table><thead><tr>${encabezado}</tr></thead><tbody>${filasHtml}</tbody></table>
</body>
</html>`);
  ventana.document.close();
  ventana.focus();
  // Sin el timeout, algunos navegadores disparan print() antes de terminar de pintar la tabla.
  // El <title> queda como nombreArchivo: la mayoría de los navegadores lo usa como nombre sugerido al "Guardar como PDF".
  setTimeout(() => ventana.print(), 300);
}

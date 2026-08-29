import { ColumnaExport, exportarCSV, exportarExcel, exportarPDF } from '../utils/exportar';

/** Centro de exportación (§4.5): tres botones reutilizables desde cualquier vista con una lista de filas. */
export function ExportBar<T>({
  nombreArchivo,
  titulo,
  columnas,
  filas,
}: {
  nombreArchivo: string;
  titulo?: string;
  columnas: ColumnaExport<T>[];
  filas: T[];
}) {
  if (filas.length === 0) return null;
  return (
    <div className="export-bar">
      <button type="button" className="btn-ghost" onClick={() => exportarCSV(nombreArchivo, columnas, filas)}>
        Exportar CSV
      </button>
      <button type="button" className="btn-ghost" onClick={() => exportarExcel(nombreArchivo, columnas, filas)}>
        Exportar Excel
      </button>
      <button
        type="button"
        className="btn-ghost"
        onClick={() => exportarPDF(nombreArchivo, titulo ?? nombreArchivo, columnas, filas)}
      >
        Exportar PDF
      </button>
    </div>
  );
}

// Tipos de columna compartidos por las tablas de drill-down (`DrawerTabla`).
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

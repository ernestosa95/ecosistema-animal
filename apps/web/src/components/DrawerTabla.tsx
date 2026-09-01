import { ColumnaExport, valorDe } from '../utils/columnasTabla';

/**
 * Drawer genérico para el drill-down del dashboard (§4.2): click en una
 * tarjeta KPI abre esto con la tabla desglosada, sin navegar a otra
 * pantalla. Mismo patrón visual que el drawer de la línea de tiempo médica
 * (`PacienteDetallePage.tsx`), generalizado para cualquier lista de filas +
 * columnas.
 */
export function DrawerTabla<T>({
  titulo,
  columnas,
  filas,
  cargando,
  onCerrar,
}: {
  titulo: string;
  columnas: ColumnaExport<T>[];
  filas: T[];
  cargando?: boolean;
  onCerrar: () => void;
}) {
  return (
    <div className="drawer-overlay" onClick={onCerrar}>
      <div className="drawer-panel drawer-panel-ancho" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <span>{titulo}</span>
          <button className="link" onClick={onCerrar}>
            Cerrar ✕
          </button>
        </div>
        {cargando ? (
          <p className="muted">Cargando…</p>
        ) : filas.length === 0 ? (
          <p className="muted">Sin datos para mostrar.</p>
        ) : (
          <>
            <table className="tabla">
              <thead>
                <tr>
                  {columnas.map((c) => (
                    <th key={c.clave}>{c.etiqueta}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filas.map((f, i) => (
                  <tr key={i}>
                    {columnas.map((c) => (
                      <td key={c.clave}>{String(valorDe(f, c) || '—')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { SelectorBusqueda } from './SelectorBusqueda';
import type { Sesion, Producto, StockItem } from '../api/types';

/**
 * Acceso rápido "Venta común" del centro de operaciones (Home): venta de
 * mostrador de un producto de Farmacia sin pasar por Caja/Farmacia — mismo
 * flujo que `NuevoCobroForm` en `CajaPage.tsx` (cobro + baja de stock tipo
 * 'venta'), reimplementado acá porque ese formulario no está exportado y
 * trae campos propios de Caja (veterinario a cargo) que este acceso rápido
 * no necesita. Ya no exige una caja previamente abierta: si no hay una, el
 * backend la abre sola con este mismo cobro (`CobrosService.crear()`).
 */
export function VentaRapidaModal({
  sesion,
  onCancelar,
  onCompletada,
}: {
  sesion: Sesion;
  onCancelar: () => void;
  onCompletada: () => void;
}) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [nombreProducto, setNombreProducto] = useState('');
  const [cantidad, setCantidad] = useState('1');
  // Precio unitario (por la unidad del producto, ej. por kg) — se precarga
  // con el precio actual del producto y es la fuente de verdad del monto
  // total; si el usuario lo cambia acá, queda como el nuevo precio general
  // del producto (no sólo para esta venta), igual que en el flujo de
  // Ingresos.
  const [precioUnitario, setPrecioUnitario] = useState('');
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    api.productos(sesion).then(setProductos).catch(() => {});
    api.stock(sesion).then(setStock).catch(() => {});
  }, [sesion]);

  const productoSel = productos.find((p) => p.nombre === nombreProducto) ?? null;
  const stockDe = (id: string) => stock.find((s) => s.productoId === id)?.cantidad ?? 0;

  function elegirProducto(nombre: string) {
    setNombreProducto(nombre);
    const p = productos.find((x) => x.nombre === nombre);
    setPrecioUnitario(p?.precio ?? '');
  }

  const montoTotal =
    precioUnitario && cantidad ? (Number(precioUnitario) * Number(cantidad)).toFixed(2) : null;
  const precioCambio = !!productoSel && precioUnitario !== (productoSel.precio ?? '');

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!productoSel) {
      setError('Elegí un producto');
      return;
    }
    if (!precioUnitario || Number(precioUnitario) <= 0) {
      setError('Ingresá un precio unitario mayor a 0');
      return;
    }
    setError(null);
    setGuardando(true);
    try {
      await api.crearCobro(sesion, {
        concepto: `Venta: ${productoSel.nombre}`,
        monto: Number(precioUnitario) * Number(cantidad),
        metodoPago,
        productoId: productoSel.id,
        cantidad: Number(cantidad),
      });
      try {
        await api.crearMovimientoStock(sesion, {
          productoId: productoSel.id,
          tipo: 'venta',
          cantidad: Number(cantidad),
          observaciones: 'Venta de mostrador',
        });
      } catch (errStock) {
        setError(
          'La venta se cobró, pero no se pudo descontar el stock: ' +
            (errStock instanceof Error ? errStock.message : 'error'),
        );
        setGuardando(false);
        return;
      }
      // El precio unitario cargado acá queda como el precio de venta del
      // producto (no sólo de esta venta) — sólo pega la actualización si
      // realmente cambió, para no generar un "movimiento" de producto vacío.
      if (precioCambio) {
        try {
          await api.actualizarProducto(sesion, productoSel.id, { precio: Number(precioUnitario) });
        } catch {
          // La venta ya se registró — no bloquea el flujo si esto falla.
        }
      }
      api.registrarEvento(sesion, 'accion', 'stock-venta');
      setOk(true);
      setTimeout(onCompletada, 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar la venta');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onCancelar}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <span>Venta común</span>
          <button className="link" onClick={onCancelar}>
            Cerrar ✕
          </button>
        </div>

        {ok ? (
          <p className="muted">Venta registrada ✓</p>
        ) : (
          <form className="form-grid" onSubmit={guardar} style={{ marginTop: '0.75rem' }}>
            <label className="span-2">
              Producto
              <SelectorBusqueda
                opciones={productos.map((p) => p.nombre)}
                valor={nombreProducto}
                onCambiar={elegirProducto}
                placeholder="Buscar producto…"
              />
            </label>

            {productoSel && (
              <>
                <p className="muted span-2" style={{ margin: '-0.5rem 0 0' }}>
                  Stock disponible: {stockDe(productoSel.id)}
                  {productoSel.unidad ? ` ${productoSel.unidad}` : ''}
                </p>
                <label>
                  Cantidad{productoSel.unidad ? ` (${productoSel.unidad})` : ''}
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={cantidad}
                    onChange={(e) => setCantidad(e.target.value)}
                    required
                  />
                </label>
                <label>
                  Precio unitario{productoSel.unidad ? ` (por ${productoSel.unidad})` : ''}
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={precioUnitario}
                    onChange={(e) => setPrecioUnitario(e.target.value)}
                    required
                  />
                </label>
                <div className="span-2 sugerencia-dosis">
                  Total: <b>${montoTotal ?? '0.00'}</b>
                  {precioCambio && (
                    <span className="muted"> — el precio de este producto va a quedar en ${precioUnitario}{productoSel.unidad ? `/${productoSel.unidad}` : ''}</span>
                  )}
                </div>
                <label className="span-2">
                  Método de pago
                  <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
                    <option value="efectivo">Efectivo</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="transferencia">Transferencia</option>
                  </select>
                </label>
              </>
            )}

            {error && <div className="alerta span-2">{error}</div>}
            <div className="span-2">
              <button className="btn" type="submit" disabled={guardando || !productoSel}>
                {guardando ? 'Guardando…' : 'Registrar venta'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

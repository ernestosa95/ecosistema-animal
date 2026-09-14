import { useState } from 'react';
import { api } from '../api/client';
import { SelectorBusqueda } from './SelectorBusqueda';
import type { Sesion, Producto } from '../api/types';

/**
 * Flujo "+ Ingresos" de Farmacia: alta de stock (movimiento `compra`) más
 * actualización de precioCompra/precio del producto — extraído de
 * `FarmaciaPage.tsx` para poder reusarlo también como acceso rápido desde el
 * Home (`IngresoStockModal.tsx`). Si se cargó precio de compra, además
 * registra un egreso por `precioCompra × cantidad` (lo pedido por el
 * propietario para que las compras a proveedor impacten Caja) — es
 * best-effort: si falla (por ejemplo, un veterinario sin permiso para cargar
 * egresos — Caja es propietario/admin/recepción, Farmacia es
 * propietario/admin/veterinario, los sets no coinciden a propósito), el
 * ingreso de stock ya se guardó igual, así que se avisa pero no se deshace.
 */
export function IngresoStockForm({
  sesion,
  productos,
  onCreado,
  onProductoCreado,
}: {
  sesion: Sesion;
  productos: Producto[];
  /** `cajaAbiertaAhora` viene en true si el egreso de la compra abrió la caja del día sola. */
  onCreado: (cajaAbiertaAhora?: boolean) => void;
  /** El producto recién creado por el alta rápida — quien nos pasó `productos` tiene que sumarlo a su lista. */
  onProductoCreado: (p: Producto) => void;
}) {
  const [nombreProducto, setNombreProducto] = useState('');
  const producto = productos.find((p) => p.nombre === nombreProducto) ?? null;

  const [mostrarAltaProducto, setMostrarAltaProducto] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevaUnidad, setNuevaUnidad] = useState('');
  const [creandoProducto, setCreandoProducto] = useState(false);
  const [errorAltaProducto, setErrorAltaProducto] = useState<string | null>(null);

  const [cantidad, setCantidad] = useState('');
  const [bultos, setBultos] = useState('');
  const [contenidoPorBulto, setContenidoPorBulto] = useState('');
  const totalCalculado =
    bultos && contenidoPorBulto ? Number(bultos) * Number(contenidoPorBulto) : null;

  const [fecha, setFecha] = useState('');
  const [precioCompra, setPrecioCompra] = useState('');
  const [precioVenta, setPrecioVenta] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  function elegirProducto(nombre: string) {
    setNombreProducto(nombre);
    const p = productos.find((x) => x.nombre === nombre);
    setPrecioVenta(p?.precio ?? '');
    setPrecioCompra(p?.precioCompra ?? '');
  }

  /** Alta rápida sin salir de este formulario, para cuando el producto que llegó todavía no está en el vademécum. */
  async function crearProductoRapido() {
    if (!nuevoNombre.trim()) { setErrorAltaProducto('Ingresá un nombre'); return; }
    setErrorAltaProducto(null);
    setCreandoProducto(true);
    try {
      const data: Record<string, unknown> = { nombre: nuevoNombre.trim() };
      if (nuevaUnidad.trim()) data.unidad = nuevaUnidad.trim();
      const creado = await api.crearProducto(sesion, data);
      api.registrarEvento(sesion, 'accion', 'producto-crear');
      onProductoCreado(creado);
      setNombreProducto(creado.nombre);
      setPrecioVenta(creado.precio ?? '');
      setPrecioCompra(creado.precioCompra ?? '');
      setMostrarAltaProducto(false);
      setNuevoNombre('');
      setNuevaUnidad('');
    } catch (err) {
      setErrorAltaProducto(err instanceof Error ? err.message : 'No se pudo crear el producto');
    } finally {
      setCreandoProducto(false);
    }
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!producto) {
      setError('Elegí un producto');
      return;
    }
    if (!cantidad || Number(cantidad) <= 0) {
      setError('Ingresá una cantidad mayor a 0');
      return;
    }
    if (!precioVenta) {
      setError('El precio de venta al cliente es obligatorio');
      return;
    }
    setError(null);
    setGuardando(true);
    try {
      const dataMovimiento: Record<string, unknown> = { productoId: producto.id, tipo: 'compra', cantidad: Number(cantidad) };
      if (fecha) dataMovimiento.fecha = fecha;
      if (observaciones) dataMovimiento.observaciones = observaciones;
      await api.crearMovimientoStock(sesion, dataMovimiento);
      api.registrarEvento(sesion, 'accion', 'stock-ingreso');

      const dataProducto: Record<string, unknown> = { precio: Number(precioVenta) };
      if (precioCompra) dataProducto.precioCompra = Number(precioCompra);
      await api.actualizarProducto(sesion, producto.id, dataProducto);

      let cajaAbiertaAhora = false;
      if (precioCompra && Number(precioCompra) > 0) {
        try {
          const egreso = await api.crearEgreso(sesion, {
            concepto: `Compra a proveedor: ${producto.nombre} (${cantidad}${producto.unidad ? ` ${producto.unidad}` : ''})`,
            monto: Number(precioCompra) * Number(cantidad),
          });
          cajaAbiertaAhora = !!egreso.cajaAbiertaAhora;
        } catch (errEgreso) {
          setError(
            'El ingreso se registró, pero no se pudo cargar el gasto en Caja: ' +
              (errEgreso instanceof Error ? errEgreso.message : 'error'),
          );
          setGuardando(false);
          return;
        }
      }

      onCreado(cajaAbiertaAhora);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="card form-grid" onSubmit={guardar}>
      <label className="span-2">
        Producto
        <SelectorBusqueda
          opciones={productos.map((p) => p.nombre)}
          valor={nombreProducto}
          onCambiar={elegirProducto}
          placeholder="Buscar producto…"
        />
      </label>

      {!producto && (
        mostrarAltaProducto ? (
          <div className="span-2 subform">
            <div className="form-titulo">Producto nuevo</div>
            <label>
              Nombre
              <input value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} autoFocus />
            </label>
            <label>
              Unidad (opcional)
              <input value={nuevaUnidad} onChange={(e) => setNuevaUnidad(e.target.value)} placeholder="Ej: ml, comprimidos, unidad" />
            </label>
            {errorAltaProducto && <div className="alerta span-2">{errorAltaProducto}</div>}
            <div className="span-2" style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn-ghost" disabled={creandoProducto} onClick={crearProductoRapido}>
                {creandoProducto ? 'Creando…' : 'Crear producto'}
              </button>
              <button type="button" className="link" onClick={() => setMostrarAltaProducto(false)}>
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="span-2">
            <button type="button" className="link" onClick={() => setMostrarAltaProducto(true)}>
              ＋ No está en la lista: crear producto nuevo
            </button>
          </div>
        )
      )}

      {producto && (
        <>
          <label>
            Cantidad{producto.unidad ? ` (${producto.unidad})` : ''}
            <input type="number" min="1" step="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)} required />
          </label>
          <label>
            Fecha (opcional)
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </label>

          <div className="span-2 subform">
            <div className="form-titulo">
              ¿Entró en bultos? Calculá la cantidad total en vez de hacer la cuenta a mano
            </div>
            <label>
              Bultos recibidos
              <input
                type="number"
                min="1"
                step="1"
                value={bultos}
                onChange={(e) => setBultos(e.target.value)}
                placeholder="Ej: 4"
              />
            </label>
            <label>
              Contenido por bulto{producto.unidad ? ` (${producto.unidad})` : ''}
              <input
                type="number"
                min="0"
                step="0.01"
                value={contenidoPorBulto}
                onChange={(e) => setContenidoPorBulto(e.target.value)}
                placeholder="Ej: 25"
              />
            </label>
            {totalCalculado !== null && (
              <div className="span-2 sugerencia-dosis">
                Total: <b>{totalCalculado}{producto.unidad ? ` ${producto.unidad}` : ''}</b>{' '}
                <button type="button" className="link" onClick={() => setCantidad(String(totalCalculado))}>
                  Usar esta cantidad
                </button>
              </div>
            )}
          </div>

          <label>
            Precio de compra al proveedor (opcional){producto.unidad ? ` — por ${producto.unidad}` : ''}
            <input
              type="number"
              step="0.01"
              min="0"
              value={precioCompra}
              onChange={(e) => setPrecioCompra(e.target.value)}
              placeholder="Ej: 1000"
            />
          </label>
          <label>
            Precio de venta al cliente{producto.unidad ? ` (por ${producto.unidad})` : ''}
            <input
              type="number"
              step="0.01"
              min="0"
              value={precioVenta}
              onChange={(e) => setPrecioVenta(e.target.value)}
              placeholder="Ej: 1500"
              required
            />
          </label>

          {precioCompra && Number(precioCompra) > 0 && cantidad && Number(cantidad) > 0 && (
            <p className="muted span-2" style={{ margin: 0 }}>
              Esto va a sumar ${(Number(precioCompra) * Number(cantidad)).toFixed(2)} como egreso en Caja.
            </p>
          )}

          <label className="span-2">
            Observaciones (opcional)
            <input value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
          </label>
        </>
      )}

      {error && <div className="alerta span-2">{error}</div>}
      <div className="span-2">
        <button className="btn" type="submit" disabled={guardando || !producto}>
          {guardando ? 'Guardando…' : 'Registrar ingreso'}
        </button>
      </div>
    </form>
  );
}

import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Sesion, Producto, StockItem, MovimientoStock, TipoMovimientoStock } from '../api/types';
import { ExportBar } from '../components/ExportBar';

const ETIQUETAS_TIPO_MOVIMIENTO: Record<TipoMovimientoStock, string> = {
  compra: 'Compra',
  uso: 'Uso',
  vencimiento: 'Vencimiento',
  merma: 'Merma',
  venta: 'Venta (mostrador)',
};

const TIPOS_ALTA = new Set<TipoMovimientoStock>(['compra']);

export function FarmaciaPage({ sesion }: { sesion: Sesion }) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [seleccionado, setSeleccionado] = useState<Producto | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const [prods, st] = await Promise.all([api.productos(sesion), api.stock(sesion)]);
      setProductos(prods);
      setStock(st);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cantidadDe = (productoId: string) => stock.find((s) => s.productoId === productoId)?.cantidad ?? 0;

  if (seleccionado) {
    return (
      <ProductoDetalle
        sesion={sesion}
        producto={seleccionado}
        cantidadInicial={cantidadDe(seleccionado.id)}
        onVolver={() => {
          setSeleccionado(null);
          cargar();
        }}
        onActualizado={(actualizado) => setSeleccionado(actualizado)}
      />
    );
  }

  return (
    <div>
      <div className="page-head">
        <h1>Farmacia</h1>
        <button className="btn" onClick={() => setMostrarForm((v) => !v)}>
          {mostrarForm ? 'Cerrar' : '+ Nuevo producto'}
        </button>
      </div>

      {mostrarForm && (
        <NuevoProductoForm
          sesion={sesion}
          onCreado={() => {
            setMostrarForm(false);
            cargar();
          }}
        />
      )}

      {error && <div className="alerta">{error}</div>}

      {!cargando && productos.length > 0 && (
        <ExportBar
          nombreArchivo="productos-farmacia"
          titulo="Productos"
          columnas={[
            { clave: 'nombre', etiqueta: 'Nombre' },
            { clave: 'presentacion', etiqueta: 'Presentación', valor: (p: Producto) => p.presentacion ?? '—' },
            { clave: 'categoria', etiqueta: 'Categoría', valor: (p: Producto) => p.categoria ?? '—' },
            {
              clave: 'stock',
              etiqueta: 'Stock',
              valor: (p: Producto) => `${cantidadDe(p.id)}${p.unidad ? ` ${p.unidad}` : ''}`,
            },
          ]}
          filas={productos}
        />
      )}

      {cargando ? (
        <p className="muted">Cargando…</p>
      ) : productos.length === 0 ? (
        <p className="muted">Todavía no hay productos. Creá el primero con "+ Nuevo producto".</p>
      ) : (
        <div className="card">
          <table className="tabla">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Presentación</th>
                <th>Categoría</th>
                <th>Stock</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {productos.map((p) => (
                <tr key={p.id}>
                  <td>{p.nombre}</td>
                  <td>{p.presentacion ?? '—'}</td>
                  <td>{p.categoria ?? '—'}</td>
                  <td>{cantidadDe(p.id)}{p.unidad ? ` ${p.unidad}` : ''}</td>
                  <td>
                    <button className="link" onClick={() => setSeleccionado(p)}>
                      Ver →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function NuevoProductoForm({ sesion, onCreado }: { sesion: Sesion; onCreado: () => void }) {
  const [nombre, setNombre] = useState('');
  const [presentacion, setPresentacion] = useState('');
  const [unidad, setUnidad] = useState('');
  const [categoria, setCategoria] = useState('');
  const [concentracion, setConcentracion] = useState('');
  const [unidadConcentracion, setUnidadConcentracion] = useState('');
  const [dosisSugeridaMgKg, setDosisSugeridaMgKg] = useState('');
  const [precio, setPrecio] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      const data: Record<string, unknown> = { nombre };
      if (presentacion) data.presentacion = presentacion;
      if (unidad) data.unidad = unidad;
      if (categoria) data.categoria = categoria;
      if (concentracion) data.concentracion = Number(concentracion);
      if (unidadConcentracion) data.unidadConcentracion = unidadConcentracion;
      if (dosisSugeridaMgKg) data.dosisSugeridaMgKg = Number(dosisSugeridaMgKg);
      if (precio) data.precio = Number(precio);
      await api.crearProducto(sesion, data);
      onCreado();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="card form-grid" onSubmit={guardar}>
      <label className="span-2">
        Nombre
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
      </label>
      <label>
        Presentación (opcional)
        <input value={presentacion} onChange={(e) => setPresentacion(e.target.value)} placeholder="Ej: frasco 50ml" />
      </label>
      <label>
        Unidad (opcional)
        <input value={unidad} onChange={(e) => setUnidad(e.target.value)} placeholder="Ej: ml, comprimidos, dosis" />
      </label>
      <label className="span-2">
        Categoría (opcional)
        <input value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Ej: antibiótico, antiparasitario" />
      </label>
      <label>
        Concentración (opcional)
        <input
          type="number"
          step="0.001"
          min="0"
          value={concentracion}
          onChange={(e) => setConcentracion(e.target.value)}
          placeholder="Ej: 50"
        />
      </label>
      <label>
        Unidad de concentración
        <input
          value={unidadConcentracion}
          onChange={(e) => setUnidadConcentracion(e.target.value)}
          placeholder="Ej: mg/ml"
        />
      </label>
      <label>
        Dosis sugerida (mg/kg, para la calculadora de indicaciones)
        <input
          type="number"
          step="0.001"
          min="0"
          value={dosisSugeridaMgKg}
          onChange={(e) => setDosisSugeridaMgKg(e.target.value)}
          placeholder="Ej: 5"
        />
      </label>
      <label>
        Precio de venta (opcional, para cobrarlo en Caja)
        <input
          type="number"
          step="0.01"
          min="0"
          value={precio}
          onChange={(e) => setPrecio(e.target.value)}
          placeholder="Ej: 1500"
        />
      </label>
      {error && <div className="alerta span-2">{error}</div>}
      <div className="span-2">
        <button className="btn" type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar producto'}
        </button>
      </div>
    </form>
  );
}

function ProductoDetalle({
  sesion,
  producto,
  cantidadInicial,
  onVolver,
  onActualizado,
}: {
  sesion: Sesion;
  producto: Producto;
  cantidadInicial: number;
  onVolver: () => void;
  onActualizado: (p: Producto) => void;
}) {
  const [cantidad, setCantidad] = useState(String(cantidadInicial));
  const [movimientos, setMovimientos] = useState<MovimientoStock[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const [mostrarMovimiento, setMostrarMovimiento] = useState(false);
  const [guardandoStock, setGuardandoStock] = useState(false);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      setMovimientos(await api.movimientosStock(sesion, producto.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
    setCantidad(String(cantidadInicial));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [producto.id]);

  const cambioStock = Number(cantidad) !== cantidadInicial;

  async function guardarStock() {
    setGuardandoStock(true);
    try {
      await api.fijarStock(sesion, producto.id, Number(cantidad));
      cargar();
    } catch (err) {
      alert('No se pudo guardar: ' + (err instanceof Error ? err.message : 'error'));
    } finally {
      setGuardandoStock(false);
    }
  }

  return (
    <div>
      <button className="link" onClick={onVolver}>
        ← Volver a productos
      </button>

      <div className="page-head">
        <h1>{producto.nombre}</h1>
        <button className="btn-ghost" onClick={() => setEditando((v) => !v)}>
          {editando ? 'Cerrar' : 'Editar'}
        </button>
      </div>

      {editando ? (
        <EditarProductoForm
          sesion={sesion}
          producto={producto}
          onGuardado={(actualizado) => {
            onActualizado(actualizado);
            setEditando(false);
          }}
          onCancelar={() => setEditando(false)}
        />
      ) : (
        <div className="card ficha-datos">
          <Dato etiqueta="Presentación" valor={producto.presentacion ?? '—'} />
          <Dato etiqueta="Unidad" valor={producto.unidad ?? '—'} />
          <Dato etiqueta="Categoría" valor={producto.categoria ?? '—'} />
          <Dato
            etiqueta="Concentración"
            valor={producto.concentracion ? `${producto.concentracion} ${producto.unidadConcentracion ?? ''}`.trim() : '—'}
          />
          <Dato etiqueta="Dosis sugerida" valor={producto.dosisSugeridaMgKg ? `${producto.dosisSugeridaMgKg} mg/kg` : '—'} />
          <Dato etiqueta="Precio de venta" valor={producto.precio ? `$${producto.precio}` : '—'} />
        </div>
      )}

      <div className="page-head">
        <h2>Stock</h2>
      </div>
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <input
          type="number"
          min="0"
          step="1"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          style={{ maxWidth: '8rem' }}
        />
        {producto.unidad && <span className="muted">{producto.unidad}</span>}
        <button className="link" onClick={guardarStock} disabled={!cambioStock || guardandoStock}>
          {guardandoStock ? 'Guardando…' : 'Guardar corrección'}
        </button>
      </div>

      <div className="page-head">
        <h2>Movimientos</h2>
        <button className="btn" onClick={() => setMostrarMovimiento((v) => !v)}>
          {mostrarMovimiento ? 'Cerrar' : '+ Nuevo movimiento'}
        </button>
      </div>

      {mostrarMovimiento && (
        <NuevoMovimientoForm
          sesion={sesion}
          producto={producto}
          onCreado={() => {
            setMostrarMovimiento(false);
            cargar();
            api.stock(sesion).then((st) => {
              const item = st.find((s) => s.productoId === producto.id);
              if (item) setCantidad(String(item.cantidad));
            });
          }}
        />
      )}

      {error && <div className="alerta">{error}</div>}
      {!cargando && movimientos.length > 0 && (
        <ExportBar
          nombreArchivo={`movimientos-${producto.nombre}`}
          titulo={`Movimientos — ${producto.nombre}`}
          columnas={[
            { clave: 'fecha', etiqueta: 'Fecha' },
            { clave: 'tipo', etiqueta: 'Tipo', valor: (m: MovimientoStock) => ETIQUETAS_TIPO_MOVIMIENTO[m.tipo] },
            {
              clave: 'cantidad',
              etiqueta: 'Cantidad',
              valor: (m: MovimientoStock) => `${TIPOS_ALTA.has(m.tipo) ? '+' : '−'}${m.cantidad}`,
            },
            { clave: 'observaciones', etiqueta: 'Observaciones', valor: (m: MovimientoStock) => m.observaciones ?? '—' },
          ]}
          filas={movimientos}
        />
      )}
      {!cargando && (
        movimientos.length === 0 ? (
          <p className="muted">Todavía no hay movimientos registrados para este producto.</p>
        ) : (
          <div className="card">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Cantidad</th>
                  <th>Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map((m) => {
                  const signo = TIPOS_ALTA.has(m.tipo) ? '+' : '−';
                  return (
                    <tr key={m.id}>
                      <td>{m.fecha}</td>
                      <td>{ETIQUETAS_TIPO_MOVIMIENTO[m.tipo]}</td>
                      <td>{signo}{m.cantidad}</td>
                      <td>{m.observaciones ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}

function NuevoMovimientoForm({
  sesion,
  producto,
  onCreado,
}: {
  sesion: Sesion;
  producto: Producto;
  onCreado: () => void;
}) {
  const [tipo, setTipo] = useState<TipoMovimientoStock>('compra');
  const [cantidad, setCantidad] = useState('');
  const [fecha, setFecha] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!cantidad || Number(cantidad) <= 0) {
      setError('Ingresá una cantidad mayor a 0');
      return;
    }
    setError(null);
    setGuardando(true);
    try {
      const data: Record<string, unknown> = { productoId: producto.id, tipo, cantidad: Number(cantidad) };
      if (fecha) data.fecha = fecha;
      if (observaciones) data.observaciones = observaciones;
      await api.crearMovimientoStock(sesion, data);
      onCreado();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="card form-grid" onSubmit={guardar}>
      <label>
        Tipo
        <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoMovimientoStock)}>
          {(Object.keys(ETIQUETAS_TIPO_MOVIMIENTO) as TipoMovimientoStock[]).map((t) => (
            <option key={t} value={t}>
              {ETIQUETAS_TIPO_MOVIMIENTO[t]}
            </option>
          ))}
        </select>
      </label>
      <label>
        Cantidad{producto.unidad ? ` (${producto.unidad})` : ''}
        <input type="number" min="1" step="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)} required />
      </label>
      <label>
        Fecha (opcional)
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
      </label>
      <label className="span-2">
        Observaciones (opcional)
        <input value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
      </label>
      {error && <div className="alerta span-2">{error}</div>}
      <div className="span-2">
        <button className="btn" type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar movimiento'}
        </button>
      </div>
    </form>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="dato">
      <span className="dato-label">{etiqueta}</span>
      <span>{valor}</span>
    </div>
  );
}

function EditarProductoForm({
  sesion,
  producto,
  onGuardado,
  onCancelar,
}: {
  sesion: Sesion;
  producto: Producto;
  onGuardado: (p: Producto) => void;
  onCancelar: () => void;
}) {
  const [nombre, setNombre] = useState(producto.nombre);
  const [presentacion, setPresentacion] = useState(producto.presentacion ?? '');
  const [unidad, setUnidad] = useState(producto.unidad ?? '');
  const [categoria, setCategoria] = useState(producto.categoria ?? '');
  const [concentracion, setConcentracion] = useState(producto.concentracion ?? '');
  const [unidadConcentracion, setUnidadConcentracion] = useState(producto.unidadConcentracion ?? '');
  const [dosisSugeridaMgKg, setDosisSugeridaMgKg] = useState(producto.dosisSugeridaMgKg ?? '');
  const [precio, setPrecio] = useState(producto.precio ?? '');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      const data: Record<string, unknown> = { nombre };
      if (presentacion) data.presentacion = presentacion;
      if (unidad) data.unidad = unidad;
      if (categoria) data.categoria = categoria;
      data.concentracion = concentracion ? Number(concentracion) : undefined;
      data.unidadConcentracion = unidadConcentracion || undefined;
      data.dosisSugeridaMgKg = dosisSugeridaMgKg ? Number(dosisSugeridaMgKg) : undefined;
      data.precio = precio ? Number(precio) : undefined;
      const actualizado = await api.actualizarProducto(sesion, producto.id, data);
      onGuardado(actualizado);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="card form-grid" onSubmit={guardar}>
      <label className="span-2">
        Nombre
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
      </label>
      <label>
        Presentación
        <input value={presentacion} onChange={(e) => setPresentacion(e.target.value)} />
      </label>
      <label>
        Unidad
        <input value={unidad} onChange={(e) => setUnidad(e.target.value)} />
      </label>
      <label className="span-2">
        Categoría
        <input value={categoria} onChange={(e) => setCategoria(e.target.value)} />
      </label>
      <label>
        Concentración
        <input
          type="number"
          step="0.001"
          min="0"
          value={concentracion}
          onChange={(e) => setConcentracion(e.target.value)}
        />
      </label>
      <label>
        Unidad de concentración
        <input value={unidadConcentracion} onChange={(e) => setUnidadConcentracion(e.target.value)} placeholder="Ej: mg/ml" />
      </label>
      <label>
        Dosis sugerida (mg/kg)
        <input
          type="number"
          step="0.001"
          min="0"
          value={dosisSugeridaMgKg}
          onChange={(e) => setDosisSugeridaMgKg(e.target.value)}
        />
      </label>
      <label>
        Precio de venta
        <input type="number" step="0.01" min="0" value={precio} onChange={(e) => setPrecio(e.target.value)} />
      </label>
      {error && <div className="alerta span-2">{error}</div>}
      <div className="span-2 acciones">
        <button className="btn" type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </button>
        <button className="btn-ghost" type="button" onClick={onCancelar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

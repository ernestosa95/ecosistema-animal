import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Sesion, Producto, StockItem, MovimientoStock, TipoMovimientoStock } from '../api/types';
import { SelectorBusqueda } from '../components/SelectorBusqueda';

const ETIQUETAS_TIPO_MOVIMIENTO: Record<TipoMovimientoStock, string> = {
  compra: 'Compra',
  uso: 'Uso',
  vencimiento: 'Vencimiento',
  merma: 'Merma',
  venta: 'Venta (mostrador)',
};

const TIPOS_ALTA = new Set<TipoMovimientoStock>(['compra']);

// Listas cerradas (§ pedido del usuario: la categoría/unidad/presentación no
// pueden quedar como texto libre — el operador elige de una lista fija, no
// tipea). El campo sigue siendo texto plano en el backend (sin migración,
// ver database/schema/farmacia.ts) — el cierre es sólo en el formulario.
const CATEGORIAS = [
  'Antibiótico',
  'Antiparasitario',
  'Antiinflamatorio',
  'Analgésico',
  'Vacuna',
  'Vitamina / suplemento',
  'Anestésico',
  'Dermatológico',
  'Otro medicamento',
  'Alimento',
  'Accesorios',
  'Forraje',
  'Higiene y cuidado',
  'Otro',
] as const;

const UNIDADES = ['ml', 'mg', 'comprimidos', 'dosis', 'kg', 'g', 'litros', 'unidad'] as const;

const PRESENTACIONES = [
  'Frasco',
  'Caja',
  'Blister',
  'Ampolla',
  'Sachet',
  'Bolsa',
  'Sobre',
  'Bidón',
  'Unidad suelta',
] as const;

export function FarmaciaPage({ sesion }: { sesion: Sesion }) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [seleccionado, setSeleccionado] = useState<Producto | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [mostrarIngreso, setMostrarIngreso] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState('');

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

  // Categorías realmente en uso, para el filtro y las sugerencias del alta —
  // no hay un catálogo fijo (farmacia + alimento/accesorios/forraje conviven
  // en el mismo stock, ver comentario del schema), así que se derivan de lo
  // que ya se cargó.
  const categorias = [...new Set(productos.map((p) => p.categoria).filter((c): c is string => !!c))].sort();
  const productosFiltrados = filtroCategoria
    ? productos.filter((p) => p.categoria === filtroCategoria)
    : productos;

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
        <h1>Farmacia y stock</h1>
        <div className="acciones">
          <button
            className="btn-ghost"
            onClick={() => {
              setMostrarIngreso((v) => !v);
              setMostrarForm(false);
            }}
          >
            {mostrarIngreso ? 'Cerrar' : '+ Ingresos'}
          </button>
          <button
            className="btn"
            onClick={() => {
              setMostrarForm((v) => !v);
              setMostrarIngreso(false);
            }}
          >
            {mostrarForm ? 'Cerrar' : '+ Nuevo producto'}
          </button>
        </div>
      </div>
      <p className="muted">
        Vademécum y también el resto del stock de mostrador — alimento, accesorios, forraje, lo que sea que se venda o se use.
      </p>

      {mostrarForm && (
        <NuevoProductoForm
          sesion={sesion}
          onCreado={() => {
            setMostrarForm(false);
            cargar();
          }}
        />
      )}

      {mostrarIngreso && (
        <IngresoForm
          sesion={sesion}
          productos={productos}
          onCreado={() => {
            setMostrarIngreso(false);
            cargar();
          }}
        />
      )}

      {error && <div className="alerta">{error}</div>}

      {!cargando && categorias.length > 1 && (
        <label className="filtro-categoria">
          Categoría
          <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
            <option value="">Todas</option>
            {categorias.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      )}

      {cargando ? (
        <p className="muted">Cargando…</p>
      ) : productos.length === 0 ? (
        <p className="muted">Todavía no hay productos. Creá el primero con "+ Nuevo producto".</p>
      ) : productosFiltrados.length === 0 ? (
        <p className="muted">Sin productos en la categoría "{filtroCategoria}".</p>
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
              {productosFiltrados.map((p) => (
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
  const [esMedicamento, setEsMedicamento] = useState(false);
  const [esFraccionable, setEsFraccionable] = useState(false);
  const [concentracion, setConcentracion] = useState('');
  const [unidadConcentracion, setUnidadConcentracion] = useState('');
  const [dosisSugeridaMgKg, setDosisSugeridaMgKg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      const data: Record<string, unknown> = { nombre, esMedicamento, esFraccionable };
      if (presentacion) data.presentacion = presentacion;
      if (unidad) data.unidad = unidad;
      if (categoria) data.categoria = categoria;
      if (esMedicamento && concentracion) data.concentracion = Number(concentracion);
      if (esMedicamento && unidadConcentracion) data.unidadConcentracion = unidadConcentracion;
      if (esMedicamento && dosisSugeridaMgKg) data.dosisSugeridaMgKg = Number(dosisSugeridaMgKg);
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
        <select value={presentacion} onChange={(e) => setPresentacion(e.target.value)}>
          <option value="">Sin especificar</option>
          {PRESENTACIONES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>
      <label>
        Unidad (opcional)
        <select value={unidad} onChange={(e) => setUnidad(e.target.value)}>
          <option value="">Sin especificar</option>
          {UNIDADES.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </label>
      <label className="span-2">
        Categoría (opcional)
        <SelectorBusqueda
          opciones={CATEGORIAS}
          valor={categoria}
          onCambiar={setCategoria}
          placeholder="Buscar categoría…"
        />
      </label>

      <div className="span-2 check-fila">
        <label>
          <input type="checkbox" checked={esMedicamento} onChange={(e) => setEsMedicamento(e.target.checked)} />
          Es medicamento
        </label>
        <label>
          <input type="checkbox" checked={esFraccionable} onChange={(e) => setEsFraccionable(e.target.checked)} />
          Es fraccionable (se vende/usa por porciones de un bulto, ej. kg de una bolsa)
        </label>
      </div>

      {esMedicamento && (
        <div className="span-2 subform">
          <div className="form-titulo">Datos para la calculadora de dosificación (opcional)</div>
          <label>
            Concentración
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
          <label className="span-2">
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
        </div>
      )}

      <p className="muted span-2">
        El precio se carga desde "+ Ingresos", al registrar la primera entrada de stock.
      </p>
      {error && <div className="alerta span-2">{error}</div>}
      <div className="span-2">
        <button className="btn" type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar producto'}
        </button>
      </div>
    </form>
  );
}

/**
 * "+ Ingresos": alta de stock para un producto ya existente, sin tener que
 * entrar a su ficha — el flujo de mostrador más común (llega mercadería,
 * se carga cantidad + precios de una). Crea el movimiento 'compra' y de
 * paso actualiza el precio de venta/costo del producto (ver comentario del
 * schema: esos campos se completan típicamente desde acá, no en el alta).
 */
function IngresoForm({
  sesion,
  productos,
  onCreado,
}: {
  sesion: Sesion;
  productos: Producto[];
  onCreado: () => void;
}) {
  const [nombreProducto, setNombreProducto] = useState('');
  const producto = productos.find((p) => p.nombre === nombreProducto) ?? null;

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

      const dataProducto: Record<string, unknown> = { precio: Number(precioVenta) };
      if (precioCompra) dataProducto.precioCompra = Number(precioCompra);
      await api.actualizarProducto(sesion, producto.id, dataProducto);

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
        Producto
        <SelectorBusqueda
          opciones={productos.map((p) => p.nombre)}
          valor={nombreProducto}
          onCambiar={elegirProducto}
          placeholder="Buscar producto…"
        />
      </label>

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
        <div className="card ficha-datos ficha-datos-compacta">
          <Dato etiqueta="Presentación" valor={producto.presentacion ?? '—'} />
          <Dato etiqueta="Unidad" valor={producto.unidad ?? '—'} />
          <Dato etiqueta="Categoría" valor={producto.categoria ?? '—'} />
          <Dato etiqueta="Medicamento" valor={producto.esMedicamento ? 'Sí' : 'No'} />
          <Dato etiqueta="Fraccionable" valor={producto.esFraccionable ? 'Sí' : 'No'} />
          <Dato
            etiqueta="Concentración"
            valor={producto.concentracion ? `${producto.concentracion} ${producto.unidadConcentracion ?? ''}`.trim() : '—'}
          />
          <Dato etiqueta="Dosis sugerida" valor={producto.dosisSugeridaMgKg ? `${producto.dosisSugeridaMgKg} mg/kg` : '—'} />
          <Dato
            etiqueta="Precio de compra"
            valor={producto.precioCompra ? `$${producto.precioCompra}${producto.unidad ? ` / ${producto.unidad}` : ''}` : '—'}
          />
          <Dato
            etiqueta="Precio de venta"
            valor={producto.precio ? `$${producto.precio}${producto.unidad ? ` / ${producto.unidad}` : ''}` : '—'}
          />
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

  // Calculadora de bultos (F: compra en bulto, venta/uso fraccionado — ej.
  // entran 4 bolsas de 25kg cada una, después se va vendiendo de a 1-2kg).
  // Sólo afecta la carga: el stock siempre se lleva en la unidad de venta
  // del producto (kg), nunca en "bolsas" — así una compra de bultos y una
  // venta fraccionada descuentan del mismo número.
  const [bultos, setBultos] = useState('');
  const [contenidoPorBulto, setContenidoPorBulto] = useState('');
  const totalCalculado =
    bultos && contenidoPorBulto ? Number(bultos) * Number(contenidoPorBulto) : null;

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

      {tipo === 'compra' && (
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
      )}

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
  const [esMedicamento, setEsMedicamento] = useState(producto.esMedicamento);
  const [esFraccionable, setEsFraccionable] = useState(producto.esFraccionable);
  const [concentracion, setConcentracion] = useState(producto.concentracion ?? '');
  const [unidadConcentracion, setUnidadConcentracion] = useState(producto.unidadConcentracion ?? '');
  const [dosisSugeridaMgKg, setDosisSugeridaMgKg] = useState(producto.dosisSugeridaMgKg ?? '');
  const [precio, setPrecio] = useState(producto.precio ?? '');
  const [precioCompra, setPrecioCompra] = useState(producto.precioCompra ?? '');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      const data: Record<string, unknown> = { nombre, esMedicamento, esFraccionable };
      if (presentacion) data.presentacion = presentacion;
      if (unidad) data.unidad = unidad;
      if (categoria) data.categoria = categoria;
      data.concentracion = esMedicamento && concentracion ? Number(concentracion) : undefined;
      data.unidadConcentracion = esMedicamento ? unidadConcentracion || undefined : undefined;
      data.dosisSugeridaMgKg = esMedicamento && dosisSugeridaMgKg ? Number(dosisSugeridaMgKg) : undefined;
      data.precio = precio ? Number(precio) : undefined;
      data.precioCompra = precioCompra ? Number(precioCompra) : undefined;
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
        <select value={presentacion} onChange={(e) => setPresentacion(e.target.value)}>
          <option value="">Sin especificar</option>
          {/* Si el producto ya tenía un valor previo a la lista cerrada, se conserva como opción para no perderlo al editar. */}
          {presentacion && !(PRESENTACIONES as readonly string[]).includes(presentacion) && (
            <option value={presentacion}>{presentacion}</option>
          )}
          {PRESENTACIONES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>
      <label>
        Unidad
        <select value={unidad} onChange={(e) => setUnidad(e.target.value)}>
          <option value="">Sin especificar</option>
          {unidad && !(UNIDADES as readonly string[]).includes(unidad) && <option value={unidad}>{unidad}</option>}
          {UNIDADES.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </label>
      <label className="span-2">
        Categoría
        <SelectorBusqueda
          opciones={categoria && !(CATEGORIAS as readonly string[]).includes(categoria) ? [categoria, ...CATEGORIAS] : CATEGORIAS}
          valor={categoria}
          onCambiar={setCategoria}
          placeholder="Buscar categoría…"
        />
      </label>

      <div className="span-2 check-fila">
        <label>
          <input type="checkbox" checked={esMedicamento} onChange={(e) => setEsMedicamento(e.target.checked)} />
          Es medicamento
        </label>
        <label>
          <input type="checkbox" checked={esFraccionable} onChange={(e) => setEsFraccionable(e.target.checked)} />
          Es fraccionable (se vende/usa por porciones de un bulto, ej. kg de una bolsa)
        </label>
      </div>

      {esMedicamento && (
        <div className="span-2 subform">
          <div className="form-titulo">Datos para la calculadora de dosificación (opcional)</div>
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
          <label className="span-2">
            Dosis sugerida (mg/kg)
            <input
              type="number"
              step="0.001"
              min="0"
              value={dosisSugeridaMgKg}
              onChange={(e) => setDosisSugeridaMgKg(e.target.value)}
            />
          </label>
        </div>
      )}

      <label>
        Precio de compra al proveedor (opcional){unidad ? ` — por ${unidad}` : ''}
        <input type="number" step="0.01" min="0" value={precioCompra} onChange={(e) => setPrecioCompra(e.target.value)} />
      </label>
      <label>
        Precio de venta{unidad ? ` (por ${unidad})` : ''}
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

import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Sesion, Establecimiento, Existencia, CategoriaHacienda, Movimiento, TipoMovimiento, Evento, TipoEvento } from '../api/types';
import { ExportBar } from '../components/ExportBar';

const ETIQUETAS_CATEGORIA: Record<CategoriaHacienda, string> = {
  vaca: 'Vacas',
  toro: 'Toros',
  ternero: 'Terneros',
  ternera: 'Terneras',
  vaquillona: 'Vaquillonas',
  novillo: 'Novillos',
};

const ETIQUETAS_TIPO_MOVIMIENTO: Record<TipoMovimiento, string> = {
  nacimiento: 'Nacimiento',
  compra: 'Compra',
  muerte: 'Muerte',
  venta: 'Venta',
  traslado: 'Traslado',
};

const TIPOS_ALTA = new Set<TipoMovimiento>(['nacimiento', 'compra']);
const TIPOS_BAJA = new Set<TipoMovimiento>(['muerte', 'venta']);

const ETIQUETAS_TIPO_EVENTO: Record<TipoEvento, string> = {
  vacunacion: 'Vacunación',
  desparasitacion: 'Desparasitación',
  tratamiento: 'Tratamiento',
  servicio: 'Servicio (inseminación/monta)',
  diagnostico_prenez: 'Diagnóstico de preñez',
  destete: 'Destete',
};

const CATEGORIAS: CategoriaHacienda[] = ['vaca', 'toro', 'ternero', 'ternera', 'vaquillona', 'novillo'];

/** F1.6: matriz de stock — establecimientos x categorías, con totales por fila y columna. */
function ResumenConsolidado({
  establecimientos,
  existencias,
}: {
  establecimientos: Establecimiento[];
  existencias: { establecimientoId: string; categoria: CategoriaHacienda; cantidad: number }[];
}) {
  const porEstablecimiento = new Map<string, Map<CategoriaHacienda, number>>();
  for (const ex of existencias) {
    if (!porEstablecimiento.has(ex.establecimientoId)) porEstablecimiento.set(ex.establecimientoId, new Map());
    porEstablecimiento.get(ex.establecimientoId)!.set(ex.categoria, ex.cantidad);
  }

  const totalesColumna: Record<CategoriaHacienda, number> = {
    vaca: 0, toro: 0, ternero: 0, ternera: 0, vaquillona: 0, novillo: 0,
  };
  let granTotal = 0;

  const filas = establecimientos.map((e) => {
    const porCategoria = porEstablecimiento.get(e.id) ?? new Map<CategoriaHacienda, number>();
    let totalFila = 0;
    const valores = CATEGORIAS.map((c) => {
      const v = porCategoria.get(c) ?? 0;
      totalesColumna[c] += v;
      totalFila += v;
      return v;
    });
    granTotal += totalFila;
    return { establecimiento: e, valores, totalFila };
  });

  return (
    <div className="card" style={{ overflowX: 'auto' }}>
      <div className="form-titulo">Stock consolidado</div>
      <table className="tabla">
        <thead>
          <tr>
            <th>Establecimiento</th>
            {CATEGORIAS.map((c) => (
              <th key={c}>{ETIQUETAS_CATEGORIA[c]}</th>
            ))}
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {filas.map(({ establecimiento, valores, totalFila }) => (
            <tr key={establecimiento.id}>
              <td>{establecimiento.nombre}</td>
              {valores.map((v, i) => (
                <td key={CATEGORIAS[i]}>{v}</td>
              ))}
              <td><b>{totalFila}</b></td>
            </tr>
          ))}
          <tr>
            <td><b>Total</b></td>
            {CATEGORIAS.map((c) => (
              <td key={c}><b>{totalesColumna[c]}</b></td>
            ))}
            <td><b>{granTotal}</b></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function TroperaPage({ sesion }: { sesion: Sesion }) {
  const [establecimientos, setEstablecimientos] = useState<Establecimiento[]>([]);
  const [existenciasTodas, setExistenciasTodas] = useState<
    { establecimientoId: string; categoria: CategoriaHacienda; cantidad: number }[]
  >([]);
  const [seleccionado, setSeleccionado] = useState<Establecimiento | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const [ests, ex] = await Promise.all([
        api.establecimientos(sesion),
        api.existenciasConsolidadas(sesion),
      ]);
      setEstablecimientos(ests);
      setExistenciasTodas(ex);
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

  if (seleccionado) {
    return (
      <EstablecimientoDetalle
        sesion={sesion}
        establecimiento={seleccionado}
        establecimientos={establecimientos}
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
        <h1>Tropera</h1>
        <button className="btn" onClick={() => setMostrarForm((v) => !v)}>
          {mostrarForm ? 'Cerrar' : '+ Nuevo establecimiento'}
        </button>
      </div>

      {mostrarForm && (
        <NuevoEstablecimientoForm
          sesion={sesion}
          onCreado={() => {
            setMostrarForm(false);
            cargar();
          }}
        />
      )}

      {error && <div className="alerta">{error}</div>}

      {!cargando && establecimientos.length > 1 && (
        <ResumenConsolidado establecimientos={establecimientos} existencias={existenciasTodas} />
      )}

      {!cargando && establecimientos.length > 0 && (
        <ExportBar
          nombreArchivo="establecimientos"
          titulo="Establecimientos"
          columnas={[
            { clave: 'nombre', etiqueta: 'Nombre' },
            { clave: 'ubicacion', etiqueta: 'Ubicación', valor: (e: Establecimiento) => e.ubicacion ?? '—' },
            {
              clave: 'superficie',
              etiqueta: 'Superficie',
              valor: (e: Establecimiento) => (e.superficieHa ? `${e.superficieHa} ha` : '—'),
            },
          ]}
          filas={establecimientos}
        />
      )}

      {cargando ? (
        <p className="muted">Cargando…</p>
      ) : establecimientos.length === 0 ? (
        <p className="muted">Todavía no hay establecimientos. Creá el primero con "+ Nuevo establecimiento".</p>
      ) : (
        <div className="card">
          <table className="tabla">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Ubicación</th>
                <th>Superficie</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {establecimientos.map((e) => (
                <tr key={e.id}>
                  <td>{e.nombre}</td>
                  <td>{e.ubicacion ?? '—'}</td>
                  <td>{e.superficieHa ? `${e.superficieHa} ha` : '—'}</td>
                  <td>
                    <button className="link" onClick={() => setSeleccionado(e)}>
                      Ver hacienda →
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

function NuevoEstablecimientoForm({
  sesion,
  onCreado,
}: {
  sesion: Sesion;
  onCreado: () => void;
}) {
  const [nombre, setNombre] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [superficieHa, setSuperficieHa] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      const data: Record<string, unknown> = { nombre };
      if (ubicacion) data.ubicacion = ubicacion;
      if (superficieHa) data.superficieHa = Number(superficieHa);
      await api.crearEstablecimiento(sesion, data);
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
        Ubicación (opcional)
        <input value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} placeholder="Ruta, localidad…" />
      </label>
      <label>
        Superficie en hectáreas (opcional)
        <input
          type="number"
          step="0.1"
          min="0"
          value={superficieHa}
          onChange={(e) => setSuperficieHa(e.target.value)}
        />
      </label>
      {error && <div className="alerta span-2">{error}</div>}
      <div className="span-2">
        <button className="btn" type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar establecimiento'}
        </button>
      </div>
    </form>
  );
}

function EstablecimientoDetalle({
  sesion,
  establecimiento,
  establecimientos,
  onVolver,
  onActualizado,
}: {
  sesion: Sesion;
  establecimiento: Establecimiento;
  establecimientos: Establecimiento[];
  onVolver: () => void;
  onActualizado: (e: Establecimiento) => void;
}) {
  const [existencias, setExistencias] = useState<Existencia[]>([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const [mostrarMovimiento, setMostrarMovimiento] = useState(false);
  const [mostrarEvento, setMostrarEvento] = useState(false);

  const nombreDe = (id?: string | null) =>
    id ? establecimientos.find((e) => e.id === id)?.nombre ?? '—' : '—';

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const [ex, mov, ev] = await Promise.all([
        api.existenciasDeEstablecimiento(sesion, establecimiento.id),
        api.movimientos(sesion, establecimiento.id),
        api.eventos(sesion, establecimiento.id),
      ]);
      setExistencias(ex);
      setMovimientos(mov);
      setEventos(ev);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [establecimiento.id]);

  return (
    <div>
      <button className="link" onClick={onVolver}>
        ← Volver a establecimientos
      </button>

      <div className="page-head">
        <h1>{establecimiento.nombre}</h1>
        <button className="btn-ghost" onClick={() => setEditando((v) => !v)}>
          {editando ? 'Cerrar' : 'Editar'}
        </button>
      </div>

      {editando ? (
        <EditarEstablecimientoForm
          sesion={sesion}
          establecimiento={establecimiento}
          onGuardado={(actualizado) => {
            onActualizado(actualizado);
            setEditando(false);
          }}
          onCancelar={() => setEditando(false)}
        />
      ) : (
        <div className="card ficha-datos">
          <Dato etiqueta="Ubicación" valor={establecimiento.ubicacion ?? '—'} />
          <Dato etiqueta="Superficie" valor={establecimiento.superficieHa ? `${establecimiento.superficieHa} ha` : '—'} />
        </div>
      )}

      <div className="page-head">
        <h2>Hacienda</h2>
      </div>

      {error && <div className="alerta">{error}</div>}
      {!cargando && existencias.length > 0 && (
        <ExportBar
          nombreArchivo={`existencias-${establecimiento.nombre}`}
          titulo={`Existencias — ${establecimiento.nombre}`}
          columnas={[
            { clave: 'categoria', etiqueta: 'Categoría', valor: (e: Existencia) => ETIQUETAS_CATEGORIA[e.categoria] },
            { clave: 'cantidad', etiqueta: 'Cantidad' },
          ]}
          filas={existencias}
        />
      )}
      {cargando ? (
        <p className="muted">Cargando…</p>
      ) : (
        <div className="card">
          <table className="tabla">
            <thead>
              <tr>
                <th>Categoría</th>
                <th>Cantidad</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {existencias.map((ex) => (
                <FilaExistencia
                  key={ex.categoria}
                  sesion={sesion}
                  establecimientoId={establecimiento.id}
                  existencia={ex}
                  onGuardada={(nueva) =>
                    setExistencias((prev) =>
                      prev.map((e) => (e.categoria === nueva.categoria ? nueva : e)),
                    )
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="page-head">
        <h2>Movimientos</h2>
        <button className="btn" onClick={() => setMostrarMovimiento((v) => !v)}>
          {mostrarMovimiento ? 'Cerrar' : '+ Nuevo movimiento'}
        </button>
      </div>

      {mostrarMovimiento && (
        <NuevoMovimientoForm
          sesion={sesion}
          establecimiento={establecimiento}
          otrosEstablecimientos={establecimientos.filter((e) => e.id !== establecimiento.id)}
          onCreado={() => {
            setMostrarMovimiento(false);
            cargar();
          }}
        />
      )}

      {!cargando && movimientos.length > 0 && (
        <ExportBar
          nombreArchivo={`movimientos-${establecimiento.nombre}`}
          titulo={`Movimientos — ${establecimiento.nombre}`}
          columnas={[
            { clave: 'fecha', etiqueta: 'Fecha' },
            { clave: 'tipo', etiqueta: 'Tipo', valor: (m: Movimiento) => ETIQUETAS_TIPO_MOVIMIENTO[m.tipo] },
            { clave: 'categoria', etiqueta: 'Categoría', valor: (m: Movimiento) => ETIQUETAS_CATEGORIA[m.categoria] },
            {
              clave: 'cantidad',
              etiqueta: 'Cantidad',
              valor: (m: Movimiento) => {
                const esOrigenAca = m.establecimientoOrigenId === establecimiento.id;
                const signo = TIPOS_ALTA.has(m.tipo) || (m.tipo === 'traslado' && !esOrigenAca) ? '+' : '−';
                return `${signo}${m.cantidad}`;
              },
            },
            {
              clave: 'detalle',
              etiqueta: 'Detalle',
              valor: (m: Movimiento) => {
                if (m.tipo !== 'traslado') return m.observaciones ?? '—';
                const esOrigenAca = m.establecimientoOrigenId === establecimiento.id;
                return esOrigenAca ? `→ ${nombreDe(m.establecimientoDestinoId)}` : `← ${nombreDe(m.establecimientoOrigenId)}`;
              },
            },
          ]}
          filas={movimientos}
        />
      )}
      {!cargando && (
        movimientos.length === 0 ? (
          <p className="muted">Todavía no hay movimientos registrados para este establecimiento.</p>
        ) : (
          <div className="card">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Categoría</th>
                  <th>Cantidad</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map((m) => {
                  const esOrigenAca = m.establecimientoOrigenId === establecimiento.id;
                  const detalle =
                    m.tipo === 'traslado'
                      ? esOrigenAca
                        ? `→ ${nombreDe(m.establecimientoDestinoId)}`
                        : `← ${nombreDe(m.establecimientoOrigenId)}`
                      : (m.observaciones ?? '—');
                  const signo = TIPOS_ALTA.has(m.tipo) || (m.tipo === 'traslado' && !esOrigenAca) ? '+' : '−';
                  return (
                    <tr key={m.id}>
                      <td>{m.fecha}</td>
                      <td>{ETIQUETAS_TIPO_MOVIMIENTO[m.tipo]}</td>
                      <td>{ETIQUETAS_CATEGORIA[m.categoria]}</td>
                      <td>{signo}{m.cantidad}</td>
                      <td>{detalle}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      <div className="page-head">
        <h2>Eventos sanitarios y reproductivos</h2>
        <button className="btn" onClick={() => setMostrarEvento((v) => !v)}>
          {mostrarEvento ? 'Cerrar' : '+ Nuevo evento'}
        </button>
      </div>

      {mostrarEvento && (
        <NuevoEventoForm
          sesion={sesion}
          establecimiento={establecimiento}
          onCreado={() => {
            setMostrarEvento(false);
            cargar();
          }}
        />
      )}

      {!cargando && eventos.length > 0 && (
        <ExportBar
          nombreArchivo={`eventos-${establecimiento.nombre}`}
          titulo={`Eventos — ${establecimiento.nombre}`}
          columnas={[
            { clave: 'fecha', etiqueta: 'Fecha' },
            { clave: 'tipo', etiqueta: 'Tipo', valor: (e: Evento) => ETIQUETAS_TIPO_EVENTO[e.tipo] },
            {
              clave: 'categoria',
              etiqueta: 'Categoría',
              valor: (e: Evento) => (e.categoria ? ETIQUETAS_CATEGORIA[e.categoria] : 'Toda la hacienda'),
            },
            { clave: 'cantidad', etiqueta: 'Cantidad', valor: (e: Evento) => e.cantidad ?? '—' },
            { clave: 'detalle', etiqueta: 'Producto / detalle', valor: (e: Evento) => e.producto ?? e.observaciones ?? '—' },
          ]}
          filas={eventos}
        />
      )}
      {!cargando && (
        eventos.length === 0 ? (
          <p className="muted">Todavía no hay eventos registrados para este establecimiento.</p>
        ) : (
          <div className="card">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Categoría</th>
                  <th>Cantidad</th>
                  <th>Producto / detalle</th>
                </tr>
              </thead>
              <tbody>
                {eventos.map((e) => (
                  <tr key={e.id}>
                    <td>{e.fecha}</td>
                    <td>{ETIQUETAS_TIPO_EVENTO[e.tipo]}</td>
                    <td>{e.categoria ? ETIQUETAS_CATEGORIA[e.categoria] : 'Toda la hacienda'}</td>
                    <td>{e.cantidad ?? '—'}</td>
                    <td>{e.producto ?? e.observaciones ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}

function NuevoEventoForm({
  sesion,
  establecimiento,
  onCreado,
}: {
  sesion: Sesion;
  establecimiento: Establecimiento;
  onCreado: () => void;
}) {
  const [tipo, setTipo] = useState<TipoEvento>('vacunacion');
  const [categoria, setCategoria] = useState<'' | CategoriaHacienda>('');
  const [cantidad, setCantidad] = useState('');
  const [producto, setProducto] = useState('');
  const [fecha, setFecha] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      const data: Record<string, unknown> = { establecimientoId: establecimiento.id, tipo };
      if (categoria) data.categoria = categoria;
      if (cantidad) data.cantidad = Number(cantidad);
      if (producto) data.producto = producto;
      if (fecha) data.fecha = fecha;
      if (observaciones) data.observaciones = observaciones;
      await api.crearEvento(sesion, data);
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
        <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoEvento)}>
          {(Object.keys(ETIQUETAS_TIPO_EVENTO) as TipoEvento[]).map((t) => (
            <option key={t} value={t}>
              {ETIQUETAS_TIPO_EVENTO[t]}
            </option>
          ))}
        </select>
      </label>
      <label>
        Categoría (opcional)
        <select value={categoria} onChange={(e) => setCategoria(e.target.value as '' | CategoriaHacienda)}>
          <option value="">Toda la hacienda</option>
          {(Object.keys(ETIQUETAS_CATEGORIA) as CategoriaHacienda[]).map((c) => (
            <option key={c} value={c}>
              {ETIQUETAS_CATEGORIA[c]}
            </option>
          ))}
        </select>
      </label>
      <label>
        Cantidad de animales (opcional)
        <input type="number" min="1" step="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
      </label>
      <label>
        Producto (opcional)
        <input
          value={producto}
          onChange={(e) => setProducto(e.target.value)}
          placeholder="Vacuna, antiparasitario…"
        />
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
          {guardando ? 'Guardando…' : 'Guardar evento'}
        </button>
      </div>
    </form>
  );
}

function NuevoMovimientoForm({
  sesion,
  establecimiento,
  otrosEstablecimientos,
  onCreado,
}: {
  sesion: Sesion;
  establecimiento: Establecimiento;
  otrosEstablecimientos: Establecimiento[];
  onCreado: () => void;
}) {
  const [tipo, setTipo] = useState<TipoMovimiento>('nacimiento');
  const [categoria, setCategoria] = useState<CategoriaHacienda>('vaca');
  const [cantidad, setCantidad] = useState('');
  const [establecimientoDestinoId, setEstablecimientoDestinoId] = useState('');
  const [fecha, setFecha] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const esTraslado = tipo === 'traslado';
  const esBaja = TIPOS_BAJA.has(tipo);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (esTraslado && !establecimientoDestinoId) {
      setError('Elegí el establecimiento de destino');
      return;
    }
    setGuardando(true);
    try {
      const data: Record<string, unknown> = {
        tipo,
        categoria,
        cantidad: Number(cantidad),
        establecimientoId: establecimiento.id,
      };
      if (esTraslado) data.establecimientoDestinoId = establecimientoDestinoId;
      if (fecha) data.fecha = fecha;
      if (observaciones) data.observaciones = observaciones;
      await api.crearMovimiento(sesion, data);
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
        <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoMovimiento)}>
          {(Object.keys(ETIQUETAS_TIPO_MOVIMIENTO) as TipoMovimiento[]).map((t) => (
            <option key={t} value={t}>
              {ETIQUETAS_TIPO_MOVIMIENTO[t]}
            </option>
          ))}
        </select>
      </label>
      <label>
        Categoría
        <select value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaHacienda)}>
          {(Object.keys(ETIQUETAS_CATEGORIA) as CategoriaHacienda[]).map((c) => (
            <option key={c} value={c}>
              {ETIQUETAS_CATEGORIA[c]}
            </option>
          ))}
        </select>
      </label>
      <label>
        Cantidad
        <input
          type="number"
          min="1"
          step="1"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          required
        />
      </label>
      {esTraslado && (
        <label>
          Destino
          <select
            value={establecimientoDestinoId}
            onChange={(e) => setEstablecimientoDestinoId(e.target.value)}
            required
          >
            <option value="">Elegir…</option>
            {otrosEstablecimientos.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        Fecha (opcional)
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
      </label>
      <label className="span-2">
        Observaciones (opcional)
        <input value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
      </label>
      {esBaja && (
        <p className="muted span-2">
          Se descuenta de la hacienda de este establecimiento. Si no hay stock suficiente, se rechaza.
        </p>
      )}
      {error && <div className="alerta span-2">{error}</div>}
      <div className="span-2">
        <button className="btn" type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar movimiento'}
        </button>
      </div>
    </form>
  );
}

function FilaExistencia({
  sesion,
  establecimientoId,
  existencia,
  onGuardada,
}: {
  sesion: Sesion;
  establecimientoId: string;
  existencia: Existencia;
  onGuardada: (e: Existencia) => void;
}) {
  const [cantidad, setCantidad] = useState(String(existencia.cantidad));
  const [guardando, setGuardando] = useState(false);

  const cambio = Number(cantidad) !== existencia.cantidad;

  async function guardar() {
    setGuardando(true);
    try {
      const nueva = await api.fijarExistencia(sesion, establecimientoId, {
        categoria: existencia.categoria,
        cantidad: Number(cantidad),
      });
      onGuardada(nueva);
    } catch (err) {
      alert('No se pudo guardar: ' + (err instanceof Error ? err.message : 'error'));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <tr>
      <td>{ETIQUETAS_CATEGORIA[existencia.categoria]}</td>
      <td>
        <input
          type="number"
          min="0"
          step="1"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          style={{ maxWidth: '8rem' }}
        />
      </td>
      <td>
        <button className="link" onClick={guardar} disabled={!cambio || guardando}>
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
      </td>
    </tr>
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

function EditarEstablecimientoForm({
  sesion,
  establecimiento,
  onGuardado,
  onCancelar,
}: {
  sesion: Sesion;
  establecimiento: Establecimiento;
  onGuardado: (e: Establecimiento) => void;
  onCancelar: () => void;
}) {
  const [nombre, setNombre] = useState(establecimiento.nombre);
  const [ubicacion, setUbicacion] = useState(establecimiento.ubicacion ?? '');
  const [superficieHa, setSuperficieHa] = useState(establecimiento.superficieHa ?? '');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      const data: Record<string, unknown> = { nombre };
      if (ubicacion) data.ubicacion = ubicacion;
      if (superficieHa) data.superficieHa = Number(superficieHa);
      const actualizado = await api.actualizarEstablecimiento(sesion, establecimiento.id, data);
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
        Ubicación
        <input value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} />
      </label>
      <label>
        Superficie en hectáreas
        <input
          type="number"
          step="0.1"
          min="0"
          value={superficieHa}
          onChange={(e) => setSuperficieHa(e.target.value)}
        />
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

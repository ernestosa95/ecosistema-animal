import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type {
  Sesion, Establecimiento, Existencia, CategoriaHacienda, Movimiento, TipoMovimiento, Evento, TipoEvento,
  AnimalCampo, EstadoAnimalCampo, Hallazgo, ToroVirtual, ResultadoReproductivo, Muestra, EvaluacionAndrologica,
  Potrero, PlantillaTareas, ProtocoloIatf, Tarea,
} from '../api/types';
import { DrawerTabla } from '../components/DrawerTabla';

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

/**
 * Selector reusable de establecimiento, para las secciones que ya no dependen
 * de la navegación anidada "lista → detalle" de antes (Animales, Potreros,
 * Animales individuales). Se oculta si hay 0 o 1 (nada que elegir).
 */
function EstablecimientoSelector({
  establecimientos,
  seleccionadoId,
  onSeleccionar,
}: {
  establecimientos: Establecimiento[];
  seleccionadoId: string | null;
  onSeleccionar: (id: string) => void;
}) {
  if (establecimientos.length <= 1) return null;
  return (
    <label style={{ display: 'block', maxWidth: '20rem', marginBottom: '1rem' }}>
      Establecimiento
      <select value={seleccionadoId ?? ''} onChange={(e) => onSeleccionar(e.target.value)}>
        {establecimientos.map((e) => (
          <option key={e.id} value={e.id}>
            {e.nombre}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Carga los establecimientos de la org y mantiene cuál está seleccionado (por defecto, el primero). */
function useEstablecimientos(sesion: Sesion) {
  const [establecimientos, setEstablecimientos] = useState<Establecimiento[]>([]);
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    api
      .establecimientos(sesion)
      .then((ests) => {
        setEstablecimientos(ests);
        setSeleccionadoId((actual) => actual ?? ests[0]?.id ?? null);
      })
      .finally(() => setCargando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    establecimientos,
    seleccionado: establecimientos.find((e) => e.id === seleccionadoId) ?? null,
    seleccionadoId,
    setSeleccionadoId,
    cargando,
  };
}

function SinEstablecimientos() {
  return <p className="muted">Todavía no hay establecimientos. Creá el primero desde "Home".</p>;
}

/** Home de Tropera: alta/edición de establecimientos + panel consolidado de stock. */
function inicioDeMesISO(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

interface DrillMovimientos {
  titulo: string;
  filas: Movimiento[];
}

export function TroperaHomeSection({ sesion }: { sesion: Sesion }) {
  const [establecimientos, setEstablecimientos] = useState<Establecimiento[]>([]);
  const [existenciasTodas, setExistenciasTodas] = useState<
    { establecimientoId: string; categoria: CategoriaHacienda; cantidad: number }[]
  >([]);
  const [movimientosPorTipo, setMovimientosPorTipo] = useState<Record<string, number> | null>(null);
  const [drill, setDrill] = useState<DrillMovimientos | null>(null);
  const [cargandoDrill, setCargandoDrill] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const [ests, ex, movMes] = await Promise.all([
        api.establecimientos(sesion),
        api.existenciasConsolidadas(sesion),
        api.movimientos(sesion, undefined, inicioDeMesISO()),
      ]);
      setEstablecimientos(ests);
      setExistenciasTodas(ex);
      const porTipo: Record<string, number> = {};
      for (const m of movMes) porTipo[m.tipo] = (porTipo[m.tipo] ?? 0) + 1;
      setMovimientosPorTipo(porTipo);
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

  async function abrirMovimientosPorTipo(tipo: TipoMovimiento) {
    const titulo = `Movimientos ${ETIQUETAS_TIPO_MOVIMIENTO[tipo]} (este mes)`;
    setCargandoDrill(true);
    setDrill({ titulo, filas: [] });
    try {
      const todos = await api.movimientos(sesion, undefined, inicioDeMesISO());
      setDrill({ titulo, filas: todos.filter((m) => m.tipo === tipo) });
    } finally {
      setCargandoDrill(false);
    }
  }

  return (
    <div>
      <div className="page-head">
        <h1>Home</h1>
        <button className="btn" data-tour="tropera-nuevo" onClick={() => setMostrarForm((v) => !v)}>
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

      {!cargando && movimientosPorTipo && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <span className="dato-label">Movimientos este mes por tipo</span>
          {Object.keys(movimientosPorTipo).length === 0 ? (
            <p className="muted">Sin movimientos este mes todavía.</p>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              {Object.entries(movimientosPorTipo).map(([tipo, cantidad]) => (
                <button
                  key={tipo}
                  className="chip chip-clickable"
                  onClick={() => abrirMovimientosPorTipo(tipo as TipoMovimiento)}
                >
                  {ETIQUETAS_TIPO_MOVIMIENTO[tipo as TipoMovimiento]}: {cantidad}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {drill && (
        <DrawerTabla
          titulo={drill.titulo}
          columnas={[
            { clave: 'fecha', etiqueta: 'Fecha' },
            { clave: 'categoria', etiqueta: 'Categoría', valor: (m: Movimiento) => ETIQUETAS_CATEGORIA[m.categoria] },
            { clave: 'cantidad', etiqueta: 'Cantidad' },
          ]}
          filas={drill.filas}
          cargando={cargandoDrill}
          onCerrar={() => setDrill(null)}
        />
      )}

      {!cargando && establecimientos.length > 1 && (
        <ResumenConsolidado establecimientos={establecimientos} existencias={existenciasTodas} />
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
                <FilaEstablecimiento key={e.id} sesion={sesion} establecimiento={e} onActualizado={cargar} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FilaEstablecimiento({
  sesion,
  establecimiento,
  onActualizado,
}: {
  sesion: Sesion;
  establecimiento: Establecimiento;
  onActualizado: () => void;
}) {
  const [editando, setEditando] = useState(false);
  return (
    <>
      <tr>
        <td>{establecimiento.nombre}</td>
        <td>{establecimiento.ubicacion ?? '—'}</td>
        <td>{establecimiento.superficieHa ? `${establecimiento.superficieHa} ha` : '—'}</td>
        <td>
          <button className="link" onClick={() => setEditando((v) => !v)}>
            {editando ? 'Cerrar' : 'Editar'}
          </button>
        </td>
      </tr>
      {editando && (
        <tr>
          <td colSpan={4}>
            <EditarEstablecimientoForm
              sesion={sesion}
              establecimiento={establecimiento}
              onGuardado={() => {
                setEditando(false);
                onActualizado();
              }}
              onCancelar={() => setEditando(false)}
            />
          </td>
        </tr>
      )}
    </>
  );
}

/** Hacienda agregada (existencias por categoría, movimientos y eventos a nivel categoría) del establecimiento elegido. */
export function TroperaAnimalesSection({ sesion }: { sesion: Sesion }) {
  const { establecimientos, seleccionado, seleccionadoId, setSeleccionadoId, cargando: cargandoEsts } =
    useEstablecimientos(sesion);
  const [existencias, setExistencias] = useState<Existencia[]>([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mostrarMovimiento, setMostrarMovimiento] = useState(false);
  const [mostrarEvento, setMostrarEvento] = useState(false);

  const nombreDe = (id?: string | null) => establecimientos.find((e) => e.id === id)?.nombre ?? '—';

  async function cargar(id: string) {
    setCargando(true);
    setError(null);
    try {
      const [ex, mov, ev] = await Promise.all([
        api.existenciasDeEstablecimiento(sesion, id),
        api.movimientos(sesion, id),
        api.eventos(sesion, id),
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
    if (seleccionadoId) cargar(seleccionadoId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seleccionadoId]);

  if (!cargandoEsts && establecimientos.length === 0) return <SinEstablecimientos />;

  return (
    <div>
      <div className="page-head">
        <h1>Animales</h1>
      </div>
      <EstablecimientoSelector
        establecimientos={establecimientos}
        seleccionadoId={seleccionadoId}
        onSeleccionar={setSeleccionadoId}
      />
      {seleccionado && (
        <>
          <div className="page-head">
            <h2>Existencias — {seleccionado.nombre}</h2>
          </div>
          {error && <div className="alerta">{error}</div>}
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
                      establecimientoId={seleccionado.id}
                      existencia={ex}
                      onGuardada={(nueva) =>
                        setExistencias((prev) => prev.map((e) => (e.categoria === nueva.categoria ? nueva : e)))
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
              establecimiento={seleccionado}
              otrosEstablecimientos={establecimientos.filter((e) => e.id !== seleccionado.id)}
              onCreado={() => {
                setMostrarMovimiento(false);
                cargar(seleccionado.id);
              }}
            />
          )}

          {!cargando &&
            (movimientos.length === 0 ? (
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
                      const esOrigenAca = m.establecimientoOrigenId === seleccionado.id;
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
            ))}

          <div className="page-head">
            <h2>Eventos sanitarios y reproductivos</h2>
            <button className="btn" onClick={() => setMostrarEvento((v) => !v)}>
              {mostrarEvento ? 'Cerrar' : '+ Nuevo evento'}
            </button>
          </div>

          {mostrarEvento && (
            <NuevoEventoForm
              sesion={sesion}
              establecimiento={seleccionado}
              onCreado={() => {
                setMostrarEvento(false);
                cargar(seleccionado.id);
              }}
            />
          )}

          {!cargando &&
            (eventos.length === 0 ? (
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
            ))}
        </>
      )}
    </div>
  );
}

/** Potreros del establecimiento elegido. */
export function TroperaPotrerosSection({ sesion }: { sesion: Sesion }) {
  const { establecimientos, seleccionado, seleccionadoId, setSeleccionadoId, cargando: cargandoEsts } =
    useEstablecimientos(sesion);
  const [potreros, setPotreros] = useState<Potrero[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!seleccionadoId) return;
    setCargando(true);
    api
      .potreros(sesion, seleccionadoId)
      .then(setPotreros)
      .finally(() => setCargando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seleccionadoId]);

  if (!cargandoEsts && establecimientos.length === 0) return <SinEstablecimientos />;

  return (
    <div>
      <div className="page-head">
        <h1>Potreros</h1>
      </div>
      <EstablecimientoSelector
        establecimientos={establecimientos}
        seleccionadoId={seleccionadoId}
        onSeleccionar={setSeleccionadoId}
      />
      {seleccionado && !cargando && (
        <PotrerosSection
          sesion={sesion}
          establecimiento={seleccionado}
          potreros={potreros}
          onActualizado={(pots) => setPotreros(pots)}
        />
      )}
    </div>
  );
}

/** Seguimiento individual de campo (Fase E): fichas por caravana + evaluación andrológica + muestreos del establecimiento elegido. */
export function TroperaIndividualesSection({ sesion }: { sesion: Sesion }) {
  const { establecimientos, seleccionado, seleccionadoId, setSeleccionadoId, cargando: cargandoEsts } =
    useEstablecimientos(sesion);
  const [potreros, setPotreros] = useState<Potrero[]>([]);

  useEffect(() => {
    if (!seleccionadoId) return;
    api.potreros(sesion, seleccionadoId).then(setPotreros);
  }, [seleccionadoId]);

  if (!cargandoEsts && establecimientos.length === 0) return <SinEstablecimientos />;

  return (
    <div>
      <div className="page-head">
        <h1>Animales individuales</h1>
      </div>
      <EstablecimientoSelector
        establecimientos={establecimientos}
        seleccionadoId={seleccionadoId}
        onSeleccionar={setSeleccionadoId}
      />
      {seleccionado && (
        <>
          <AnimalesCampoSection sesion={sesion} establecimiento={seleccionado} potreros={potreros} />
          <MuestreosSection sesion={sesion} establecimiento={seleccionado} />
        </>
      )}
    </div>
  );
}

/** Catálogo org-wide de plantillas/protocolos (Fase E.5/E.6) + agenda de tareas del establecimiento elegido. */
export function TroperaPlantillasSection({ sesion }: { sesion: Sesion }) {
  const { establecimientos, seleccionado, seleccionadoId, setSeleccionadoId } = useEstablecimientos(sesion);

  return (
    <div>
      <div className="page-head">
        <h1>Plantillas y protocolos</h1>
      </div>
      <PlantillasYProtocolosSection sesion={sesion} />

      {establecimientos.length > 0 && (
        <>
          <div className="page-head">
            <h2>Agenda de tareas</h2>
          </div>
          <EstablecimientoSelector
            establecimientos={establecimientos}
            seleccionadoId={seleccionadoId}
            onSeleccionar={setSeleccionadoId}
          />
          {seleccionado && <TareasSection sesion={sesion} establecimiento={seleccionado} />}
        </>
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
      api.registrarEvento(sesion, 'accion', 'tropera-establecimiento-crear');
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

const ETIQUETAS_RESULTADO_REPRODUCTIVO: Record<ResultadoReproductivo, string> = {
  prenada: 'Preñada',
  vacia: 'Vacía',
  anestro: 'Anestro',
};

function NuevoEventoForm({
  sesion,
  establecimiento,
  animalCampoId,
  onCreado,
}: {
  sesion: Sesion;
  establecimiento: Establecimiento;
  /** Fase E: si viene, el evento se imputa a este animal puntual en vez de a la categoría agregada. */
  animalCampoId?: string;
  onCreado: () => void;
}) {
  const [tipo, setTipo] = useState<TipoEvento>('vacunacion');
  const [categoria, setCategoria] = useState<'' | CategoriaHacienda>('');
  const [cantidad, setCantidad] = useState('');
  const [producto, setProducto] = useState('');
  const [fecha, setFecha] = useState('');
  const [retiroHasta, setRetiroHasta] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [hallazgos, setHallazgos] = useState<Hallazgo[]>([]);
  const [hallazgoId, setHallazgoId] = useState('');
  const [resultadoReproductivo, setResultadoReproductivo] = useState<'' | ResultadoReproductivo>('');
  const [torosVirtuales, setTorosVirtuales] = useState<ToroVirtual[]>([]);
  const [toroVirtualId, setToroVirtualId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Catálogos de Fase E.2/E.3 — sólo hacen falta para diagnóstico de preñez (hallazgos + grilla 1-tap) y servicio (toro virtual).
  useEffect(() => {
    if (tipo === 'diagnostico_prenez' || tipo === 'tratamiento') {
      api.hallazgos(sesion).then(setHallazgos).catch(() => {});
    }
    if (tipo === 'servicio') {
      api.torosVirtuales(sesion).then(setTorosVirtuales).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      const data: Record<string, unknown> = { establecimientoId: establecimiento.id, tipo };
      if (animalCampoId) data.animalCampoId = animalCampoId;
      if (categoria) data.categoria = categoria;
      if (cantidad) data.cantidad = Number(cantidad);
      if (producto) data.producto = producto;
      if (fecha) data.fecha = fecha;
      if (retiroHasta) data.retiroHasta = retiroHasta;
      if (observaciones) data.observaciones = observaciones;
      if (hallazgoId) data.hallazgoId = hallazgoId;
      if (resultadoReproductivo) data.resultadoReproductivo = resultadoReproductivo;
      if (toroVirtualId) data.toroVirtualId = toroVirtualId;
      await api.crearEvento(sesion, data);
      api.registrarEvento(sesion, 'accion', 'tropera-evento-crear');
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
      {!animalCampoId && (
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
      )}
      {!animalCampoId && (
        <label>
          Cantidad de animales (opcional)
          <input type="number" min="1" step="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
        </label>
      )}

      {tipo === 'diagnostico_prenez' && (
        <div className="span-2">
          <span className="dato-label">Resultado (§6.1 — grilla 1-tap)</span>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
            {(Object.keys(ETIQUETAS_RESULTADO_REPRODUCTIVO) as ResultadoReproductivo[]).map((r) => (
              <button
                key={r}
                type="button"
                className={resultadoReproductivo === r ? 'btn' : 'btn-ghost'}
                onClick={() => setResultadoReproductivo(r)}
              >
                {ETIQUETAS_RESULTADO_REPRODUCTIVO[r]}
              </button>
            ))}
          </div>
        </div>
      )}

      {(tipo === 'diagnostico_prenez' || tipo === 'tratamiento') && hallazgos.length > 0 && (
        <div className="span-2">
          <span className="dato-label">Hallazgo (opcional, catálogo normalizado)</span>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
            {hallazgos.map((h) => (
              <button
                key={h.id}
                type="button"
                className="chip"
                style={hallazgoId === h.id ? { background: 'var(--verde)', color: '#fff' } : undefined}
                onClick={() => setHallazgoId(hallazgoId === h.id ? '' : h.id)}
              >
                {h.nombre}
              </button>
            ))}
          </div>
        </div>
      )}

      {tipo === 'servicio' && (
        <label className="span-2">
          Toro virtual / pajuela (opcional)
          <select value={toroVirtualId} onChange={(e) => setToroVirtualId(e.target.value)}>
            <option value="">Sin especificar</option>
            {torosVirtuales.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
                {t.raza ? ` · ${t.raza}` : ''}
              </option>
            ))}
          </select>
        </label>
      )}

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
      <label>
        Retiro sanitario hasta (opcional)
        <input type="date" value={retiroHasta} onChange={(e) => setRetiroHasta(e.target.value)} />
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

const ETIQUETAS_ESTADO_ANIMAL: Record<EstadoAnimalCampo, string> = {
  activo: 'Activo',
  vendido: 'Vendido',
  muerto: 'Muerto',
  transferido: 'Transferido',
};

/** Fase E, §5.3 y §7.1: potreros — subdivisión del establecimiento, base para los Apartados Rápidos. */
function PotrerosSection({
  sesion,
  establecimiento,
  potreros,
  onActualizado,
}: {
  sesion: Sesion;
  establecimiento: Establecimiento;
  potreros: Potrero[];
  onActualizado: (potreros: Potrero[]) => void;
}) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nombre, setNombre] = useState('');
  const [superficieHa, setSuperficieHa] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      const data: Record<string, unknown> = { establecimientoId: establecimiento.id, nombre };
      if (superficieHa) data.superficieHa = Number(superficieHa);
      await api.crearPotrero(sesion, data);
      api.registrarEvento(sesion, 'accion', 'tropera-potrero-crear');
      setNombre('');
      setSuperficieHa('');
      setMostrarForm(false);
      onActualizado(await api.potreros(sesion, establecimiento.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div>
      <div className="page-head">
        <h2>Potreros</h2>
        <button className="btn" onClick={() => setMostrarForm((v) => !v)}>
          {mostrarForm ? 'Cerrar' : '+ Nuevo potrero'}
        </button>
      </div>
      {mostrarForm && (
        <form className="card form-grid" onSubmit={guardar}>
          <label>
            Nombre
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </label>
          <label>
            Superficie (ha, opcional)
            <input type="number" step="0.01" min="0" value={superficieHa} onChange={(e) => setSuperficieHa(e.target.value)} />
          </label>
          {error && <div className="alerta span-2">{error}</div>}
          <div className="span-2">
            <button className="btn" type="submit" disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar potrero'}
            </button>
          </div>
        </form>
      )}
      {potreros.length === 0 ? (
        <p className="muted">Todavía no hay potreros cargados en este establecimiento.</p>
      ) : (
        <div className="card" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {potreros.map((p) => (
            <span key={p.id} className="chip">
              {p.nombre}
              {p.superficieHa ? ` · ${p.superficieHa}ha` : ''}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Fase E, §5.2 del spec UI/UX: seguimiento individual de campo, convive con
 * las existencias agregadas de arriba sin reemplazarlas (modelo híbrido
 * acordado con el usuario antes de codear).
 */
function AnimalesCampoSection({
  sesion,
  establecimiento,
  potreros,
}: {
  sesion: Sesion;
  establecimiento: Establecimiento;
  potreros: Potrero[];
}) {
  const [animales, setAnimales] = useState<AnimalCampo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [soloTransitorios, setSoloTransitorios] = useState(false);
  const [mostrarAlta, setMostrarAlta] = useState(false);
  const [seleccionado, setSeleccionado] = useState<AnimalCampo | null>(null);
  const [conciliandoId, setConciliandoId] = useState<string | null>(null);
  const [categoriaExpress, setCategoriaExpress] = useState<CategoriaHacienda>('vaca');
  const [dandoAltaExpress, setDandoAltaExpress] = useState(false);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      setAnimales(await api.animalesCampo(sesion, establecimiento.id, soloTransitorios));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [establecimiento.id, soloTransitorios]);

  async function altaExpress() {
    setDandoAltaExpress(true);
    try {
      await api.crearAnimalCampo(sesion, { establecimientoId: establecimiento.id, categoria: categoriaExpress });
      api.registrarEvento(sesion, 'accion', 'tropera-animal-alta-express');
      cargar();
    } catch (err) {
      alert('No se pudo dar de alta: ' + (err instanceof Error ? err.message : 'error'));
    } finally {
      setDandoAltaExpress(false);
    }
  }

  if (seleccionado) {
    return (
      <FichaAnimalCampo
        sesion={sesion}
        establecimiento={establecimiento}
        animal={seleccionado}
        potreros={potreros}
        onVolver={() => {
          setSeleccionado(null);
          cargar();
        }}
        onActualizado={setSeleccionado}
      />
    );
  }

  const pendientes = animales.filter((a) => !a.caravanaDefinitiva).length;

  return (
    <div>
      <div className="page-head">
        <h2>Animales individuales{pendientes > 0 ? ` — ${pendientes} sin conciliar` : ''}</h2>
        <button className="btn" onClick={() => setMostrarAlta((v) => !v)}>
          {mostrarAlta ? 'Cerrar' : '+ Nuevo animal'}
        </button>
      </div>

      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <span className="muted" style={{ fontSize: '0.85rem' }}>Alta express sin identificar (§5.2):</span>
        <select value={categoriaExpress} onChange={(e) => setCategoriaExpress(e.target.value as CategoriaHacienda)}>
          {(Object.keys(ETIQUETAS_CATEGORIA) as CategoriaHacienda[]).map((c) => (
            <option key={c} value={c}>
              {ETIQUETAS_CATEGORIA[c]}
            </option>
          ))}
        </select>
        <button className="btn-ghost" onClick={altaExpress} disabled={dandoAltaExpress}>
          {dandoAltaExpress ? 'Dando de alta…' : '+ Alta 1-tap'}
        </button>
      </div>

      {mostrarAlta && (
        <NuevoAnimalCampoForm
          sesion={sesion}
          establecimiento={establecimiento}
          onCreado={() => {
            setMostrarAlta(false);
            cargar();
          }}
        />
      )}

      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
        <input
          type="checkbox"
          checked={soloTransitorios}
          onChange={(e) => setSoloTransitorios(e.target.checked)}
          style={{ width: 'auto', margin: 0 }}
        />
        Sólo pendientes de conciliar (Bandeja de Conciliación)
      </label>

      {error && <div className="alerta">{error}</div>}
      {cargando ? (
        <p className="muted">Cargando…</p>
      ) : animales.length === 0 ? (
        <p className="muted">
          {soloTransitorios ? 'No hay animales pendientes de conciliar.' : 'Todavía no hay animales individuales cargados.'}
        </p>
      ) : (
        <div className="card">
          <table className="tabla">
            <thead>
              <tr>
                <th>Caravana</th>
                <th>Categoría</th>
                <th>Potrero</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {animales.map((a) => (
                <tr key={a.id}>
                  <td className={a.caravanaDefinitiva ? undefined : 'mono'}>
                    {a.caravana}
                    {!a.caravanaDefinitiva && (
                      <span className="chip" style={{ marginLeft: '0.4rem' }}>
                        sin conciliar
                      </span>
                    )}
                  </td>
                  <td>{ETIQUETAS_CATEGORIA[a.categoria]}</td>
                  <td>{potreros.find((p) => p.id === a.potreroId)?.nombre ?? '—'}</td>
                  <td>{ETIQUETAS_ESTADO_ANIMAL[a.estado]}</td>
                  <td>
                    {conciliandoId === a.id ? (
                      <ConciliarInline
                        sesion={sesion}
                        animal={a}
                        onListo={() => {
                          setConciliandoId(null);
                          cargar();
                        }}
                        onCancelar={() => setConciliandoId(null)}
                      />
                    ) : (
                      <>
                        {!a.caravanaDefinitiva && (
                          <>
                            <button className="link" onClick={() => setConciliandoId(a.id)}>
                              Asignar caravana
                            </button>{' '}
                          </>
                        )}
                        <button className="link" onClick={() => setSeleccionado(a)}>
                          Ver ficha →
                        </button>
                      </>
                    )}
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

function ConciliarInline({
  sesion,
  animal,
  onListo,
  onCancelar,
}: {
  sesion: Sesion;
  animal: AnimalCampo;
  onListo: () => void;
  onCancelar: () => void;
}) {
  const [caravana, setCaravana] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    if (!caravana.trim()) {
      setError('Ingresá la caravana');
      return;
    }
    setError(null);
    setGuardando(true);
    try {
      await api.conciliarAnimalCampo(sesion, animal.id, caravana.trim());
      api.registrarEvento(sesion, 'accion', 'tropera-animal-conciliar-caravana');
      onListo();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <span style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
      <input
        value={caravana}
        onChange={(e) => setCaravana(e.target.value)}
        placeholder="Caravana definitiva"
        style={{ width: '9rem', margin: 0 }}
      />
      <button className="link" onClick={guardar} disabled={guardando}>
        Guardar
      </button>
      <button className="link" onClick={onCancelar}>
        Cancelar
      </button>
      {error && <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{error}</span>}
    </span>
  );
}

function NuevoAnimalCampoForm({
  sesion,
  establecimiento,
  onCreado,
}: {
  sesion: Sesion;
  establecimiento: Establecimiento;
  onCreado: () => void;
}) {
  const [caravana, setCaravana] = useState('');
  const [categoria, setCategoria] = useState<CategoriaHacienda>('vaca');
  const [sexo, setSexo] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      const data: Record<string, unknown> = { establecimientoId: establecimiento.id, categoria };
      if (caravana) data.caravana = caravana;
      if (sexo) data.sexo = sexo;
      if (observaciones) data.observaciones = observaciones;
      await api.crearAnimalCampo(sesion, data);
      api.registrarEvento(sesion, 'accion', 'tropera-animal-crear');
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
        Caravana (vacío = alta transitoria, se concilia después)
        <input value={caravana} onChange={(e) => setCaravana(e.target.value)} placeholder="Ej: AR-4521" />
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
        Sexo (opcional)
        <input value={sexo} onChange={(e) => setSexo(e.target.value)} />
      </label>
      <label className="span-2">
        Observaciones (opcional)
        <input value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
      </label>
      {error && <div className="alerta span-2">{error}</div>}
      <div className="span-2">
        <button className="btn" type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar animal'}
        </button>
      </div>
    </form>
  );
}

/** Ficha individual (§5.2/§5.3): historial de eventos propios + alerta de retiro sanitario vigente. */
function FichaAnimalCampo({
  sesion,
  establecimiento,
  animal,
  potreros,
  onVolver,
  onActualizado,
}: {
  sesion: Sesion;
  establecimiento: Establecimiento;
  animal: AnimalCampo;
  potreros: Potrero[];
  onVolver: () => void;
  onActualizado: (a: AnimalCampo) => void;
}) {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mostrarEvento, setMostrarEvento] = useState(false);
  const [editando, setEditando] = useState(false);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      setEventos(await api.eventosDeAnimalCampo(sesion, animal.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animal.id]);

  const hoy = new Date().toISOString().slice(0, 10);
  const retiroVigente = eventos
    .map((e) => e.retiroHasta)
    .filter((f): f is string => !!f && f >= hoy)
    .sort()
    .pop();

  return (
    <div>
      <button className="link" onClick={onVolver}>
        ← Volver a animales individuales
      </button>

      <div className="page-head">
        <h1>{animal.caravana}</h1>
        <button className="btn-ghost" onClick={() => setEditando((v) => !v)}>
          {editando ? 'Cerrar' : 'Editar'}
        </button>
      </div>

      {retiroVigente && (
        <div className="alerta">
          ⚠ Retiro sanitario vigente hasta {retiroVigente} — confirmá antes de procesar de nuevo a este animal.
        </div>
      )}

      {editando ? (
        <EditarAnimalCampoForm
          sesion={sesion}
          animal={animal}
          potreros={potreros}
          retiroVigente={retiroVigente}
          onGuardado={(a) => {
            onActualizado(a);
            setEditando(false);
          }}
          onCancelar={() => setEditando(false)}
        />
      ) : (
        <div className="card ficha-datos">
          <Dato etiqueta="Categoría" valor={ETIQUETAS_CATEGORIA[animal.categoria]} />
          <Dato etiqueta="Potrero" valor={potreros.find((p) => p.id === animal.potreroId)?.nombre ?? '—'} />
          <Dato etiqueta="Sexo" valor={animal.sexo ?? '—'} />
          <Dato etiqueta="Estado" valor={ETIQUETAS_ESTADO_ANIMAL[animal.estado]} />
          <Dato etiqueta="Alta" valor={animal.fechaAlta} />
        </div>
      )}

      <AplicarPlantillaSection sesion={sesion} animal={animal} establecimiento={establecimiento} onAplicada={cargar} />

      <AplicarProtocoloSection sesion={sesion} animal={animal} establecimiento={establecimiento} />

      <div className="page-head">
        <h2>Historial</h2>
        <button className="btn" onClick={() => setMostrarEvento((v) => !v)}>
          {mostrarEvento ? 'Cerrar' : '+ Nuevo evento'}
        </button>
      </div>

      {mostrarEvento && (
        <NuevoEventoForm
          sesion={sesion}
          establecimiento={establecimiento}
          animalCampoId={animal.id}
          onCreado={() => {
            setMostrarEvento(false);
            cargar();
          }}
        />
      )}

      {error && <div className="alerta">{error}</div>}
      {cargando ? (
        <p className="muted">Cargando…</p>
      ) : eventos.length === 0 ? (
        <p className="muted">Todavía no hay eventos registrados para este animal.</p>
      ) : (
        <div className="card">
          <table className="tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Producto / detalle</th>
                <th>Retiro hasta</th>
              </tr>
            </thead>
            <tbody>
              {eventos.map((e) => (
                <tr key={e.id}>
                  <td>{e.fecha}</td>
                  <td>{ETIQUETAS_TIPO_EVENTO[e.tipo]}</td>
                  <td>{e.producto ?? e.observaciones ?? '—'}</td>
                  <td>{e.retiroHasta ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {animal.categoria === 'toro' && <EvaluacionAndrologicaSection sesion={sesion} animal={animal} />}
    </div>
  );
}

/** Fase E, §6.2: sólo tiene sentido para un toro cargado individualmente — apto/no apto lo calcula el backend. */
function EvaluacionAndrologicaSection({ sesion, animal }: { sesion: Sesion; animal: AnimalCampo }) {
  const [evaluaciones, setEvaluaciones] = useState<EvaluacionAndrologica[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [circunferencia, setCircunferencia] = useState('');
  const [motilidad, setMotilidad] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function cargar() {
    setCargando(true);
    try {
      setEvaluaciones(await api.evaluacionesAndrologicas(sesion, animal.id));
    } catch {
      /* silencioso: sección secundaria de la ficha */
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animal.id]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      await api.crearEvaluacionAndrologica(sesion, {
        animalCampoId: animal.id,
        circunferenciaEscrotalCm: Number(circunferencia),
        motilidadPorcentaje: Number(motilidad),
      });
      api.registrarEvento(sesion, 'accion', 'tropera-evaluacion-androlgica-crear');
      setCircunferencia('');
      setMotilidad('');
      setMostrarForm(false);
      cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <h2>Evaluación andrológica</h2>
        <button className="btn" onClick={() => setMostrarForm((v) => !v)}>
          {mostrarForm ? 'Cerrar' : '+ Nueva evaluación'}
        </button>
      </div>

      {mostrarForm && (
        <form className="card form-grid" onSubmit={guardar}>
          <label>
            Circunferencia escrotal (cm)
            <input type="number" step="0.1" min="0" value={circunferencia} onChange={(e) => setCircunferencia(e.target.value)} required />
          </label>
          <label>
            Motilidad (%)
            <input type="number" step="0.1" min="0" max="100" value={motilidad} onChange={(e) => setMotilidad(e.target.value)} required />
          </label>
          {error && <div className="alerta span-2">{error}</div>}
          <div className="span-2">
            <button className="btn" type="submit" disabled={guardando}>
              {guardando ? 'Calculando…' : 'Guardar y calcular aptitud'}
            </button>
          </div>
        </form>
      )}

      {!cargando && evaluaciones.length > 0 && (
        <div className="card">
          <table className="tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Circunferencia</th>
                <th>Motilidad</th>
                <th>Aptitud</th>
              </tr>
            </thead>
            <tbody>
              {evaluaciones.map((ev) => (
                <tr key={ev.id}>
                  <td>{ev.fecha}</td>
                  <td>{ev.circunferenciaEscrotalCm} cm</td>
                  <td>{ev.motilidadPorcentaje}%</td>
                  <td>
                    <span className="chip" style={{ background: ev.apto ? 'var(--verde)' : 'var(--danger)', color: '#fff' }}>
                      {ev.apto ? 'Apto' : 'No apto'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function EditarAnimalCampoForm({
  sesion,
  animal,
  potreros,
  retiroVigente,
  onGuardado,
  onCancelar,
}: {
  sesion: Sesion;
  animal: AnimalCampo;
  potreros: Potrero[];
  /** Fase E, §5.3: si viene cargado, cambiar de potrero exige confirmar (alerta modal explícita). */
  retiroVigente?: string;
  onGuardado: (a: AnimalCampo) => void;
  onCancelar: () => void;
}) {
  const [categoria, setCategoria] = useState<CategoriaHacienda>(animal.categoria);
  const [sexo, setSexo] = useState(animal.sexo ?? '');
  const [estado, setEstado] = useState<EstadoAnimalCampo>(animal.estado);
  const [potreroId, setPotreroId] = useState(animal.potreroId ?? '');
  const [observaciones, setObservaciones] = useState(animal.observaciones ?? '');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (retiroVigente && potreroId !== (animal.potreroId ?? '')) {
      const seguir = confirm(
        `Este animal tiene un retiro sanitario vigente hasta ${retiroVigente}. ¿Confirmar y continuar de todos modos?`,
      );
      if (!seguir) return;
    }
    setError(null);
    setGuardando(true);
    try {
      const actualizado = await api.actualizarAnimalCampo(sesion, animal.id, {
        categoria,
        estado,
        sexo: sexo || undefined,
        potreroId: potreroId || null,
        observaciones: observaciones || undefined,
      });
      api.registrarEvento(sesion, 'accion', 'tropera-animal-editar');
      onGuardado(actualizado);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="card form-grid" onSubmit={guardar}>
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
        Potrero (Apartados Rápidos, §5.3)
        <select value={potreroId} onChange={(e) => setPotreroId(e.target.value)}>
          <option value="">Sin asignar</option>
          {potreros.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
      </label>
      <label>
        Estado
        <select value={estado} onChange={(e) => setEstado(e.target.value as EstadoAnimalCampo)}>
          {(Object.keys(ETIQUETAS_ESTADO_ANIMAL) as EstadoAnimalCampo[]).map((s) => (
            <option key={s} value={s}>
              {ETIQUETAS_ESTADO_ANIMAL[s]}
            </option>
          ))}
        </select>
      </label>
      <label>
        Sexo
        <input value={sexo} onChange={(e) => setSexo(e.target.value)} />
      </label>
      <label className="span-2">
        Observaciones
        <input value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
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

/**
 * Fase E, §6.2: "Interfaz Caravana-Tubo" — cada muestra se numera con el
 * tubo siguiente al último registrado en el establecimiento; si el operador
 * carga un número que no continúa la secuencia, se avisa (no se bloquea:
 * puede ser una corrección legítima).
 */
function MuestreosSection({ sesion, establecimiento }: { sesion: Sesion; establecimiento: Establecimiento }) {
  const [muestras, setMuestras] = useState<Muestra[]>([]);
  const [ultimoTubo, setUltimoTubo] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const [m, u] = await Promise.all([
        api.muestras(sesion, establecimiento.id),
        api.ultimoTubo(sesion, establecimiento.id),
      ]);
      setMuestras(m);
      setUltimoTubo(u.ultimoTubo);
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
      <div className="page-head">
        <h2>Muestreos (caravana-tubo)</h2>
        <button className="btn" onClick={() => setMostrarForm((v) => !v)}>
          {mostrarForm ? 'Cerrar' : '+ Nueva muestra'}
        </button>
      </div>

      {mostrarForm && (
        <NuevaMuestraForm
          sesion={sesion}
          establecimiento={establecimiento}
          ultimoTubo={ultimoTubo}
          onCreada={() => {
            setMostrarForm(false);
            cargar();
          }}
        />
      )}

      {error && <div className="alerta">{error}</div>}
      {cargando ? (
        <p className="muted">Cargando…</p>
      ) : muestras.length === 0 ? (
        <p className="muted">Todavía no hay muestras registradas para este establecimiento.</p>
      ) : (
        <div className="card">
          <table className="tabla">
            <thead>
              <tr>
                <th>Tubo</th>
                <th>Caravana</th>
                <th>Tipo de muestra</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {muestras.map((m) => (
                <tr key={m.id}>
                  <td className="mono">{m.tuboNumero}</td>
                  <td>{m.caravana ?? '—'}</td>
                  <td>{m.tipoMuestra ?? '—'}</td>
                  <td>{m.fecha}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function NuevaMuestraForm({
  sesion,
  establecimiento,
  ultimoTubo,
  onCreada,
}: {
  sesion: Sesion;
  establecimiento: Establecimiento;
  ultimoTubo: number;
  onCreada: () => void;
}) {
  const [tuboNumero, setTuboNumero] = useState(String(ultimoTubo + 1));
  const [caravana, setCaravana] = useState('');
  const [tipoMuestra, setTipoMuestra] = useState('sangre');
  const [observaciones, setObservaciones] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const salto = Number(tuboNumero) > ultimoTubo + 1;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      const data: Record<string, unknown> = {
        establecimientoId: establecimiento.id,
        tuboNumero: Number(tuboNumero),
      };
      if (caravana) data.caravana = caravana;
      if (tipoMuestra) data.tipoMuestra = tipoMuestra;
      if (observaciones) data.observaciones = observaciones;
      await api.crearMuestra(sesion, data);
      api.registrarEvento(sesion, 'accion', 'tropera-muestra-crear');
      onCreada();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="card form-grid" onSubmit={guardar}>
      <label>
        Número de tubo
        <input
          type="number"
          min="1"
          step="1"
          value={tuboNumero}
          onChange={(e) => setTuboNumero(e.target.value)}
          required
        />
      </label>
      <label>
        Caravana (opcional)
        <input value={caravana} onChange={(e) => setCaravana(e.target.value)} placeholder="Ej: AR-4521" />
      </label>
      <label>
        Tipo de muestra
        <input value={tipoMuestra} onChange={(e) => setTipoMuestra(e.target.value)} placeholder="sangre, semen, tejido…" />
      </label>
      <label className="span-2">
        Observaciones (opcional)
        <input value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
      </label>
      {salto && (
        <p className="alerta span-2">
          ⚠ El último tubo registrado fue el {ultimoTubo} — este número salta el {ultimoTubo + 1}. Confirmá que es correcto.
        </p>
      )}
      {error && <div className="alerta span-2">{error}</div>}
      <div className="span-2">
        <button className="btn" type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar muestra'}
        </button>
      </div>
    </form>
  );
}

/** Modo Plantilla (§5.1): elegir una plantilla ya armada y aplicarla al animal en 1-tap. */
function AplicarPlantillaSection({
  sesion,
  animal,
  establecimiento,
  onAplicada,
}: {
  sesion: Sesion;
  animal: AnimalCampo;
  establecimiento: Establecimiento;
  onAplicada: () => void;
}) {
  const [plantillas, setPlantillas] = useState<PlantillaTareas[]>([]);
  const [plantillaId, setPlantillaId] = useState('');
  const [aplicando, setAplicando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    api.plantillasTareas(sesion).then(setPlantillas).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function aplicar() {
    if (!plantillaId) return;
    setAplicando(true);
    setMensaje(null);
    try {
      const creados = await api.aplicarPlantillaTareas(sesion, plantillaId, animal.id, establecimiento.id);
      api.registrarEvento(sesion, 'accion', 'tropera-plantilla-aplicar');
      setMensaje(`Se cargaron ${creados.length} eventos.`);
      onAplicada();
    } catch (err) {
      setMensaje('No se pudo aplicar: ' + (err instanceof Error ? err.message : 'error'));
    } finally {
      setAplicando(false);
    }
  }

  if (plantillas.length === 0) return null;

  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
      <span className="dato-label">Aplicar plantilla (1-tap, §5.1)</span>
      <select value={plantillaId} onChange={(e) => setPlantillaId(e.target.value)}>
        <option value="">Seleccionar…</option>
        {plantillas.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nombre} ({p.items.length} tareas)
          </option>
        ))}
      </select>
      <button className="btn" onClick={aplicar} disabled={!plantillaId || aplicando}>
        {aplicando ? 'Aplicando…' : 'Aplicar'}
      </button>
      {mensaje && <span className="muted">{mensaje}</span>}
    </div>
  );
}

/** Protocolos IATF (§6.2): aplicar genera las tareas programadas (día 0, 7, 9...) de una sola vez. */
function AplicarProtocoloSection({
  sesion,
  animal,
  establecimiento,
}: {
  sesion: Sesion;
  animal: AnimalCampo;
  establecimiento: Establecimiento;
}) {
  const [protocolos, setProtocolos] = useState<ProtocoloIatf[]>([]);
  const [protocoloId, setProtocoloId] = useState('');
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().slice(0, 10));
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [aplicando, setAplicando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.protocolosIatf(sesion).then(setProtocolos).catch(() => {});
    api.tareas(sesion, establecimiento.id, animal.id).then(setTareas).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animal.id]);

  async function aplicar() {
    if (!protocoloId) return;
    setAplicando(true);
    setError(null);
    try {
      const creadas = await api.aplicarProtocoloIatf(sesion, protocoloId, {
        animalCampoId: animal.id,
        establecimientoId: establecimiento.id,
        fechaInicio,
      });
      api.registrarEvento(sesion, 'accion', 'tropera-protocolo-aplicar');
      setTareas((prev) => [...prev, ...creadas].sort((a, b) => a.fechaProgramada.localeCompare(b.fechaProgramada)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo aplicar el protocolo');
    } finally {
      setAplicando(false);
    }
  }

  async function marcar(tarea: Tarea, estado: 'completada' | 'cancelada') {
    try {
      const actualizada = await api.actualizarTarea(sesion, tarea.id, { estado });
      api.registrarEvento(sesion, 'accion', 'tropera-tarea-marcar');
      setTareas((prev) => prev.map((t) => (t.id === tarea.id ? actualizada : t)));
    } catch (err) {
      alert('No se pudo actualizar: ' + (err instanceof Error ? err.message : 'error'));
    }
  }

  return (
    <div>
      <div className="page-head">
        <h2>Protocolo IATF</h2>
      </div>
      {protocolos.length > 0 && (
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <select value={protocoloId} onChange={(e) => setProtocoloId(e.target.value)}>
            <option value="">Seleccionar protocolo…</option>
            {protocolos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} ({p.pasos.length} pasos)
              </option>
            ))}
          </select>
          <label style={{ margin: 0 }}>
            <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} style={{ margin: 0 }} />
          </label>
          <button className="btn" onClick={aplicar} disabled={!protocoloId || aplicando}>
            {aplicando ? 'Generando…' : 'Aplicar (genera tareas)'}
          </button>
        </div>
      )}
      {error && <div className="alerta">{error}</div>}
      {tareas.length === 0 ? (
        <p className="muted">Sin tareas programadas para este animal.</p>
      ) : (
        <div className="card">
          <table className="tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Descripción</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {tareas.map((t) => (
                <tr key={t.id}>
                  <td>{t.fechaProgramada}</td>
                  <td>{t.descripcion}{t.producto ? ` · ${t.producto}` : ''}</td>
                  <td>{ETIQUETAS_ESTADO_TAREA[t.estado]}</td>
                  <td>
                    {t.estado === 'pendiente' && (
                      <>
                        <button className="link" onClick={() => marcar(t, 'completada')}>
                          Completar
                        </button>{' '}
                        <button className="link" onClick={() => marcar(t, 'cancelada')}>
                          Cancelar
                        </button>
                      </>
                    )}
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

const ETIQUETAS_ESTADO_TAREA: Record<Tarea['estado'], string> = {
  pendiente: 'Pendiente',
  completada: 'Completada',
  cancelada: 'Cancelada',
};

/** Gestión de catálogos org-wide de Fase E.5/E.6: crear plantillas de tareas y protocolos IATF. */
function PlantillasYProtocolosSection({ sesion }: { sesion: Sesion }) {
  const [seccion, setSeccion] = useState<'plantillas' | 'protocolos'>('plantillas');

  return (
    <div>
      <div className="page-head">
        <h2>Plantillas y protocolos (catálogos)</h2>
      </div>
      <div className="tabs-secciones">
        <button className={seccion === 'plantillas' ? 'btn' : 'btn-ghost'} onClick={() => setSeccion('plantillas')}>
          Plantillas de tareas
        </button>
        <button className={seccion === 'protocolos' ? 'btn' : 'btn-ghost'} onClick={() => setSeccion('protocolos')}>
          Protocolos IATF
        </button>
      </div>
      {seccion === 'plantillas' ? <GestorPlantillas sesion={sesion} /> : <GestorProtocolos sesion={sesion} />}
    </div>
  );
}

function GestorPlantillas({ sesion }: { sesion: Sesion }) {
  const [plantillas, setPlantillas] = useState<PlantillaTareas[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nombre, setNombre] = useState('');
  const [items, setItems] = useState<{ tipo: TipoEvento; producto: string }[]>([{ tipo: 'vacunacion', producto: '' }]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function cargar() {
    setCargando(true);
    try {
      setPlantillas(await api.plantillasTareas(sesion));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      await api.crearPlantillaTareas(sesion, {
        nombre,
        items: items.map((it) => ({ tipo: it.tipo, producto: it.producto || undefined })),
      });
      api.registrarEvento(sesion, 'accion', 'tropera-plantilla-crear');
      setNombre('');
      setItems([{ tipo: 'vacunacion', producto: '' }]);
      setMostrarForm(false);
      cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div>
      <button className="btn-ghost" onClick={() => setMostrarForm((v) => !v)} style={{ marginBottom: '0.75rem' }}>
        {mostrarForm ? 'Cerrar' : '+ Nueva plantilla'}
      </button>
      {mostrarForm && (
        <form className="card form-grid" onSubmit={guardar}>
          <label className="span-2">
            Nombre
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Rutina de manga" required />
          </label>
          {items.map((item, i) => (
            <div key={i} className="span-2" style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <select
                value={item.tipo}
                onChange={(e) => setItems((prev) => prev.map((it, j) => (j === i ? { ...it, tipo: e.target.value as TipoEvento } : it)))}
              >
                {(Object.keys(ETIQUETAS_TIPO_EVENTO) as TipoEvento[]).map((t) => (
                  <option key={t} value={t}>
                    {ETIQUETAS_TIPO_EVENTO[t]}
                  </option>
                ))}
              </select>
              <input
                value={item.producto}
                onChange={(e) => setItems((prev) => prev.map((it, j) => (j === i ? { ...it, producto: e.target.value } : it)))}
                placeholder="Producto (opcional)"
              />
              {items.length > 1 && (
                <button type="button" className="link" onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))}>
                  Quitar
                </button>
              )}
            </div>
          ))}
          <div className="span-2">
            <button type="button" className="link" onClick={() => setItems((prev) => [...prev, { tipo: 'vacunacion', producto: '' }])}>
              + Agregar tarea a la plantilla
            </button>
          </div>
          {error && <div className="alerta span-2">{error}</div>}
          <div className="span-2">
            <button className="btn" type="submit" disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar plantilla'}
            </button>
          </div>
        </form>
      )}
      {cargando ? (
        <p className="muted">Cargando…</p>
      ) : plantillas.length === 0 ? (
        <p className="muted">Todavía no hay plantillas cargadas.</p>
      ) : (
        <div className="card">
          {plantillas.map((p) => (
            <div key={p.id} style={{ marginBottom: '0.5rem' }}>
              <b>{p.nombre}</b>: {p.items.map((it) => ETIQUETAS_TIPO_EVENTO[it.tipo]).join(' + ')}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GestorProtocolos({ sesion }: { sesion: Sesion }) {
  const [protocolos, setProtocolos] = useState<ProtocoloIatf[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [pasos, setPasos] = useState<{ diaOffset: string; descripcion: string; producto: string }[]>([
    { diaOffset: '0', descripcion: '', producto: '' },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function cargar() {
    setCargando(true);
    try {
      setProtocolos(await api.protocolosIatf(sesion));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      await api.crearProtocoloIatf(sesion, {
        nombre,
        descripcion: descripcion || undefined,
        pasos: pasos.map((p) => ({
          diaOffset: Number(p.diaOffset),
          descripcion: p.descripcion,
          producto: p.producto || undefined,
        })),
      });
      api.registrarEvento(sesion, 'accion', 'tropera-protocolo-crear');
      setNombre('');
      setDescripcion('');
      setPasos([{ diaOffset: '0', descripcion: '', producto: '' }]);
      setMostrarForm(false);
      cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div>
      <button className="btn-ghost" onClick={() => setMostrarForm((v) => !v)} style={{ marginBottom: '0.75rem' }}>
        {mostrarForm ? 'Cerrar' : '+ Nuevo protocolo'}
      </button>
      {mostrarForm && (
        <form className="card form-grid" onSubmit={guardar}>
          <label className="span-2">
            Nombre
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: IATF estándar" required />
          </label>
          <label className="span-2">
            Descripción (opcional)
            <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          </label>
          {pasos.map((paso, i) => (
            <div key={i} className="span-2" style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input
                type="number"
                value={paso.diaOffset}
                onChange={(e) => setPasos((prev) => prev.map((p, j) => (j === i ? { ...p, diaOffset: e.target.value } : p)))}
                placeholder="Día"
                style={{ maxWidth: '5rem' }}
                required
              />
              <input
                value={paso.descripcion}
                onChange={(e) => setPasos((prev) => prev.map((p, j) => (j === i ? { ...p, descripcion: e.target.value } : p)))}
                placeholder="Descripción del paso"
                required
              />
              <input
                value={paso.producto}
                onChange={(e) => setPasos((prev) => prev.map((p, j) => (j === i ? { ...p, producto: e.target.value } : p)))}
                placeholder="Producto (opcional)"
              />
              {pasos.length > 1 && (
                <button type="button" className="link" onClick={() => setPasos((prev) => prev.filter((_, j) => j !== i))}>
                  Quitar
                </button>
              )}
            </div>
          ))}
          <div className="span-2">
            <button
              type="button"
              className="link"
              onClick={() => setPasos((prev) => [...prev, { diaOffset: '0', descripcion: '', producto: '' }])}
            >
              + Agregar paso
            </button>
          </div>
          {error && <div className="alerta span-2">{error}</div>}
          <div className="span-2">
            <button className="btn" type="submit" disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar protocolo'}
            </button>
          </div>
        </form>
      )}
      {cargando ? (
        <p className="muted">Cargando…</p>
      ) : protocolos.length === 0 ? (
        <p className="muted">Todavía no hay protocolos cargados.</p>
      ) : (
        <div className="card">
          {protocolos.map((p) => (
            <div key={p.id} style={{ marginBottom: '0.5rem' }}>
              <b>{p.nombre}</b>: {p.pasos.map((paso) => `día ${paso.diaOffset} (${paso.descripcion})`).join(' → ')}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Agenda de campo (§5.1/§6.2): tareas programadas del establecimiento, no ligadas a la ficha de un animal puntual. */
function TareasSection({ sesion, establecimiento }: { sesion: Sesion; establecimiento: Establecimiento }) {
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [cargando, setCargando] = useState(true);
  const [soloPendientes, setSoloPendientes] = useState(true);

  async function cargar() {
    setCargando(true);
    try {
      setTareas(await api.tareas(sesion, establecimiento.id, undefined, soloPendientes ? 'pendiente' : undefined));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [establecimiento.id, soloPendientes]);

  async function marcar(tarea: Tarea, estado: 'completada' | 'cancelada') {
    try {
      await api.actualizarTarea(sesion, tarea.id, { estado });
      api.registrarEvento(sesion, 'accion', 'tropera-tarea-marcar');
      cargar();
    } catch (err) {
      alert('No se pudo actualizar: ' + (err instanceof Error ? err.message : 'error'));
    }
  }

  return (
    <div>
      <div className="page-head">
        <h2>Agenda de tareas</h2>
      </div>
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
        <input
          type="checkbox"
          checked={soloPendientes}
          onChange={(e) => setSoloPendientes(e.target.checked)}
          style={{ width: 'auto', margin: 0 }}
        />
        Sólo pendientes
      </label>
      {cargando ? (
        <p className="muted">Cargando…</p>
      ) : tareas.length === 0 ? (
        <p className="muted">Sin tareas para este filtro.</p>
      ) : (
        <div className="card">
          <table className="tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Descripción</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {tareas.map((t) => (
                <tr key={t.id}>
                  <td>{t.fechaProgramada}</td>
                  <td>{t.descripcion}{t.producto ? ` · ${t.producto}` : ''}</td>
                  <td>{ETIQUETAS_ESTADO_TAREA[t.estado]}</td>
                  <td>
                    {t.estado === 'pendiente' && (
                      <>
                        <button className="link" onClick={() => marcar(t, 'completada')}>
                          Completar
                        </button>{' '}
                        <button className="link" onClick={() => marcar(t, 'cancelada')}>
                          Cancelar
                        </button>
                      </>
                    )}
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
      api.registrarEvento(sesion, 'accion', 'tropera-movimiento-crear');
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
      api.registrarEvento(sesion, 'accion', 'tropera-existencia-corregir');
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
      api.registrarEvento(sesion, 'accion', 'tropera-establecimiento-editar');
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

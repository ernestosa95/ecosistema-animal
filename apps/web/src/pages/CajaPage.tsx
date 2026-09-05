// apps/web/src/pages/CajaPage.tsx
// Fase D del spec UI/UX: §2.6 caja chica y cierre, §4.1 auditoría de cierres,
// §4.4 liquidación de honorarios. Alcance acordado con el usuario antes de
// codear (2026-08-29): una caja diaria por organización, cobros con concepto
// libre + monto (sin catálogo de precios de servicios), honorarios sin
// cálculo automático de comisión, egresos sin categorías.
import { useEffect, useState } from 'react';
import { api, type Veterinario } from '../api/client';
import type { Sesion, Caja, Cobro, Egreso, Producto, EstadoAuditoriaCaja, EstadisticasCaja } from '../api/types';

const ROLES_AUDITORIA_HONORARIOS = new Set(['propietario', 'admin']);

const ESTADO_AUDITORIA_LABEL: Record<EstadoAuditoriaCaja, string> = {
  pendiente: 'Pendiente',
  aceptado: 'Aceptado',
  en_revision: 'En revisión',
  rechazado: 'Rechazado',
};

type Seccion = 'mostrador' | 'auditoria' | 'honorarios' | 'estadisticas';

export function CajaPage({ sesion }: { sesion: Sesion }) {
  const esGerencia = sesion.roles.some((r) => ROLES_AUDITORIA_HONORARIOS.has(r));
  const [seccion, setSeccion] = useState<Seccion>('mostrador');

  return (
    <div>
      <div className="page-head">
        <h1>Caja</h1>
      </div>

      {esGerencia && (
        <div className="tabs-secciones">
          <button
            className={seccion === 'mostrador' ? 'btn' : 'btn-ghost'}
            onClick={() => setSeccion('mostrador')}
          >
            Caja del día
          </button>
          <button
            className={seccion === 'auditoria' ? 'btn' : 'btn-ghost'}
            onClick={() => setSeccion('auditoria')}
          >
            Auditoría de cierres
          </button>
          <button
            className={seccion === 'honorarios' ? 'btn' : 'btn-ghost'}
            onClick={() => setSeccion('honorarios')}
          >
            Honorarios
          </button>
          <button
            className={seccion === 'estadisticas' ? 'btn' : 'btn-ghost'}
            onClick={() => setSeccion('estadisticas')}
          >
            Estadísticas
          </button>
        </div>
      )}

      {seccion === 'mostrador' && <Mostrador sesion={sesion} />}
      {seccion === 'auditoria' && esGerencia && <AuditoriaCierres sesion={sesion} />}
      {seccion === 'honorarios' && esGerencia && <Honorarios sesion={sesion} />}
      {seccion === 'estadisticas' && esGerencia && <Estadisticas sesion={sesion} />}
    </div>
  );
}

/** §2.6: la caja del día — abrir, cobrar, registrar egresos, cerrar con arqueo. */
function Mostrador({ sesion }: { sesion: Sesion }) {
  const [caja, setCaja] = useState<Caja | null>(null);
  const [cobros, setCobros] = useState<Cobro[]>([]);
  const [egresos, setEgresos] = useState<Egreso[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [veterinarios, setVeterinarios] = useState<Veterinario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mostrarCierre, setMostrarCierre] = useState(false);
  const [ultimoCierre, setUltimoCierre] = useState<Caja | null>(null);

  async function cargar() {
    setCargando(true);
    setError(null);
    setMostrarCierre(false);
    try {
      const [actual, prods, vets] = await Promise.all([
        api.cajaActual(sesion),
        api.productos(sesion),
        api.veterinarios(sesion),
      ]);
      setCaja(actual);
      setProductos(prods);
      setVeterinarios(vets);
      if (actual) {
        const [c, e] = await Promise.all([api.cobrosDeCaja(sesion, actual.id), api.egresosDeCaja(sesion, actual.id)]);
        setCobros(c);
        setEgresos(e);
      } else {
        setCobros([]);
        setEgresos([]);
      }
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

  const totalCobros = cobros.reduce((acc, c) => acc + Number(c.monto), 0);
  const totalEgresos = egresos.reduce((acc, e) => acc + Number(e.monto), 0);
  const calculado = caja ? Number(caja.montoInicial) + totalCobros - totalEgresos : 0;

  if (cargando) return <p className="muted">Cargando…</p>;
  if (error) return <div className="alerta">{error}</div>;

  if (ultimoCierre) {
    return (
      <div className="card">
        <div className="form-titulo">Caja cerrada</div>
        <p>
          Calculado: <b>${ultimoCierre.montoCalculado}</b> · Declarado: <b>${ultimoCierre.montoDeclarado}</b> · Diferencia:{' '}
          <b style={{ color: Number(ultimoCierre.diferencia) === 0 ? 'var(--verde)' : 'var(--danger)' }}>
            ${ultimoCierre.diferencia}
          </b>
        </p>
        {Number(ultimoCierre.diferencia) !== 0 && (
          <p className="muted">Como hubo diferencia, este cierre quedó pendiente de auditoría.</p>
        )}
        <button
          className="btn"
          onClick={() => {
            setUltimoCierre(null);
            cargar();
          }}
        >
          Volver
        </button>
      </div>
    );
  }

  if (!caja) {
    return <AbrirCajaForm sesion={sesion} onAbierta={cargar} />;
  }

  return (
    <div>
      <div className="card ficha-datos" style={{ marginBottom: '1rem' }}>
        <div className="dato">
          <span className="dato-label">Monto inicial</span>
          <strong>${caja.montoInicial}</strong>
        </div>
        <div className="dato">
          <span className="dato-label">Cobros</span>
          <strong>${totalCobros.toFixed(2)}</strong>
        </div>
        <div className="dato">
          <span className="dato-label">Egresos</span>
          <strong>${totalEgresos.toFixed(2)}</strong>
        </div>
        <div className="dato">
          <span className="dato-label">Total calculado</span>
          <strong style={{ fontSize: '1.3rem' }}>${calculado.toFixed(2)}</strong>
        </div>
      </div>

      <div className="page-head">
        <h2>Cobros</h2>
      </div>
      <NuevoCobroForm sesion={sesion} productos={productos} veterinarios={veterinarios} onCreado={cargar} />
      {cobros.length === 0 ? (
        <p className="muted">Todavía no hay cobros en esta caja.</p>
      ) : (
        <>
          <div className="card">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Concepto</th>
                  <th>Monto</th>
                  <th>Método</th>
                  <th>Profesional</th>
                </tr>
              </thead>
              <tbody>
                {cobros.map((c) => (
                  <tr key={c.id}>
                    <td>{new Date(c.createdAt).toLocaleTimeString()}</td>
                    <td>{c.concepto}</td>
                    <td>${c.monto}</td>
                    <td>{c.metodoPago ?? '—'}</td>
                    <td>{nombreVeterinario(veterinarios, c.veterinarioId)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="page-head">
        <h2>Egresos</h2>
      </div>
      <NuevoEgresoForm sesion={sesion} onCreado={cargar} />
      {egresos.length === 0 ? (
        <p className="muted">Todavía no hay egresos en esta caja.</p>
      ) : (
        <div className="card">
          <table className="tabla">
            <thead>
              <tr>
                <th>Hora</th>
                <th>Concepto</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
              {egresos.map((e) => (
                <tr key={e.id}>
                  <td>{new Date(e.createdAt).toLocaleTimeString()}</td>
                  <td>{e.concepto}</td>
                  <td>${e.monto}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="page-head">
        <h2>Cierre</h2>
        <button className="btn" onClick={() => setMostrarCierre((v) => !v)}>
          {mostrarCierre ? 'Cerrar' : 'Cerrar caja'}
        </button>
      </div>
      {mostrarCierre && (
        <CerrarCajaForm sesion={sesion} caja={caja} calculado={calculado} onCerrada={setUltimoCierre} />
      )}
    </div>
  );
}

function nombreVeterinario(veterinarios: Veterinario[], id?: string | null): string {
  if (!id) return '—';
  const v = veterinarios.find((x) => x.usuarioId === id);
  return v ? `${v.nombre ?? ''} ${v.apellido ?? ''}`.trim() || '—' : '—';
}

function AbrirCajaForm({ sesion, onAbierta }: { sesion: Sesion; onAbierta: () => void }) {
  const [montoInicial, setMontoInicial] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function abrir(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      await api.abrirCaja(sesion, Number(montoInicial || 0));
      api.registrarEvento(sesion, 'accion', 'caja-abrir');
      onAbierta();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo abrir la caja');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="card form-grid" onSubmit={abrir}>
      <div className="form-titulo span-2">No hay ninguna caja abierta</div>
      <label className="span-2">
        Monto inicial
        <input
          type="number"
          step="0.01"
          min="0"
          value={montoInicial}
          onChange={(e) => setMontoInicial(e.target.value)}
          placeholder="0"
        />
      </label>
      {error && <div className="alerta span-2">{error}</div>}
      <div className="span-2">
        <button className="btn" type="submit" disabled={guardando}>
          {guardando ? 'Abriendo…' : 'Abrir caja'}
        </button>
      </div>
    </form>
  );
}

function NuevoCobroForm({
  sesion,
  productos,
  veterinarios,
  onCreado,
}: {
  sesion: Sesion;
  productos: Producto[];
  veterinarios: Veterinario[];
  onCreado: () => void;
}) {
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState('');
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [veterinarioId, setVeterinarioId] = useState('');
  const [productoId, setProductoId] = useState('');
  const [cantidad, setCantidad] = useState('1');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const productoSel = productos.find((p) => p.id === productoId) ?? null;

  useEffect(() => {
    if (!productoSel) return;
    // Al elegir un producto con precio cargado, sugiere el monto (cantidad × precio) — el operador lo puede corregir.
    if (productoSel.precio) {
      setMonto((Number(productoSel.precio) * Number(cantidad || 1)).toFixed(2));
    }
    if (!concepto) setConcepto(`Venta: ${productoSel.nombre}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productoId]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      const data: Record<string, unknown> = { concepto, monto: Number(monto), metodoPago };
      if (veterinarioId) data.veterinarioId = veterinarioId;
      if (productoId) {
        data.productoId = productoId;
        data.cantidad = Number(cantidad);
      }
      await api.crearCobro(sesion, data);
      api.registrarEvento(sesion, 'accion', 'cobro-crear');

      if (productoId && Number(cantidad) > 0) {
        try {
          await api.crearMovimientoStock(sesion, {
            productoId,
            tipo: 'venta',
            cantidad: Number(cantidad),
            observaciones: 'Venta de mostrador',
          });
        } catch (errStock) {
          setError(
            'El cobro se guardó, pero no se pudo descontar el stock: ' +
              (errStock instanceof Error ? errStock.message : 'error'),
          );
        }
      }

      setConcepto('');
      setMonto('');
      setVeterinarioId('');
      setProductoId('');
      setCantidad('1');
      onCreado();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el cobro');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="card form-grid" onSubmit={guardar} style={{ marginBottom: '1rem' }}>
      <label>
        Producto (opcional — si es venta de mostrador)
        <select value={productoId} onChange={(e) => setProductoId(e.target.value)}>
          <option value="">Sin producto (servicio)</option>
          {productos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
              {p.precio ? ` · $${p.precio}` : ''}
            </option>
          ))}
        </select>
      </label>
      {productoId && (
        <label>
          Cantidad
          <input type="number" min="1" step="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
        </label>
      )}
      <label className="span-2">
        Concepto
        <input value={concepto} onChange={(e) => setConcepto(e.target.value)} required />
      </label>
      <label>
        Monto
        <input type="number" step="0.01" min="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} required />
      </label>
      <label>
        Método de pago
        <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
          <option value="efectivo">Efectivo</option>
          <option value="tarjeta">Tarjeta</option>
          <option value="transferencia">Transferencia</option>
          <option value="otro">Otro</option>
        </select>
      </label>
      <label className="span-2">
        Profesional (opcional, para honorarios)
        <select value={veterinarioId} onChange={(e) => setVeterinarioId(e.target.value)}>
          <option value="">Sin asignar</option>
          {veterinarios.map((v) => (
            <option key={v.usuarioId} value={v.usuarioId}>
              {v.nombre} {v.apellido}
            </option>
          ))}
        </select>
      </label>
      {error && <div className="alerta span-2">{error}</div>}
      <div className="span-2">
        <button className="btn" type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Registrar cobro'}
        </button>
      </div>
    </form>
  );
}

function NuevoEgresoForm({ sesion, onCreado }: { sesion: Sesion; onCreado: () => void }) {
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      await api.crearEgreso(sesion, { concepto, monto: Number(monto) });
      api.registrarEvento(sesion, 'accion', 'egreso-crear');
      setConcepto('');
      setMonto('');
      onCreado();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el egreso');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="card form-grid" onSubmit={guardar} style={{ marginBottom: '1rem' }}>
      <label className="span-2">
        Concepto
        <input value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder="Ej: compra de insumos" required />
      </label>
      <label>
        Monto
        <input type="number" step="0.01" min="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} required />
      </label>
      {error && <div className="alerta span-2">{error}</div>}
      <div className="span-2">
        <button className="btn-ghost" type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : '+ Registrar egreso'}
        </button>
      </div>
    </form>
  );
}

function CerrarCajaForm({
  sesion,
  caja,
  calculado,
  onCerrada,
}: {
  sesion: Sesion;
  caja: Caja;
  calculado: number;
  onCerrada: (caja: Caja) => void;
}) {
  const [montoDeclarado, setMontoDeclarado] = useState(calculado.toFixed(2));
  const [observaciones, setObservaciones] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const diferencia = Number(montoDeclarado || 0) - calculado;

  async function cerrar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      const cerrada = await api.cerrarCaja(sesion, caja.id, {
        montoDeclarado: Number(montoDeclarado),
        observaciones: observaciones || undefined,
      });
      api.registrarEvento(sesion, 'accion', 'caja-cerrar');
      onCerrada(cerrada);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cerrar la caja');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="card form-grid" onSubmit={cerrar}>
      <p className="span-2 muted">
        Total calculado por el sistema: <b>${calculado.toFixed(2)}</b>. Contá el dinero físico y declarálo abajo.
      </p>
      <label>
        Dinero contado (arqueo)
        <input
          type="number"
          step="0.01"
          min="0"
          value={montoDeclarado}
          onChange={(e) => setMontoDeclarado(e.target.value)}
          required
        />
      </label>
      <label>
        Diferencia
        <input
          value={diferencia.toFixed(2)}
          disabled
          style={{ color: diferencia === 0 ? 'var(--verde)' : 'var(--danger)', fontWeight: 700 }}
        />
      </label>
      <label className="span-2">
        Observaciones (opcional)
        <input value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
      </label>
      {diferencia !== 0 && (
        <p className="span-2 muted">Como hay una diferencia, este cierre va a quedar pendiente de auditoría.</p>
      )}
      {error && <div className="alerta span-2">{error}</div>}
      <div className="span-2">
        <button className="btn" type="submit" disabled={guardando}>
          {guardando ? 'Cerrando…' : 'Confirmar cierre'}
        </button>
      </div>
    </form>
  );
}

/** §4.1: bandeja de auditoría — cierres con diferencia, para que propietario/gerente decida. */
function AuditoriaCierres({ sesion }: { sesion: Sesion }) {
  const [filtro, setFiltro] = useState<EstadoAuditoriaCaja | 'todas'>('pendiente');
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [auditandoId, setAuditandoId] = useState<string | null>(null);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      setCajas(await api.cajas(sesion, filtro === 'todas' ? undefined : filtro));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro]);

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {(['pendiente', 'en_revision', 'rechazado', 'aceptado', 'todas'] as const).map((f) => (
          <button key={f} className={filtro === f ? 'btn' : 'btn-ghost'} onClick={() => setFiltro(f)}>
            {f === 'todas' ? 'Todas' : ESTADO_AUDITORIA_LABEL[f]}
          </button>
        ))}
      </div>

      {error && <div className="alerta">{error}</div>}
      {cargando ? (
        <p className="muted">Cargando…</p>
      ) : cajas.length === 0 ? (
        <p className="muted">No hay cierres para este filtro.</p>
      ) : (
        <div className="card">
          <table className="tabla">
            <thead>
              <tr>
                <th>Cierre</th>
                <th>Calculado</th>
                <th>Declarado</th>
                <th>Diferencia</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {cajas.map((c) =>
                auditandoId === c.id ? (
                  <tr key={c.id}>
                    <td colSpan={6}>
                      <AuditarCajaForm
                        sesion={sesion}
                        caja={c}
                        onListo={() => {
                          setAuditandoId(null);
                          cargar();
                        }}
                        onCancelar={() => setAuditandoId(null)}
                      />
                    </td>
                  </tr>
                ) : (
                  <tr key={c.id}>
                    <td>{c.cerradaEn ? new Date(c.cerradaEn).toLocaleString() : '—'}</td>
                    <td>${c.montoCalculado}</td>
                    <td>${c.montoDeclarado}</td>
                    <td style={{ color: Number(c.diferencia) === 0 ? 'var(--verde)' : 'var(--danger)' }}>
                      ${c.diferencia}
                    </td>
                    <td>
                      <span className="chip">{c.estadoAuditoria ? ESTADO_AUDITORIA_LABEL[c.estadoAuditoria] : '—'}</span>
                    </td>
                    <td>
                      <button className="link" onClick={() => setAuditandoId(c.id)}>
                        Revisar
                      </button>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AuditarCajaForm({
  sesion,
  caja,
  onListo,
  onCancelar,
}: {
  sesion: Sesion;
  caja: Caja;
  onListo: () => void;
  onCancelar: () => void;
}) {
  const [estadoAuditoria, setEstadoAuditoria] = useState<'aceptado' | 'en_revision' | 'rechazado'>('aceptado');
  const [observaciones, setObservaciones] = useState(caja.observacionesAuditoria ?? '');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (estadoAuditoria !== 'aceptado' && !observaciones.trim()) {
      setError('Hace falta una observación para "en revisión" o "rechazado".');
      return;
    }
    setError(null);
    setGuardando(true);
    try {
      await api.auditarCaja(sesion, caja.id, { estadoAuditoria, observaciones: observaciones || undefined });
      api.registrarEvento(sesion, 'accion', 'caja-auditar');
      onListo();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="card form-grid" onSubmit={guardar}>
      {caja.observacionesCierre && (
        <p className="span-2 muted">Observación de quien cerró: "{caja.observacionesCierre}"</p>
      )}
      <label className="span-2">
        Decisión
        <select value={estadoAuditoria} onChange={(e) => setEstadoAuditoria(e.target.value as typeof estadoAuditoria)}>
          <option value="aceptado">Aceptar</option>
          <option value="en_revision">Dejar en revisión</option>
          <option value="rechazado">Rechazar</option>
        </select>
      </label>
      <label className="span-2">
        Observaciones {estadoAuditoria !== 'aceptado' && '(obligatorio)'}
        <input value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
      </label>
      {error && <div className="alerta span-2">{error}</div>}
      <div className="span-2 acciones">
        <button className="btn" type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Confirmar'}
        </button>
        <button className="btn-ghost" type="button" onClick={onCancelar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

/** §4.4: consolidado de cobros imputados a un profesional, con "marcar como liquidado" (reinicia el acumulador). */
function Honorarios({ sesion }: { sesion: Sesion }) {
  const [veterinarios, setVeterinarios] = useState<Veterinario[]>([]);
  const [veterinarioId, setVeterinarioId] = useState('');
  const primerDiaMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [desde, setDesde] = useState(primerDiaMes);
  const [hasta, setHasta] = useState(new Date().toISOString().slice(0, 10));
  const [cobros, setCobros] = useState<Cobro[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liquidando, setLiquidando] = useState(false);

  useEffect(() => {
    api.veterinarios(sesion).then(setVeterinarios).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function buscar() {
    if (!veterinarioId) {
      setError('Elegí un profesional.');
      return;
    }
    setCargando(true);
    setError(null);
    try {
      setCobros(await api.honorarios(sesion, desde, `${hasta}T23:59:59`, veterinarioId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar');
    } finally {
      setCargando(false);
    }
  }

  const pendientes = cobros.filter((c) => !c.liquidado);
  const totalPendiente = pendientes.reduce((acc, c) => acc + Number(c.monto), 0);
  const totalTodo = cobros.reduce((acc, c) => acc + Number(c.monto), 0);

  async function liquidar() {
    if (!confirm('¿Marcar todos los cobros no liquidados de este rango como liquidados?')) return;
    setLiquidando(true);
    try {
      await api.liquidarHonorarios(sesion, { veterinarioId, desde, hasta: `${hasta}T23:59:59` });
      api.registrarEvento(sesion, 'accion', 'honorarios-liquidar');
      buscar();
    } catch (err) {
      alert('No se pudo liquidar: ' + (err instanceof Error ? err.message : 'error'));
    } finally {
      setLiquidando(false);
    }
  }

  return (
    <div>
      <div className="card form-grid" style={{ marginBottom: '1rem' }}>
        <label className="span-2">
          Profesional
          <select value={veterinarioId} onChange={(e) => setVeterinarioId(e.target.value)}>
            <option value="">Seleccionar…</option>
            {veterinarios.map((v) => (
              <option key={v.usuarioId} value={v.usuarioId}>
                {v.nombre} {v.apellido}
              </option>
            ))}
          </select>
        </label>
        <label>
          Desde
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </label>
        <label>
          Hasta
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </label>
        <div className="span-2">
          <button className="btn" type="button" onClick={buscar} disabled={cargando}>
            {cargando ? 'Buscando…' : 'Buscar'}
          </button>
        </div>
      </div>

      {error && <div className="alerta">{error}</div>}

      {cobros.length > 0 && (
        <>
          <div className="card ficha-datos" style={{ marginBottom: '1rem' }}>
            <div className="dato">
              <span className="dato-label">Total del rango</span>
              <strong>${totalTodo.toFixed(2)}</strong>
            </div>
            <div className="dato">
              <span className="dato-label">Pendiente de liquidar</span>
              <strong style={{ color: totalPendiente > 0 ? 'var(--danger)' : 'var(--verde)' }}>
                ${totalPendiente.toFixed(2)}
              </strong>
            </div>
          </div>

          <div className="card">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Concepto</th>
                  <th>Monto</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {cobros.map((c) => (
                  <tr key={c.id}>
                    <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td>{c.concepto}</td>
                    <td>${c.monto}</td>
                    <td>
                      <span className="chip" style={!c.liquidado ? { opacity: 0.6 } : undefined}>
                        {c.liquidado ? 'Liquidado' : 'Pendiente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pendientes.length > 0 && (
            <div style={{ marginTop: '0.75rem' }}>
              <button className="btn" onClick={liquidar} disabled={liquidando}>
                {liquidando ? 'Liquidando…' : `Marcar como liquidado (${pendientes.length})`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Totales del período para un análisis rápido — cobros/egresos/neto, por método de pago y por día. */
function Estadisticas({ sesion }: { sesion: Sesion }) {
  const hace30Dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [desde, setDesde] = useState(hace30Dias);
  const [hasta, setHasta] = useState(new Date().toISOString().slice(0, 10));
  const [datos, setDatos] = useState<EstadisticasCaja | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function buscar() {
    setCargando(true);
    setError(null);
    try {
      setDatos(await api.estadisticasCaja(sesion, desde, `${hasta}T23:59:59`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    buscar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="card form-grid" style={{ marginBottom: '1rem' }}>
        <label>
          Desde
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </label>
        <label>
          Hasta
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </label>
        <div className="span-2">
          <button className="btn" type="button" onClick={buscar} disabled={cargando}>
            {cargando ? 'Buscando…' : 'Actualizar'}
          </button>
        </div>
      </div>

      {error && <div className="alerta">{error}</div>}

      {datos && (
        <>
          <div className="card ficha-datos" style={{ marginBottom: '1rem' }}>
            <div className="dato">
              <span className="dato-label">Cobros</span>
              <strong>${datos.totalCobros.toFixed(2)}</strong>
            </div>
            <div className="dato">
              <span className="dato-label">Egresos</span>
              <strong>${datos.totalEgresos.toFixed(2)}</strong>
            </div>
            <div className="dato">
              <span className="dato-label">Neto</span>
              <strong style={{ color: datos.neto >= 0 ? 'var(--verde)' : 'var(--danger)' }}>
                ${datos.neto.toFixed(2)}
              </strong>
            </div>
            <div className="dato">
              <span className="dato-label">Cobros cargados</span>
              <strong>{datos.cantidadCobros}</strong>
            </div>
            <div className="dato">
              <span className="dato-label">Cajas abiertas en el rango</span>
              <strong>{datos.cantidadCajas}</strong>
            </div>
          </div>

          <div className="layout-2col">
            <div className="layout-main">
              <h2 className="form-titulo">Por día</h2>
              {datos.porDia.length === 0 ? (
                <p className="muted">Sin movimientos en este rango.</p>
              ) : (
                <div className="card">
                  <table className="tabla">
                    <thead>
                      <tr>
                        <th>Día</th>
                        <th>Cobros</th>
                        <th>Egresos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {datos.porDia.map((d) => (
                        <tr key={d.fecha}>
                          <td>{new Date(`${d.fecha}T00:00:00`).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                          <td>${d.totalCobros.toFixed(2)}</td>
                          <td>${d.totalEgresos.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="layout-side">
              <h2 className="form-titulo">Por método de pago</h2>
              {datos.porMetodoPago.length === 0 ? (
                <p className="muted">Sin cobros en este rango.</p>
              ) : (
                <div className="card">
                  {datos.porMetodoPago.map((m) => (
                    <div key={m.metodoPago} className="dato" style={{ marginBottom: '0.5rem' }}>
                      <span className="dato-label" style={{ textTransform: 'capitalize' }}>{m.metodoPago}</span>
                      <strong>${m.total.toFixed(2)}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

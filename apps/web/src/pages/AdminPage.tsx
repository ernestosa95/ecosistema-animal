// apps/web/src/pages/AdminPage.tsx
import { useEffect, useState } from 'react';
import {
  login, getToken, clearToken, suscribirseAExpiracion,
  listarOrganizaciones, crearOrganizacion, listarMiembros, agregarMiembro,
  setOrgActivo, eliminarOrg, exportarOrg, quitarMiembro, setMiembroActivo, setMiembroRoles,
  setAcceso, setSoluciones,
  listarGrupos, crearGrupo, actualizarGrupo, eliminarGrupo,
  listarPlanes, crearPlan, actualizarPlan, eliminarPlan,
  listarMensajesAdmin, crearMensaje, eliminarMensaje, respuestasMensaje,
  resumenPagos, gananciasPorPeriodo, listarPagosOrg, registrarPago, resumenAnalitica,
  listarPagosPendientes, revisarPago, enviarRecordatorioPago,
  type Organizacion, type Miembro, type Grupo, type Plan, type MensajeAdmin, type DestinatarioTipo,
  type ResumenPagoOrg, type GananciasPeriodo, type Pago, type ResumenAnalitica, type PagoPendiente,
  type Pregunta, type TipoPregunta, type RespuestasMensaje,
} from '../api/admin';
import { listarSolicitudes, aprobarSolicitud, rechazarSolicitud, type Solicitud } from '../api/solicitudes';
import {
  listarInteresadosAdmin, editarInteresadoAdmin, eliminarInteresadoAdmin, reenviarConfirmacionInteresado,
  invitarTodosInteresados,
  type Interesado,
} from '../api/interesados';
import { InfoRoles } from '../components/InfoRoles';

const ROLES: Array<{ v: string; label: string }> = [
  { v: 'veterinario', label: 'Veterinario' },
  { v: 'recepcion', label: 'Administrativa / Recepción' },
  { v: 'admin', label: 'Administrador' },
  { v: 'capataz', label: 'Capataz' },
  { v: 'propietario', label: 'Propietario' },
];
const rolLabel = (v: string) => ROLES.find((r) => r.v === v)?.label ?? v;

/** Etiqueta corta de qué soluciones tiene habilitadas una organización, para la lista. */
function etiquetaSoluciones(o: { huellaActiva: boolean; troperaActiva: boolean }): string {
  if (o.huellaActiva && o.troperaActiva) return 'Huella + Tropera';
  if (o.huellaActiva) return 'Huella';
  if (o.troperaActiva) return 'Tropera';
  return 'sin soluciones';
}

/** Chip con color puntual (activo/inactivo, vencido, contador de pendientes) sobre la clase global `.chip`. */
function EstadoChip({ texto, tono = 'advertencia' }: { texto: string; tono?: 'advertencia' | 'peligro' | 'ok' }) {
  const paleta = tono === 'peligro'
    ? { background: 'var(--danger-bg)', color: 'var(--danger)' }
    : tono === 'ok'
      ? { background: 'rgba(92, 138, 78, 0.14)', color: 'var(--verde-dark)' }
      : { background: 'var(--advertencia-bg)', color: 'var(--advertencia)' };
  return <span className="chip" style={paleta}>{texto}</span>;
}

export default function AdminPage() {
  const [logueado, setLogueado] = useState(!!getToken());
  const [expirada, setExpirada] = useState(false);

  // Cualquier llamado del panel que devuelva 401 (token vencido o inválido,
  // ver api/admin.ts) dispara esto — vuelve a mostrar el login en vez de
  // dejar el panel mostrando el JSON crudo del error.
  useEffect(() => {
    suscribirseAExpiracion(() => { setExpirada(true); setLogueado(false); });
  }, []);

  if (!logueado) {
    return <Login mensaje={expirada ? 'Tu sesión expiró. Volvé a ingresar.' : null} onOk={() => { setExpirada(false); setLogueado(true); }} />;
  }
  return <Panel onSalir={() => { clearToken(); setLogueado(false); }} />;
}

// ── Login ───────────────────────────────────────────────────────────────
function Login({ mensaje, onOk }: { mensaje?: string | null; onOk: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function entrar() {
    setCargando(true); setError(null);
    try { await login(email.trim(), password); onOk(); }
    catch (e: any) { setError(e.message ?? 'No se pudo iniciar sesión'); }
    finally { setCargando(false); }
  }

  return (
    <div className="login-wrap">
      <div className="card login-card">
        <div className="brand brand-lg">
          <span className="brand-dot" />
          Ecosistema · Administración
        </div>
        <h1>Ingresar</h1>
        <p className="muted" style={{ marginTop: '-0.5rem', marginBottom: '1rem' }}>
          Ingresá con tu cuenta de super-admin.
        </p>
        {mensaje && <div className="alerta">{mensaje}</div>}
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && entrar()}
          />
        </label>
        {error && <div className="alerta">{error}</div>}
        <button className="btn" style={{ width: '100%' }} disabled={cargando} onClick={entrar}>
          {cargando ? 'Ingresando…' : 'Ingresar'}
        </button>
      </div>
    </div>
  );
}

// ── Panel principal ───────────────────────────────────────────────────────
type Seccion = 'home' | 'organizaciones' | 'planes' | 'grupos' | 'mensajes' | 'analitica';

const SECCIONES_NAV: Array<{ id: Seccion; titulo: string; icono: string }> = [
  {
    id: 'home',
    titulo: 'Home',
    icono: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline>',
  },
  {
    id: 'organizaciones',
    titulo: 'Organizaciones',
    icono: '<rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect>',
  },
  {
    id: 'planes',
    titulo: 'Planes',
    icono: '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line>',
  },
  {
    id: 'grupos',
    titulo: 'Grupos',
    icono: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>',
  },
  {
    id: 'mensajes',
    titulo: 'Mensajes',
    icono: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path>',
  },
  {
    id: 'analitica',
    titulo: 'Analítica',
    icono: '<line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line>',
  },
];

function Panel({ onSalir }: { onSalir: () => void }) {
  const [seccion, setSeccion] = useState<Seccion>('home');
  const [orgs, setOrgs] = useState<Organizacion[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [sel, setSel] = useState<Organizacion | null>(null);
  const [busquedaOrg, setBusquedaOrg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [pagosResumen, setPagosResumen] = useState<ResumenPagoOrg[]>([]);
  const [ganancias, setGanancias] = useState<GananciasPeriodo | null>(null);
  const [pagosPendientes, setPagosPendientes] = useState<PagoPendiente[]>([]);

  async function cargarOrgs() {
    setCargando(true); setError(null);
    try { setOrgs(await listarOrganizaciones()); }
    catch (e: any) {
      setError(e.message?.includes('403') || /super/i.test(e.message)
        ? 'Tu cuenta no es super-admin de plataforma.'
        : (e.message ?? 'Error al cargar'));
    } finally { setCargando(false); }
  }
  function cargarPagos() {
    resumenPagos().then(setPagosResumen).catch(() => {});
    gananciasPorPeriodo().then(setGanancias).catch(() => {});
    listarPagosPendientes().then(setPagosPendientes).catch(() => {});
  }
  useEffect(() => {
    cargarOrgs();
    cargarPagos();
    listarGrupos().then(setGrupos).catch(() => {});
    listarPlanes().then(setPlanes).catch(() => {});
  }, []);

  return (
    <Shell onSalir={onSalir} seccion={seccion} onSeccion={setSeccion}>
      {error && <div className="alerta" style={{ marginBottom: 12 }}>{error}</div>}

      {seccion === 'home' && (
        <Home resumen={pagosResumen} ganancias={ganancias} pendientes={pagosPendientes} onPagoRegistrado={cargarPagos} />
      )}

      {seccion === 'organizaciones' && (
        <>
          <Interesados />
          <Solicitudes orgs={orgs} planes={planes} onCambio={() => { cargarOrgs(); cargarPagos(); }} />
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 320px', minWidth: 0 }}>
              <NuevaOrg onCreada={(o) => { setOrgs((prev) => [...prev, o].sort((a, b) => a.nombre.localeCompare(b.nombre))); setSel(o); setBusquedaOrg(''); }} />

              <h3 style={{ marginTop: '1.25rem' }}>Organizaciones</h3>
              {cargando ? <p className="muted">Cargando…</p> : (
                <div className="card">
                  <input
                    type="search"
                    value={busquedaOrg}
                    onChange={(e) => setBusquedaOrg(e.target.value)}
                    placeholder="Buscar organización…"
                    style={{ marginBottom: '0.75rem' }}
                  />
                  {(() => {
                    const q = busquedaOrg.trim().toLowerCase();
                    const filtradas = q ? orgs.filter((o) => o.nombre.toLowerCase().includes(q)) : orgs;
                    if (orgs.length === 0) return <p className="muted">Todavía no hay organizaciones.</p>;
                    if (filtradas.length === 0) return <p className="muted">Sin resultados para "{busquedaOrg}".</p>;
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        {filtradas.map((o) => (
                          <button
                            key={o.id}
                            className="dropdown-item"
                            style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%',
                              background: sel?.id === o.id ? 'var(--huella-bg)' : undefined,
                            }}
                            onClick={() => setSel(o)}
                          >
                            <b>{o.nombre}</b>
                            <span className="muted" style={{ fontSize: '0.78rem', textTransform: 'capitalize' }}>
                              {o.activo === false ? 'inactiva' : etiquetaSoluciones(o)}
                            </span>
                          </button>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            <div style={{ flex: '1 1 380px', minWidth: 0 }}>
              {sel ? (
                <Miembros
                  org={sel}
                  grupos={grupos}
                  planes={planes}
                  onOrgActualizada={cargarOrgs}
                  onOrgEliminada={() => { cargarOrgs(); setSel(null); }}
                />
              ) : <p className="muted">Elegí una organización para ver y agregar sus miembros.</p>}
            </div>
          </div>
        </>
      )}

      {seccion === 'planes' && <Planes planes={planes} onCambio={() => listarPlanes().then(setPlanes)} />}
      {seccion === 'grupos' && <Grupos grupos={grupos} onCambio={() => listarGrupos().then(setGrupos)} />}
      {seccion === 'mensajes' && <Mensajes orgs={orgs} grupos={grupos} />}
      {seccion === 'analitica' && <Analitica />}
    </Shell>
  );
}

// ── Home: pago por organización + ganancias acumuladas ─────────────────────
function formatoMes(periodo: string): string {
  const [año, mes] = periodo.slice(0, 7).split('-');
  const nombres = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${nombres[Number(mes) - 1]} ${año}`;
}

/** Pagos cargados por las propias organizaciones (comprobante de transferencia) esperando aprobación. */
function PagosPendientes({ pendientes, onRevisado }: { pendientes: PagoPendiente[]; onRevisado: () => void }) {
  const [trabajandoId, setTrabajandoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function revisar(id: string, aprobar: boolean) {
    setTrabajandoId(id); setError(null);
    try {
      await revisarPago(id, aprobar);
      onRevisado();
    } catch (e: any) {
      setError(e.message ?? 'No se pudo revisar el pago');
    } finally {
      setTrabajandoId(null);
    }
  }

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <h4 className="form-titulo">
        Pagos pendientes de revisión
        {pendientes.length > 0 && (
          <span className="chip" style={{ marginLeft: '0.5rem', background: 'var(--advertencia-bg)', color: 'var(--advertencia)' }}>
            {pendientes.length}
          </span>
        )}
      </h4>
      {error && <div className="alerta">{error}</div>}
      {pendientes.length === 0 ? (
        <p className="muted">No hay pagos esperando revisión.</p>
      ) : (
        <table className="tabla">
          <thead>
            <tr>
              <th>Organización</th>
              <th>Período</th>
              <th>Monto</th>
              <th>Comprobante</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pendientes.map((p) => (
              <tr key={p.id}>
                <td><b>{p.organizacionNombre}</b></td>
                <td className="muted">{formatoMes(p.periodo)}</td>
                <td>${Number(p.monto).toLocaleString('es-AR')}</td>
                <td>
                  {p.comprobanteUrl
                    ? <a href={p.comprobanteUrl} target="_blank" rel="noreferrer">Ver</a>
                    : <span className="muted">—</span>}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button className="btn-ghost" disabled={trabajandoId === p.id} onClick={() => revisar(p.id, true)}>
                      Aprobar
                    </button>
                    <button
                      className="btn-ghost"
                      style={{ color: 'var(--danger)', borderColor: '#fca5a5' }}
                      disabled={trabajandoId === p.id}
                      onClick={() => revisar(p.id, false)}
                    >
                      Rechazar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/**
 * Botón por fila que manda el recordatorio de pago a los propietarios/admins
 * activos de esa organización. Disparo manual a propósito (no hay ningún
 * scheduler en el backend hoy) — `AdminService.enviarRecordatorioPago()`
 * queda como un método de servicio aparte para que, el día que se agregue
 * un job automático, sólo haga falta llamarlo desde ahí sin duplicar nada.
 */
function BotonRecordatorio({ orgId }: { orgId: string }) {
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'enviado' | 'error'>('idle');

  async function enviar() {
    setEstado('enviando');
    try {
      await enviarRecordatorioPago(orgId);
      setEstado('enviado');
    } catch {
      setEstado('error');
    }
  }

  if (estado === 'enviado') {
    return <span className="muted" style={{ fontSize: '0.8rem' }}>✓ Enviado</span>;
  }
  return (
    <button
      className="btn-ghost"
      disabled={estado === 'enviando'}
      onClick={enviar}
      title={estado === 'error' ? 'No se pudo enviar — reintentar' : undefined}
    >
      {estado === 'enviando' ? 'Enviando…' : estado === 'error' ? 'Reintentar recordatorio' : 'Enviar recordatorio'}
    </button>
  );
}

function Home({ resumen, ganancias, pendientes, onPagoRegistrado }: {
  resumen: ResumenPagoOrg[]; ganancias: GananciasPeriodo | null; pendientes: PagoPendiente[]; onPagoRegistrado: () => void;
}) {
  const [orgPago, setOrgPago] = useState<ResumenPagoOrg | null>(null);
  const hoy = new Date();

  return (
    <div>
      <h3>Home</h3>
      <PagosPendientes pendientes={pendientes} onRevisado={onPagoRegistrado} />
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: '2 1 480px', minWidth: 0 }} className="card">
          <h4 className="form-titulo">Pago por organización</h4>
          {resumen.length === 0 && <p className="muted">Todavía no hay organizaciones.</p>}
          {resumen.length > 0 && (
            <table className="tabla">
              <thead>
                <tr>
                  <th>Organización</th>
                  <th>Activación</th>
                  <th>Próximo vencimiento</th>
                  <th>Este mes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {resumen.map((o) => {
                  const vencido = new Date(o.proximoVencimiento) < hoy;
                  return (
                    <tr key={o.id}>
                      <td><b>{o.nombre}</b>{!o.activo && <> <EstadoChip texto="inactiva" tono="peligro" /></>}</td>
                      <td className="muted">{o.fechaActivacion ? o.fechaActivacion.slice(0, 10) : 'sin definir'}</td>
                      <td>
                        {o.proximoVencimiento.slice(0, 10)}
                        {vencido && !o.pagoEsteMes && <> <EstadoChip texto="vencido" tono="peligro" /></>}
                      </td>
                      <td>
                        {o.pagoEsteMes
                          ? <EstadoChip texto="pagó" tono="ok" />
                          : <EstadoChip texto="pendiente" tono="peligro" />}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button className="btn-ghost" onClick={() => setOrgPago(o)}>Registrar pago</button>
                          <BotonRecordatorio orgId={o.id} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ flex: '1 1 260px', minWidth: 0 }} className="card">
          <h4 className="form-titulo">Ganancias acumuladas</h4>
          {!ganancias || ganancias.porPeriodo.length === 0
            ? <p className="muted">Todavía no hay pagos registrados.</p>
            : (
              <>
                <p style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 0.75rem' }}>
                  ${ganancias.totalAcumulado.toLocaleString('es-AR')}
                  <span className="muted" style={{ fontSize: '0.8rem', fontWeight: 400 }}> total histórico</span>
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {ganancias.porPeriodo.slice(0, 12).map((p) => (
                    <div key={p.periodo} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                      <span className="muted" style={{ textTransform: 'capitalize' }}>{formatoMes(p.periodo)}</span>
                      <b>${Number(p.total).toLocaleString('es-AR')}</b>
                    </div>
                  ))}
                </div>
              </>
            )}
        </div>
      </div>

      {orgPago && (
        <RegistrarPagoModal org={orgPago} onClose={() => setOrgPago(null)} onGuardado={() => { setOrgPago(null); onPagoRegistrado(); }} />
      )}
    </div>
  );
}

const MEDIOS_PAGO = ['Transferencia', 'Efectivo', 'Mercado Pago', 'Tarjeta', 'Demo', 'Otro'];

function RegistrarPagoModal({ org, onClose, onGuardado }: {
  org: ResumenPagoOrg; onClose: () => void; onGuardado: () => void;
}) {
  const [monto, setMonto] = useState('');
  const [medioPago, setMedioPago] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [historial, setHistorial] = useState<Pago[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const esDemo = medioPago === 'Demo';

  useEffect(() => { listarPagosOrg(org.id).then(setHistorial).catch(() => {}); }, [org.id]);

  function cambiarMedioPago(v: string) {
    setMedioPago(v);
    if (v === 'Demo') setMonto('0'); // demo = sin costo, no genera ingreso real
  }

  async function guardar() {
    const n = Number(monto);
    if (!monto.trim() || !Number.isFinite(n) || n < 0 || (!esDemo && n === 0)) {
      setError('Ingresá un monto válido');
      return;
    }
    setGuardando(true); setError(null);
    try {
      await registrarPago(org.id, { monto: n, medioPago: medioPago || undefined, observaciones: observaciones.trim() || undefined });
      onGuardado();
    } catch (e: any) { setError(e.message ?? 'No se pudo registrar el pago'); }
    finally { setGuardando(false); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <h4 className="form-titulo">Registrar pago — {org.nombre}</h4>
        <label>
          Medio de pago (opcional)
          <select value={medioPago} onChange={(e) => cambiarMedioPago(e.target.value)}>
            <option value="">Sin especificar</option>
            {MEDIOS_PAGO.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <label>
          Monto
          <input
            type="number"
            min={0}
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="Ej: 15000"
            disabled={esDemo}
            autoFocus
          />
          {esDemo && <span className="muted hint-previo">Demo: no genera ingreso real, el monto queda en 0.</span>}
        </label>
        <label>
          Observaciones (opcional)
          <input value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
        </label>
        <p className="muted" style={{ fontSize: '0.82rem' }}>Se registra para el mes calendario en curso.</p>
        {historial.length > 0 && (
          <div style={{ marginBottom: '0.75rem' }}>
            <p className="muted" style={{ fontSize: '0.82rem', marginBottom: '0.25rem' }}>Pagos anteriores</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', maxHeight: 120, overflowY: 'auto' }}>
              {historial.slice(0, 6).map((p) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}>
                  <span className="muted">{formatoMes(p.periodo)}</span>
                  <span>
                    ${Number(p.monto).toLocaleString('es-AR')}
                    {p.estado === 'pendiente' && <> <EstadoChip texto="pendiente de revisión" /></>}
                    {p.estado === 'rechazado' && <> <EstadoChip texto="rechazado" tono="peligro" /></>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        {error && <div className="alerta">{error}</div>}
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn" disabled={guardando} onClick={guardar}>{guardando ? 'Guardando…' : 'Guardar pago'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Nueva organización ────────────────────────────────────────────────────
function NuevaOrg({ onCreada }: { onCreada: (o: Organizacion) => void }) {
  const [nombre, setNombre] = useState('');
  const [huellaActiva, setHuellaActiva] = useState(true);
  const [troperaActiva, setTroperaActiva] = useState(false);
  const [cuit, setCuit] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function crear() {
    if (nombre.trim().length < 2) { setError('Poné un nombre'); return; }
    if (!huellaActiva && !troperaActiva) { setError('Elegí al menos una solución'); return; }
    setCargando(true); setError(null);
    try {
      const o = await crearOrganizacion({ nombre: nombre.trim(), huellaActiva, troperaActiva, cuit: cuit.trim() || undefined });
      setNombre(''); setCuit(''); onCreada(o);
    } catch (e: any) { setError(e.message ?? 'No se pudo crear'); }
    finally { setCargando(false); }
  }

  return (
    <div className="card">
      <h4 className="form-titulo">Nueva organización</h4>
      <label>
        Nombre
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Veterinaria San Roque" />
      </label>
      <label>Soluciones habilitadas</label>
      <div className="check-fila" style={{ marginBottom: '0.75rem' }}>
        <label>
          <input type="checkbox" checked={huellaActiva} onChange={(e) => setHuellaActiva(e.target.checked)} />
          Huella
        </label>
        <label>
          <input type="checkbox" checked={troperaActiva} onChange={(e) => setTroperaActiva(e.target.checked)} />
          Tropera
        </label>
      </div>
      <label>
        CUIT (opcional)
        <input value={cuit} onChange={(e) => setCuit(e.target.value)} />
      </label>
      {error && <div className="alerta">{error}</div>}
      <button className="btn" disabled={cargando} onClick={crear}>
        {cargando ? 'Creando…' : 'Crear organización'}
      </button>
    </div>
  );
}

// ── Miembros de una organización ───────────────────────────────────────────
function Miembros({ org, grupos, planes, onOrgActualizada, onOrgEliminada }: {
  org: Organizacion;
  grupos: Grupo[];
  planes: Plan[];
  onOrgActualizada: () => void;
  onOrgEliminada: () => void;
}) {
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accion, setAccion] = useState<string | null>(null);
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);
  const [editandoRoles, setEditandoRoles] = useState<string | null>(null);

  async function cargar() {
    setCargando(true); setError(null);
    try { setMiembros(await listarMiembros(org.id)); }
    catch (e: any) { setError(e.message ?? 'Error al cargar miembros'); }
    finally { setCargando(false); }
  }
  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [org.id]);

  const activa = org.activo !== false;

  async function toggleActivo() {
    setAccion('activo'); setError(null);
    try { await setOrgActivo(org.id, !activa); onOrgActualizada(); }
    catch (e: any) { setError(e.message ?? 'No se pudo cambiar el estado'); }
    finally { setAccion(null); }
  }
  async function exportar() {
    setAccion('export'); setError(null);
    try { await exportarOrg(org.id, org.nombre); }
    catch (e: any) { setError(e.message ?? 'No se pudo exportar'); }
    finally { setAccion(null); }
  }
  async function toggleMiembro(m: Miembro) {
    setError(null);
    try { await setMiembroActivo(org.id, m.membresiaId, !m.activo); cargar(); }
    catch (e: any) { setError(e.message ?? 'No se pudo actualizar el miembro'); }
  }
  async function quitar(m: Miembro) {
    setError(null);
    try { await quitarMiembro(org.id, m.membresiaId); cargar(); }
    catch (e: any) { setError(e.message ?? 'No se pudo quitar el miembro'); }
  }
  async function guardarRoles(m: Miembro, roles: string[]) {
    setError(null);
    try { await setMiembroRoles(org.id, m.membresiaId, roles); setEditandoRoles(null); cargar(); }
    catch (e: any) { setError(e.message ?? 'No se pudieron actualizar los roles'); }
  }

  return (
    <>
      <h3>{org.nombre} {!activa && <EstadoChip texto="inactiva" tono="peligro" />}</h3>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        <button className="btn-ghost" disabled={accion === 'activo'} onClick={toggleActivo}>
          {activa ? 'Desactivar' : 'Reactivar'}
        </button>
        <button className="btn-ghost" disabled={accion === 'export'} onClick={exportar}>
          {accion === 'export' ? 'Exportando…' : 'Exportar datos'}
        </button>
        <button className="btn-danger" onClick={() => setConfirmarEliminar(true)}>Eliminar</button>
      </div>

      {error && <div className="alerta">{error}</div>}

      <SolucionesOrg org={org} onActualizada={onOrgActualizada} />

      <AccesoOrg org={org} grupos={grupos} planes={planes} onActualizada={onOrgActualizada} />

      <h4 className="dato-label" style={{ marginTop: '1.25rem' }}>Miembros</h4>
      {cargando ? <p className="muted">Cargando…</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
          {miembros.length === 0 && <p className="muted">Sin miembros todavía.</p>}
          {miembros.map((m) => (
            <div key={m.membresiaId}>
              <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div>
                  <b>
                    {[m.nombre, m.apellido].filter(Boolean).join(' ') || m.email}
                    {!m.activo && <> <EstadoChip texto="inactivo" tono="peligro" /></>}
                  </b>
                  <div className="muted" style={{ fontSize: '0.85rem' }}>{m.email}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {m.roles.map((r) => <span key={r} className="chip">{rolLabel(r)}</span>)}
                  <button className="btn-ghost" onClick={() => setEditandoRoles(editandoRoles === m.membresiaId ? null : m.membresiaId)}>
                    {editandoRoles === m.membresiaId ? 'Cancelar' : 'Editar roles'}
                  </button>
                  <button className="btn-ghost" onClick={() => toggleMiembro(m)}>{m.activo ? 'Desactivar' : 'Activar'}</button>
                  <button className="btn-ghost" style={{ color: 'var(--danger)', borderColor: '#fca5a5' }} onClick={() => quitar(m)}>Quitar</button>
                </div>
              </div>
              {editandoRoles === m.membresiaId && (
                <div style={{ marginTop: '0.4rem' }}>
                  <RolesCheckboxes valorInicial={m.roles} onGuardar={(roles) => guardarRoles(m, roles)} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <AgregarMiembroForm org={org} onAgregado={cargar} />

      {confirmarEliminar && (
        <EliminarModal
          org={org}
          onClose={() => setConfirmarEliminar(false)}
          onEliminada={() => { setConfirmarEliminar(false); onOrgEliminada(); }}
        />
      )}
    </>
  );
}

function EliminarModal({ org, onClose, onEliminada }: {
  org: Organizacion; onClose: () => void; onEliminada: () => void;
}) {
  const [texto, setTexto] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [borrando, setBorrando] = useState(false);
  const coincide = texto.trim() === org.nombre.trim();

  async function eliminar() {
    if (!coincide) return;
    setBorrando(true); setError(null);
    try { await eliminarOrg(org.id); onEliminada(); }
    catch (e: any) { setError(e.message ?? 'No se pudo eliminar'); setBorrando(false); }
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-panel" style={{ maxWidth: 440 }}>
        <h2>Eliminar organización</h2>
        <p className="muted">
          Esto borra <b>{org.nombre}</b> y <b>todos</b> sus registros (dueños, animales,
          historia, turnos). No se puede deshacer. Exportá los datos antes si los necesitás.
        </p>
        <label>
          Escribí el nombre para confirmar
          <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={org.nombre} />
        </label>
        {error && <div className="alerta">{error}</div>}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
          <button className="btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
          <button className="btn-danger" style={{ flex: 1 }} disabled={!coincide || borrando} onClick={eliminar}>
            {borrando ? 'Eliminando…' : 'Eliminar definitivamente'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Checkboxes de roles apilables (controlado), reusado en alta de miembro y edición de roles existentes. */
function RolesFieldset({ roles, onToggle }: { roles: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="check-fila" style={{ flexWrap: 'wrap', marginBottom: '0.5rem' }}>
      {ROLES.map((r) => (
        <label key={r.v}>
          <input type="checkbox" checked={roles.includes(r.v)} onChange={() => onToggle(r.v)} />
          {r.label}
        </label>
      ))}
    </div>
  );
}

/** Editor inline de los roles de una membresía existente (checkboxes + guardar). */
function RolesCheckboxes({ valorInicial, onGuardar, textoBoton = 'Guardar roles' }: {
  valorInicial: string[];
  onGuardar: (roles: string[]) => void;
  textoBoton?: string;
}) {
  const [roles, setRoles] = useState<string[]>(valorInicial);
  const toggle = (v: string) => setRoles((prev) => (prev.includes(v) ? prev.filter((r) => r !== v) : [...prev, v]));

  return (
    <div className="card">
      <RolesFieldset roles={roles} onToggle={toggle} />
      <button className="btn" disabled={roles.length === 0} onClick={() => onGuardar(roles)}>
        {textoBoton}
      </button>
    </div>
  );
}

function AgregarMiembroForm({ org, onAgregado }: { org: Organizacion; onAgregado: () => void }) {
  const [email, setEmail] = useState('');
  const [roles, setRoles] = useState<string[]>(['veterinario']);
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const toggleRol = (v: string) => setRoles((prev) => (prev.includes(v) ? prev.filter((r) => r !== v) : [...prev, v]));

  async function agregar() {
    if (roles.length === 0) { setError('Elegí al menos un rol'); return; }
    setCargando(true); setError(null); setMsg(null);
    try {
      const r = await agregarMiembro(org.id, {
        email: email.trim(), roles,
        nombre: nombre.trim() || undefined,
        apellido: apellido.trim() || undefined,
        password: password || undefined,
      });
      setMsg(r.creado ? 'Usuario creado y asignado ✓' : 'Usuario existente asignado ✓');
      setEmail(''); setNombre(''); setApellido(''); setPassword('');
      onAgregado();
    } catch (e: any) { setError(e.message ?? 'No se pudo agregar'); }
    finally { setCargando(false); }
  }

  return (
    <div className="card">
      <h4 className="form-titulo">Agregar miembro</h4>
      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vet@ejemplo.com" />
      </label>
      <label>
        Roles <span className="muted" style={{ fontWeight: 400 }}>(puede tener más de uno)</span>
      </label>
      <RolesFieldset roles={roles} onToggle={toggleRol} />
      <div className="form-grid">
        <label>
          Nombre
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </label>
        <label>
          Apellido
          <input value={apellido} onChange={(e) => setApellido(e.target.value)} />
        </label>
      </div>
      <label>
        Contraseña <span className="muted" style={{ fontWeight: 400 }}>(solo si el usuario es nuevo)</span>
        <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="mínimo 6 caracteres" />
      </label>
      {error && <div className="alerta">{error}</div>}
      {msg && <p style={{ color: 'var(--verde-dark)', fontSize: '0.88rem' }}>{msg}</p>}
      <button className="btn" disabled={cargando || !email} onClick={agregar}>
        {cargando ? 'Agregando…' : 'Agregar a la organización'}
      </button>
    </div>
  );
}

// ── Soluciones habilitadas (Tropera / Huella) ───────────────────────────────
function SolucionesOrg({ org, onActualizada }: { org: Organizacion; onActualizada: () => void }) {
  const [huellaActiva, setHuellaActiva] = useState(org.huellaActiva);
  const [troperaActiva, setTroperaActiva] = useState(org.troperaActiva);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [ok, setOk] = useState(false);

  // Si se selecciona otra organización, resetear el formulario a sus valores.
  useEffect(() => {
    setHuellaActiva(org.huellaActiva);
    setTroperaActiva(org.troperaActiva);
    setOk(false);
  }, [org.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const huboCambio = huellaActiva !== org.huellaActiva || troperaActiva !== org.troperaActiva;

  async function guardar() {
    if (!huellaActiva && !troperaActiva) { setError('Elegí al menos una solución, o desactivá la organización entera desde arriba'); return; }
    setGuardando(true); setError(null); setOk(false);
    try {
      await setSoluciones(org.id, { huellaActiva, troperaActiva });
      setOk(true);
      onActualizada();
    } catch (e: any) { setError(e.message ?? 'No se pudo guardar'); }
    finally { setGuardando(false); }
  }

  return (
    <div className="card" style={{ marginTop: '0.75rem' }}>
      <h4 className="form-titulo">Soluciones</h4>
      <div className="check-fila">
        <label>
          <input type="checkbox" checked={huellaActiva} onChange={(e) => setHuellaActiva(e.target.checked)} />
          Huella
        </label>
        <label>
          <input type="checkbox" checked={troperaActiva} onChange={(e) => setTroperaActiva(e.target.checked)} />
          Tropera
        </label>
      </div>
      {error && <div className="alerta">{error}</div>}
      {ok && <p style={{ color: 'var(--verde-dark)', fontSize: '0.88rem' }}>Soluciones actualizadas ✓</p>}
      <button className="btn" disabled={guardando || !huboCambio} onClick={guardar}>
        {guardando ? 'Guardando…' : 'Guardar soluciones'}
      </button>
    </div>
  );
}

// ── Acceso: grupo, plan, vencimiento/demo ──────────────────────────────────
function AccesoOrg({ org, grupos, planes, onActualizada }: {
  org: Organizacion; grupos: Grupo[]; planes: Plan[]; onActualizada: () => void;
}) {
  const [grupoId, setGrupoId] = useState(org.grupoId ?? '');
  const [planId, setPlanId] = useState(org.planId ?? '');
  const [accesoHasta, setAccesoHasta] = useState(org.accesoHasta ? org.accesoHasta.slice(0, 10) : '');
  const [fechaActivacion, setFechaActivacion] = useState(org.fechaActivacion ? org.fechaActivacion.slice(0, 10) : '');
  const [esDemo, setEsDemo] = useState(!!org.esDemo);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [ok, setOk] = useState(false);

  // Si se selecciona otra organización, resetear el formulario a sus valores.
  useEffect(() => {
    setGrupoId(org.grupoId ?? '');
    setPlanId(org.planId ?? '');
    setAccesoHasta(org.accesoHasta ? org.accesoHasta.slice(0, 10) : '');
    setFechaActivacion(org.fechaActivacion ? org.fechaActivacion.slice(0, 10) : '');
    setEsDemo(!!org.esDemo);
    setOk(false);
  }, [org.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const vencido = accesoHasta ? new Date(accesoHasta) < new Date() : false;

  async function guardar() {
    setGuardando(true); setError(null); setOk(false);
    try {
      await setAcceso(org.id, {
        grupoId: grupoId || null,
        planId: planId || null,
        accesoHasta: accesoHasta ? new Date(accesoHasta).toISOString() : null,
        fechaActivacion: fechaActivacion ? new Date(fechaActivacion).toISOString() : null,
        esDemo,
      });
      setOk(true);
      onActualizada();
    } catch (e: any) { setError(e.message ?? 'No se pudo guardar el acceso'); }
    finally { setGuardando(false); }
  }

  function extender(dias: number) {
    const base = accesoHasta && new Date(accesoHasta) > new Date() ? new Date(accesoHasta) : new Date();
    base.setDate(base.getDate() + dias);
    setAccesoHasta(base.toISOString().slice(0, 10));
  }

  return (
    <div className="card" style={{ marginTop: '0.75rem' }}>
      <h4 className="form-titulo">Acceso</h4>
      <div className="form-grid">
        <label>
          Grupo
          <select value={grupoId} onChange={(e) => setGrupoId(e.target.value)}>
            <option value="">Sin grupo</option>
            {grupos.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
          </select>
        </label>
        <label>
          Plan
          <select value={planId} onChange={(e) => setPlanId(e.target.value)}>
            <option value="">Sin plan</option>
            {planes.map((p) => <option key={p.id} value={p.id}>{p.nombre}{p.precioMensual ? ` — $${p.precioMensual}/mes` : ''}</option>)}
          </select>
        </label>
        <label>
          Acceso habilitado hasta {vencido && <EstadoChip texto="vencido" tono="peligro" />}
          <input type="date" value={accesoHasta} onChange={(e) => setAccesoHasta(e.target.value)} />
        </label>
        <label>
          Fecha de activación
          <input type="date" value={fechaActivacion} onChange={(e) => setFechaActivacion(e.target.value)} />
        </label>
        <label>
          Es demo
          <select value={esDemo ? '1' : '0'} onChange={(e) => setEsDemo(e.target.value === '1')}>
            <option value="0">No</option>
            <option value="1">Sí</option>
          </select>
        </label>
      </div>
      <p className="muted" style={{ fontSize: '0.82rem', marginTop: '-0.25rem' }}>
        La fecha de activación define el día del mes en que se factura (ver Home). Si queda vacía se usa la fecha de alta de la organización.
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        <button className="btn-ghost" onClick={() => extender(7)}>+7 días</button>
        <button className="btn-ghost" onClick={() => extender(30)}>+30 días</button>
        <button className="btn-ghost" onClick={() => setAccesoHasta('')}>Sin vencimiento</button>
      </div>
      {error && <div className="alerta">{error}</div>}
      {ok && <p style={{ color: 'var(--verde-dark)', fontSize: '0.88rem' }}>Acceso actualizado ✓</p>}
      <button className="btn" disabled={guardando} onClick={guardar}>
        {guardando ? 'Guardando…' : 'Guardar acceso'}
      </button>
    </div>
  );
}

// ── Planes ─────────────────────────────────────────────────────────────
/**
 * Convierte { veterinario: "2", recepcion: "" } -> { veterinario: 2, ... }.
 * No es opcional: siempre devuelve los 5 roles con un número — uno vacío o
 * inválido se guarda como 0 (ese rol queda en cero miembros permitidos), no
 * hay estado "sin límite".
 */
function limitesANumeros(valores: Record<string, string>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of ROLES) {
    const v = valores[r.v] ?? '';
    const n = Number(v);
    out[r.v] = v.trim() !== '' && Number.isFinite(n) && n >= 0 ? n : 0;
  }
  return out;
}

/** Estado inicial/de reseteo: todos los roles en 0 (nada permitido salvo que se suba a mano). */
function limitesEnCero(): Record<string, string> {
  return Object.fromEntries(ROLES.map((r) => [r.v, '0']));
}

/** Inverso: { veterinario: 2 } -> { veterinario: "2" }, completando en "0" los roles que un plan viejo no tenía guardados. */
function limitesAStrings(limites: Record<string, number> | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of ROLES) out[r.v] = String(limites?.[r.v] ?? 0);
  return out;
}

/** Grilla de "cupo máximo por rol" — obligatorio, ningún rol queda sin definir. */
function LimitesRolesEditor({ valores, onChange }: {
  valores: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.75rem' }}>
      {ROLES.map((r) => (
        <label key={r.v} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text)' }}>
          {r.label}
          <input
            type="number"
            required
            min={0}
            value={valores[r.v] ?? '0'}
            onChange={(e) => onChange({ ...valores, [r.v]: e.target.value })}
            style={{ width: '90px', marginTop: 0 }}
          />
        </label>
      ))}
    </div>
  );
}

function Planes({ planes, onCambio }: { planes: Plan[]; onCambio: () => void }) {
  const [nombre, setNombre] = useState('');
  const [precioMensual, setPrecioMensual] = useState('');
  const [precioAnual, setPrecioAnual] = useState('');
  const [limitesRoles, setLimitesRoles] = useState<Record<string, string>>(limitesEnCero);
  const [descripcion, setDescripcion] = useState('');
  const [mesesBonificados, setMesesBonificados] = useState('0');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const [editando, setEditando] = useState<string | null>(null);
  const [nombreEdit, setNombreEdit] = useState('');
  const [descripcionEdit, setDescripcionEdit] = useState('');
  const [mesesBonificadosEdit, setMesesBonificadosEdit] = useState('0');
  const [limitesEdit, setLimitesEdit] = useState<Record<string, string>>({});
  const [errorEdit, setErrorEdit] = useState<string | null>(null);
  const [guardandoLimites, setGuardandoLimites] = useState(false);

  async function crear() {
    if (nombre.trim().length < 2) { setError('Poné un nombre'); return; }
    if (precioMensual.trim() === '' || precioAnual.trim() === '') {
      setError('El precio mensual y el precio anual son obligatorios');
      return;
    }
    setCargando(true); setError(null);
    try {
      await crearPlan({
        nombre: nombre.trim(),
        precioMensual: Number(precioMensual),
        precioAnual: Number(precioAnual),
        limitesRoles: limitesANumeros(limitesRoles),
        descripcion: descripcion.trim() || undefined,
        mesesBonificados: Number(mesesBonificados) || 0,
      });
      setNombre(''); setPrecioMensual(''); setPrecioAnual(''); setLimitesRoles(limitesEnCero()); setDescripcion(''); setMesesBonificados('0'); onCambio();
    } catch (e: any) { setError(e.message ?? 'No se pudo crear'); }
    finally { setCargando(false); }
  }
  async function toggleActivo(p: Plan) {
    try { await actualizarPlan(p.id, { activo: !p.activo }); onCambio(); }
    catch (e: any) { setError(e.message ?? 'No se pudo actualizar'); }
  }
  async function eliminar(p: Plan) {
    try { await eliminarPlan(p.id); onCambio(); }
    catch (e: any) { setError(e.message ?? 'No se pudo eliminar'); }
  }
  function abrirEditar(p: Plan) {
    if (editando === p.id) { setEditando(null); return; }
    setEditando(p.id);
    setNombreEdit(p.nombre);
    setDescripcionEdit(p.descripcion ?? '');
    setMesesBonificadosEdit(String(p.mesesBonificados ?? 0));
    setLimitesEdit(limitesAStrings(p.limitesRoles));
    setErrorEdit(null);
  }
  async function guardarEdicion(p: Plan) {
    if (nombreEdit.trim().length < 2) { setErrorEdit('Poné un nombre'); return; }
    setGuardandoLimites(true); setErrorEdit(null);
    try {
      await actualizarPlan(p.id, {
        nombre: nombreEdit.trim(),
        descripcion: descripcionEdit.trim() || undefined,
        mesesBonificados: Number(mesesBonificadosEdit) || 0,
        limitesRoles: limitesANumeros(limitesEdit),
      });
      setEditando(null);
      onCambio();
    } catch (e: any) { setErrorEdit(e.message ?? 'No se pudieron guardar los cambios'); }
    finally { setGuardandoLimites(false); }
  }

  /** % de descuento del anual contra 12 meses al precio mensual — se calcula, no se carga a mano. */
  function descuentoAnual(p: Plan): number | null {
    const mensual = p.precioMensual ? Number(p.precioMensual) : null;
    const anual = p.precioAnual ? Number(p.precioAnual) : null;
    if (!mensual || !anual) return null;
    const sinDescuento = mensual * 12;
    if (anual >= sinDescuento) return null;
    return Math.round((1 - anual / sinDescuento) * 100);
  }

  return (
    <div>
      <h3>Planes</h3>
      <InfoRoles />
      {error && <div className="alerta">{error}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
        {planes.length === 0 && <p className="muted">Todavía no hay planes.</p>}
        {planes.map((p) => {
          const descuento = descuentoAnual(p);
          const limitesActivos = Object.entries(p.limitesRoles ?? {}).filter(([, n]) => n >= 0);
          return (
            <div key={p.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div>
                  <b>{p.nombre} {!p.activo && <EstadoChip texto="no disponible para altas" tono="peligro" />}</b>
                  <div className="muted" style={{ fontSize: '0.85rem' }}>
                    {p.precioMensual ? `$${p.precioMensual}/mes` : 'Sin precio mensual'}
                    {p.precioAnual ? ` · $${p.precioAnual}/año` : ''}
                    {descuento != null && <> <span className="chip">-{descuento}% anual</span></>}
                    {p.mesesBonificados > 0 && <> <span className="chip">🎁 {p.mesesBonificados} {p.mesesBonificados === 1 ? 'mes bonificado' : 'meses bonificados'}</span></>}
                    {p.descripcion ? ` · ${p.descripcion}` : ''}
                  </div>
                  {limitesActivos.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                      {limitesActivos.map(([rol, n]) => (
                        <span key={rol} className="chip">{rolLabel(rol)}: {n}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button className="btn-ghost" onClick={() => abrirEditar(p)}>
                    {editando === p.id ? 'Cancelar' : 'Editar'}
                  </button>
                  <button className="btn-ghost" onClick={() => toggleActivo(p)} title="Un plan no disponible no puede asignarse a organizaciones nuevas, pero las que ya lo tienen no se ven afectadas">
                    {p.activo ? 'Deshabilitar para altas nuevas' : 'Habilitar para altas nuevas'}
                  </button>
                  <button className="btn-ghost" style={{ color: 'var(--danger)', borderColor: '#fca5a5' }} onClick={() => eliminar(p)}>Eliminar</button>
                </div>
              </div>
              {editando === p.id && (
                <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                  {errorEdit && <div className="alerta">{errorEdit}</div>}
                  <div className="form-grid">
                    <label>
                      Nombre
                      <input value={nombreEdit} onChange={(e) => setNombreEdit(e.target.value)} />
                    </label>
                    <label>
                      Descripción
                      <input
                        value={descripcionEdit}
                        onChange={(e) => setDescripcionEdit(e.target.value)}
                        placeholder="Se muestra en la landing pública"
                      />
                    </label>
                    <label>
                      Meses bonificados
                      <input type="number" min={0} value={mesesBonificadosEdit} onChange={(e) => setMesesBonificadosEdit(e.target.value)} />
                    </label>
                  </div>
                  <p className="muted" style={{ fontSize: '0.82rem' }}>
                    Cupo máximo de miembros por rol en las organizaciones de este plan.
                  </p>
                  <LimitesRolesEditor valores={limitesEdit} onChange={setLimitesEdit} />
                  <button className="btn" disabled={guardandoLimites} onClick={() => guardarEdicion(p)}>
                    {guardandoLimites ? 'Guardando…' : 'Guardar cambios'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="card">
        <h4 className="form-titulo">Nuevo plan</h4>
        <label>
          Nombre
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Plan Básico" />
        </label>
        <div className="form-grid">
          <label>
            Precio mensual
            <input type="number" required min={0} value={precioMensual} onChange={(e) => setPrecioMensual(e.target.value)} placeholder="Ej: 15000" />
          </label>
          <label>
            Precio anual
            <input type="number" required min={0} value={precioAnual} onChange={(e) => setPrecioAnual(e.target.value)} placeholder="Ej: 150000" />
            {precioMensual && precioAnual && Number(precioAnual) < Number(precioMensual) * 12 && (
              <span className="muted" style={{ fontWeight: 400, fontSize: '0.78rem' }}>
                {' '}(-{Math.round((1 - Number(precioAnual) / (Number(precioMensual) * 12)) * 100)}% vs. 12 meses al precio mensual)
              </span>
            )}
          </label>
        </div>
        <label>Cupo de miembros por rol</label>
        <LimitesRolesEditor valores={limitesRoles} onChange={setLimitesRoles} />
        <div className="form-grid">
          <label>
            Descripción (opcional)
            <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          </label>
          <label>
            Meses bonificados (opcional)
            <input type="number" min={0} value={mesesBonificados} onChange={(e) => setMesesBonificados(e.target.value)} placeholder="Ej: 3" />
          </label>
        </div>
        <button className="btn" disabled={cargando} onClick={crear}>
          {cargando ? 'Creando…' : 'Crear plan'}
        </button>
      </div>
    </div>
  );
}

// ── Grupos de organizaciones ──────────────────────────────────────────────
function Grupos({ grupos, onCambio }: { grupos: Grupo[]; onCambio: () => void }) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function crear() {
    if (nombre.trim().length < 2) { setError('Poné un nombre'); return; }
    setCargando(true); setError(null);
    try {
      await crearGrupo({ nombre: nombre.trim(), descripcion: descripcion.trim() || undefined });
      setNombre(''); setDescripcion(''); onCambio();
    } catch (e: any) { setError(e.message ?? 'No se pudo crear'); }
    finally { setCargando(false); }
  }
  async function eliminar(g: Grupo) {
    try { await eliminarGrupo(g.id); onCambio(); }
    catch (e: any) { setError(e.message ?? 'No se pudo eliminar'); }
  }

  return (
    <div>
      <h3>Grupos de organizaciones</h3>
      <p className="muted">Sirven para agrupar organizaciones (ej. "cadena de veterinarias") y poder dirigirles mensajes en conjunto.</p>
      {error && <div className="alerta">{error}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
        {grupos.length === 0 && <p className="muted">Todavía no hay grupos.</p>}
        {grupos.map((g) => (
          <div key={g.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div>
              <b>{g.nombre}</b>
              {g.descripcion && <div className="muted" style={{ fontSize: '0.85rem' }}>{g.descripcion}</div>}
            </div>
            <button className="btn-ghost" style={{ color: 'var(--danger)', borderColor: '#fca5a5' }} onClick={() => eliminar(g)}>Eliminar</button>
          </div>
        ))}
      </div>
      <div className="card">
        <h4 className="form-titulo">Nuevo grupo</h4>
        <label>
          Nombre
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Cadena de veterinarias" />
        </label>
        <label>
          Descripción (opcional)
          <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        </label>
        <button className="btn" disabled={cargando} onClick={crear}>
          {cargando ? 'Creando…' : 'Crear grupo'}
        </button>
      </div>
    </div>
  );
}

// ── Mensajes de la plataforma ─────────────────────────────────────────────
const ETIQUETA_TIPO_PREGUNTA: Record<TipoPregunta, string> = {
  si_no: 'Sí / No',
  opcion_multiple: 'Opción múltiple (una sola)',
  texto_breve: 'Respuesta escrita breve',
};

function Mensajes({ orgs, grupos }: { orgs: Organizacion[]; grupos: Grupo[] }) {
  const [items, setItems] = useState<MensajeAdmin[]>([]);
  const [titulo, setTitulo] = useState('');
  const [cuerpo, setCuerpo] = useState('');
  const [destinatarioTipo, setDestinatarioTipo] = useState<DestinatarioTipo>('todas');
  const [organizacionId, setOrganizacionId] = useState('');
  const [grupoId, setGrupoId] = useState('');
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [respuestasAbiertas, setRespuestasAbiertas] = useState<Record<string, RespuestasMensaje | 'cargando' | null>>({});

  async function cargar() {
    try { setItems(await listarMensajesAdmin()); }
    catch (e: any) { setError(e.message ?? 'Error al cargar mensajes'); }
  }
  useEffect(() => { cargar(); }, []);

  function agregarPregunta(tipo: TipoPregunta) {
    setPreguntas((ps) => [...ps, { tipo, texto: '', opciones: tipo === 'opcion_multiple' ? ['', ''] : undefined }]);
  }
  function actualizarTextoPregunta(idx: number, texto: string) {
    setPreguntas((ps) => ps.map((p, i) => (i === idx ? { ...p, texto } : p)));
  }
  function quitarPregunta(idx: number) {
    setPreguntas((ps) => ps.filter((_, i) => i !== idx));
  }
  function actualizarOpcion(idx: number, opIdx: number, valor: string) {
    setPreguntas((ps) => ps.map((p, i) => (i === idx ? { ...p, opciones: p.opciones?.map((o, j) => (j === opIdx ? valor : o)) } : p)));
  }
  function agregarOpcion(idx: number) {
    setPreguntas((ps) => ps.map((p, i) => (i === idx ? { ...p, opciones: [...(p.opciones ?? []), ''] } : p)));
  }
  function quitarOpcion(idx: number, opIdx: number) {
    setPreguntas((ps) => ps.map((p, i) => (i === idx ? { ...p, opciones: p.opciones?.filter((_, j) => j !== opIdx) } : p)));
  }

  async function enviar() {
    if (titulo.trim().length < 2 || cuerpo.trim().length < 2) { setError('Completá título y cuerpo'); return; }
    if (destinatarioTipo === 'organizacion' && !organizacionId) { setError('Elegí la organización destino'); return; }
    if (destinatarioTipo === 'grupo' && !grupoId) { setError('Elegí el grupo destino'); return; }
    for (const p of preguntas) {
      if (p.texto.trim().length < 2) { setError('Completá el texto de todas las preguntas (o quitá las vacías)'); return; }
      if (p.tipo === 'opcion_multiple' && (p.opciones ?? []).filter((o) => o.trim().length > 0).length < 2) {
        setError('Cada pregunta de opción múltiple necesita al menos 2 opciones'); return;
      }
    }
    setCargando(true); setError(null);
    try {
      await crearMensaje({
        titulo: titulo.trim(), cuerpo: cuerpo.trim(), destinatarioTipo,
        organizacionId: destinatarioTipo === 'organizacion' ? organizacionId : undefined,
        grupoId: destinatarioTipo === 'grupo' ? grupoId : undefined,
        preguntas: preguntas.length > 0
          ? preguntas.map((p) => ({
              tipo: p.tipo, texto: p.texto.trim(),
              opciones: p.tipo === 'opcion_multiple' ? p.opciones?.map((o) => o.trim()).filter(Boolean) : undefined,
            }))
          : undefined,
      });
      setTitulo(''); setCuerpo(''); setPreguntas([]);
      cargar();
    } catch (e: any) { setError(e.message ?? 'No se pudo enviar'); }
    finally { setCargando(false); }
  }
  async function eliminar(m: MensajeAdmin) {
    try { await eliminarMensaje(m.id); cargar(); }
    catch (e: any) { setError(e.message ?? 'No se pudo eliminar'); }
  }

  async function verRespuestas(m: MensajeAdmin) {
    if (respuestasAbiertas[m.id]) { setRespuestasAbiertas((r) => ({ ...r, [m.id]: null })); return; }
    setRespuestasAbiertas((r) => ({ ...r, [m.id]: 'cargando' }));
    try {
      const r = await respuestasMensaje(m.id);
      setRespuestasAbiertas((prev) => ({ ...prev, [m.id]: r }));
    } catch (e: any) {
      setError(e.message ?? 'No se pudieron cargar las respuestas');
      setRespuestasAbiertas((prev) => ({ ...prev, [m.id]: null }));
    }
  }

  function destinoLabel(m: MensajeAdmin) {
    if (m.destinatarioTipo === 'todas') return 'Todas las organizaciones';
    if (m.destinatarioTipo === 'organizacion') return orgs.find((o) => o.id === m.organizacionId)?.nombre ?? 'Organización';
    return grupos.find((g) => g.id === m.grupoId)?.nombre ?? 'Grupo';
  }

  return (
    <div>
      <h3>Mensajes de la plataforma</h3>
      <p className="muted">Anuncios (no chat) que se muestran como banner al loguearse — ej. avisos de precio o de funcionalidades nuevas. Sumales preguntas para pedir feedback: sí/no, opción múltiple o una respuesta escrita breve.</p>
      {error && <div className="alerta">{error}</div>}

      <div className="card">
        <h4 className="form-titulo">Nuevo mensaje</h4>
        <label>
          Título
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        </label>
        <label>
          Cuerpo
          <input value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} />
        </label>
        <div className="form-grid">
          <label>
            Destinatario
            <select value={destinatarioTipo} onChange={(e) => setDestinatarioTipo(e.target.value as DestinatarioTipo)}>
              <option value="todas">Todas las organizaciones</option>
              <option value="organizacion">Una organización</option>
              <option value="grupo">Un grupo</option>
            </select>
          </label>
          {destinatarioTipo === 'organizacion' && (
            <label>
              Organización
              <select value={organizacionId} onChange={(e) => setOrganizacionId(e.target.value)}>
                <option value="">Elegir…</option>
                {orgs.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
              </select>
            </label>
          )}
          {destinatarioTipo === 'grupo' && (
            <label>
              Grupo
              <select value={grupoId} onChange={(e) => setGrupoId(e.target.value)}>
                <option value="">Elegir…</option>
                {grupos.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
              </select>
            </label>
          )}
        </div>

        <h4 className="form-titulo" style={{ marginTop: '1rem' }}>Preguntas de feedback (opcional)</h4>
        {preguntas.length === 0 && <p className="muted" style={{ fontSize: '0.85rem' }}>Sin preguntas — el mensaje sale como un simple anuncio.</p>}
        {preguntas.map((p, idx) => (
          <div key={idx} className="card" style={{ marginBottom: '0.5rem', background: 'var(--hover-bg, #f5f5f5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem' }}>
              <span className="chip">{ETIQUETA_TIPO_PREGUNTA[p.tipo]}</span>
              <button className="link" onClick={() => quitarPregunta(idx)}>Quitar</button>
            </div>
            <label style={{ marginTop: '0.4rem' }}>
              Pregunta
              <input value={p.texto} onChange={(e) => actualizarTextoPregunta(idx, e.target.value)} placeholder="Ej: ¿Probaste el turnero nuevo?" />
            </label>
            {p.tipo === 'opcion_multiple' && (
              <div style={{ marginTop: '0.3rem' }}>
                {(p.opciones ?? []).map((op, opIdx) => (
                  <div key={opIdx} style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.3rem' }}>
                    <input
                      value={op}
                      onChange={(e) => actualizarOpcion(idx, opIdx, e.target.value)}
                      placeholder={`Opción ${opIdx + 1}`}
                      style={{ flex: 1 }}
                    />
                    {(p.opciones?.length ?? 0) > 2 && (
                      <button className="link" onClick={() => quitarOpcion(idx, opIdx)}>✕</button>
                    )}
                  </div>
                ))}
                <button className="link" onClick={() => agregarOpcion(idx)}>+ Agregar opción</button>
              </div>
            )}
          </div>
        ))}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          <button className="btn-ghost" onClick={() => agregarPregunta('si_no')}>+ Pregunta sí/no</button>
          <button className="btn-ghost" onClick={() => agregarPregunta('opcion_multiple')}>+ Opción múltiple</button>
          <button className="btn-ghost" onClick={() => agregarPregunta('texto_breve')}>+ Respuesta breve</button>
        </div>

        <button className="btn" disabled={cargando} onClick={enviar}>
          {cargando ? 'Enviando…' : 'Enviar'}
        </button>
      </div>

      <h4 className="dato-label" style={{ marginTop: '1.25rem' }}>Enviados</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {items.length === 0 && <p className="muted">Todavía no se envió ningún mensaje.</p>}
        {items.map((m) => {
          const respuestas = respuestasAbiertas[m.id];
          return (
            <div key={m.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div>
                  <b>{m.titulo}</b>
                  <div className="muted" style={{ fontSize: '0.85rem' }}>
                    {destinoLabel(m)} · {new Date(m.publicadoEn).toLocaleDateString()}
                    {m.preguntas.length > 0 && <> · {m.preguntas.length} pregunta{m.preguntas.length === 1 ? '' : 's'}</>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {m.preguntas.length > 0 && (
                    <button className="btn-ghost" onClick={() => verRespuestas(m)}>
                      {respuestas ? 'Ocultar respuestas' : 'Ver respuestas'}
                    </button>
                  )}
                  <button className="btn-ghost" style={{ color: 'var(--danger)', borderColor: '#fca5a5' }} onClick={() => eliminar(m)}>Eliminar</button>
                </div>
              </div>

              {respuestas === 'cargando' && <p className="muted" style={{ marginTop: '0.5rem' }}>Cargando respuestas…</p>}
              {respuestas && respuestas !== 'cargando' && (
                <div style={{ marginTop: '0.75rem', paddingTop: '0.6rem', borderTop: '1px solid var(--border)' }}>
                  <p className="muted" style={{ fontSize: '0.85rem' }}>{respuestas.totalRespondieron} persona{respuestas.totalRespondieron === 1 ? '' : 's'} respondieron.</p>
                  {respuestas.preguntas.map((p) => (
                    <div key={p.id} style={{ marginBottom: '0.6rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.texto}</div>
                      {p.tipo === 'texto_breve' ? (
                        p.respuestas.length === 0 ? (
                          <p className="muted" style={{ fontSize: '0.85rem' }}>Sin respuestas todavía.</p>
                        ) : (
                          <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.2rem', fontSize: '0.85rem' }}>
                            {p.respuestas.map((r, i) => (
                              <li key={i}>"{r.respuesta}" — <span className="muted">{r.organizacion}</span></li>
                            ))}
                          </ul>
                        )
                      ) : Object.keys(p.conteos).length === 0 ? (
                        <p className="muted" style={{ fontSize: '0.85rem' }}>Sin respuestas todavía.</p>
                      ) : (
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                          {Object.entries(p.conteos).map(([valor, cantidad]) => (
                            <span key={valor} className="chip">{valor}: {cantidad}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Analítica de uso ──────────────────────────────────────────────────────
/** Qué pantallas y acciones usan más los clientes — eventos que dispara `api.registrarEvento()` en la app (App.tsx, HuellaHomeSection.tsx, ...). */
function Analitica() {
  const hace30Dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [desde, setDesde] = useState(hace30Dias);
  const [hasta, setHasta] = useState(new Date().toISOString().slice(0, 10));
  const [datos, setDatos] = useState<ResumenAnalitica | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function buscar() {
    setCargando(true);
    setError(null);
    try {
      setDatos(await resumenAnalitica(desde, `${hasta}T23:59:59`));
    } catch (e: any) { setError(e.message ?? 'Error al cargar'); }
    finally { setCargando(false); }
  }

  useEffect(() => {
    buscar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="page-head"><h1>Analítica de uso</h1></div>
      <p className="muted" style={{ marginTop: '-0.5rem', marginBottom: '1rem' }}>
        Qué pantallas y acciones usan más los clientes — sólo un punteo inicial de lo instrumentado hoy
        (Home y sus accesos rápidos, más las pantallas de la app), no todavía toda la plataforma.
      </p>
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
              <span className="dato-label">Eventos totales</span>
              <strong>{datos.total}</strong>
            </div>
            <div className="dato">
              <span className="dato-label">Pantallas distintas</span>
              <strong>{datos.pantallas.length}</strong>
            </div>
            <div className="dato">
              <span className="dato-label">Acciones distintas</span>
              <strong>{datos.acciones.length}</strong>
            </div>
            <div className="dato">
              <span className="dato-label">Organizaciones activas</span>
              <strong>{datos.porOrganizacion.length}</strong>
            </div>
          </div>

          <div className="layout-2col">
            <div className="layout-main">
              <h2 className="form-titulo">Pantallas más visitadas</h2>
              {datos.pantallas.length === 0 ? (
                <p className="muted">Sin datos en este rango.</p>
              ) : (
                <div className="card">
                  <table className="tabla">
                    <thead>
                      <tr><th>Pantalla</th><th>Vistas</th></tr>
                    </thead>
                    <tbody>
                      {datos.pantallas.map((p) => (
                        <tr key={p.nombre}><td>{p.nombre}</td><td>{p.cantidad}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="layout-side">
              <h2 className="form-titulo">Acciones más usadas</h2>
              {datos.acciones.length === 0 ? (
                <p className="muted">Sin datos en este rango.</p>
              ) : (
                <div className="card">
                  <table className="tabla">
                    <thead>
                      <tr><th>Acción</th><th>Usos</th></tr>
                    </thead>
                    <tbody>
                      {datos.acciones.map((a) => (
                        <tr key={a.nombre}><td>{a.nombre}</td><td>{a.cantidad}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <h2 className="form-titulo" style={{ marginTop: '1.5rem' }}>Organizaciones más activas</h2>
          {datos.porOrganizacion.length === 0 ? (
            <p className="muted">Sin datos en este rango.</p>
          ) : (
            <div className="card">
              <table className="tabla">
                <thead>
                  <tr><th>Organización</th><th>Eventos</th></tr>
                </thead>
                <tbody>
                  {datos.porOrganizacion.map((o) => (
                    <tr key={o.organizacionId}><td>{o.organizacionNombre}</td><td>{o.cantidad}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Bandeja de solicitudes ────────────────────────────────────────────────
/**
 * Interesados del lanzamiento (botón "Estoy interesado" de la landing, cupo
 * fijo de 10 — ver InteresadosService en el backend). Sólo lectura: el alta
 * real de la organización se hace a mano acá mismo, en "Organizaciones",
 * usando el contacto que dejaron. No tiene aprobar/rechazar como
 * Solicitudes porque no es un flujo de aprobación, es una lista de contacto.
 */
function Interesados() {
  const [items, setItems] = useState<Interesado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [emailForm, setEmailForm] = useState('');
  const [celularForm, setCelularForm] = useState('');
  const [ocupado, setOcupado] = useState<string | null>(null); // id con una acción en curso (guardar/eliminar/reenviar)
  const [invitando, setInvitando] = useState(false);

  function cargar() {
    setCargando(true);
    listarInteresadosAdmin()
      .then(setItems)
      .catch((e) => setError(e.message ?? 'Error al cargar interesados'))
      .finally(() => setCargando(false));
  }

  useEffect(cargar, []);

  function abrirEdicion(i: Interesado) {
    setEditandoId(i.id);
    setEmailForm(i.email ?? '');
    setCelularForm(i.celular ?? '');
  }

  async function guardarEdicion(id: string) {
    setOcupado(id);
    setError(null);
    try {
      await editarInteresadoAdmin(id, { email: emailForm.trim() || undefined, celular: celularForm.trim() || undefined });
      setEditandoId(null);
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setOcupado(null);
    }
  }

  async function eliminar(id: string) {
    if (!confirm('¿Sacar a este interesado de la lista? Libera su lugar en el cupo.')) return;
    setOcupado(id);
    setError(null);
    try {
      await eliminarInteresadoAdmin(id);
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar');
    } finally {
      setOcupado(null);
    }
  }

  async function reenviar(id: string) {
    setOcupado(id);
    setError(null);
    try {
      await reenviarConfirmacionInteresado(id);
      alert('Mail de confirmación reenviado.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo reenviar');
    } finally {
      setOcupado(null);
    }
  }

  async function invitarTodos() {
    const conEmail = items.filter((i) => i.email).length;
    if (!confirm(`Se les va a mandar el link para terminar el alta a los ${conEmail} interesados que tienen email cargado. ¿Confirmás?`)) return;
    setInvitando(true);
    setError(null);
    try {
      const r = await invitarTodosInteresados();
      alert(`Listo, se mandaron ${r.enviados} invitaciones.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar');
    } finally {
      setInvitando(false);
    }
  }

  if (cargando) return null;
  if (items.length === 0 && !error) return null;

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', justifyContent: 'space-between' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          Interesados del lanzamiento <EstadoChip texto={`${items.length}/10`} />
        </span>
        <button className="btn-ghost" disabled={invitando} onClick={invitarTodos}>
          {invitando ? 'Enviando…' : '🚀 Habilitar alta para todos'}
        </button>
      </h3>
      {error && <div className="alerta" style={{ marginBottom: 8 }}>{error}</div>}
      <div className="card">
        {items.map((i, idx) => (
          <div
            key={i.id}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', padding: '0.5rem 0',
              borderTop: idx > 0 ? '1px solid var(--border)' : undefined,
            }}
          >
            <div style={{ flex: 1 }}>
              <b>{i.nombre}</b> — {i.nombreVeterinaria}
              {editandoId === i.id ? (
                <div className="form-grid" style={{ marginTop: '0.4rem', maxWidth: 420 }}>
                  <label className="span-2">
                    Email
                    <input type="email" value={emailForm} onChange={(e) => setEmailForm(e.target.value)} />
                  </label>
                  <label className="span-2">
                    Celular
                    <input value={celularForm} onChange={(e) => setCelularForm(e.target.value)} />
                  </label>
                  <div className="span-2" style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn-ghost" disabled={ocupado === i.id} onClick={() => guardarEdicion(i.id)}>
                      {ocupado === i.id ? 'Guardando…' : 'Guardar'}
                    </button>
                    <button className="link" onClick={() => setEditandoId(null)}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <div className="muted" style={{ fontSize: '0.85rem' }}>
                  {i.email || <i>sin email cargado</i>}{i.celular ? ` · ${i.celular}` : ''}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem' }}>
              <span className="muted" style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                {new Date(i.createdAt).toLocaleDateString('es-AR')}
              </span>
              {editandoId !== i.id && (
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {i.email && (
                    <button className="link" disabled={ocupado === i.id} onClick={() => reenviar(i.id)}>
                      Reenviar
                    </button>
                  )}
                  <button className="link" onClick={() => abrirEdicion(i)}>Editar</button>
                  <button className="link" disabled={ocupado === i.id} onClick={() => eliminar(i.id)}>Eliminar</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Solicitudes({ orgs, planes, onCambio }: { orgs: Organizacion[]; planes: Plan[]; onCambio: () => void }) {
  const [items, setItems] = useState<Solicitud[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function cargar() {
    setCargando(true); setError(null);
    try { setItems(await listarSolicitudes('pendiente')); }
    catch (e: any) { setError(e.message ?? 'Error al cargar solicitudes'); }
    finally { setCargando(false); }
  }
  useEffect(() => { cargar(); }, []);

  // Al resolver una solicitud (aprobar crea una organización nueva, con su
  // plan y fecha de activación ya aplicados) hay que refrescar tanto esta
  // bandeja como la lista de organizaciones/Home del padre — si no, la
  // organización recién creada no aparece hasta recargar la página entera
  // (Panel sólo carga orgs/pagos una vez, al montar).
  function resuelta() {
    cargar();
    onCambio();
  }

  if (cargando) return null;
  if (error) return <div className="alerta" style={{ marginBottom: 12 }}>{error}</div>;
  if (items.length === 0) return null;

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        Solicitudes pendientes <EstadoChip texto={String(items.length)} />
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {items.map((s) => <SolicitudCard key={s.id} s={s} orgs={orgs} planes={planes} onResuelta={resuelta} />)}
      </div>
    </div>
  );
}

function SolicitudCard({ s, orgs, planes, onResuelta }: {
  s: Solicitud; orgs: Organizacion[]; planes: Plan[]; onResuelta: () => void;
}) {
  const [orgId, setOrgId] = useState('');
  const [rol, setRol] = useState('veterinario');
  const [error, setError] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);

  async function aprobar() {
    if (s.tipo === 'unirse' && !orgId) { setError('Elegí la organización destino'); return; }
    setTrabajando(true); setError(null);
    try {
      await aprobarSolicitud(s.id, s.tipo === 'unirse' ? { organizacionId: orgId, rol } : {});
      onResuelta();
    } catch (e: any) { setError(e.message ?? 'No se pudo aprobar'); setTrabajando(false); }
  }
  async function rechazar() {
    setTrabajando(true); setError(null);
    try { await rechazarSolicitud(s.id); onResuelta(); }
    catch (e: any) { setError(e.message ?? 'No se pudo rechazar'); setTrabajando(false); }
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
        <div>
          <b>{s.nombre} {s.apellido}</b>
          <div className="muted" style={{ fontSize: '0.85rem' }}>
            {s.email}{s.telefono ? ` · ${s.telefono}` : ''}{s.dni ? ` · DNI ${s.dni}` : ''}
          </div>
        </div>
        <span className="chip">{s.tipo === 'crear' ? 'Crear' : 'Unirse'}</span>
      </div>
      <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
        {s.tipo === 'crear'
          ? <>Quiere crear <b>{s.nombreOrganizacion}</b> ({s.tipoOrganizacion})</>
          : <>Quiere unirse a <b>{s.organizacionSolicitada}</b></>}
      </p>
      {s.tipo === 'crear' && (
        <p className="muted" style={{ fontSize: '0.85rem', marginTop: '0.15rem' }}>
          Plan solicitado: <b>{planes.find((p) => p.id === s.planId)?.nombre ?? '—'}</b>
        </p>
      )}
      {s.tipo === 'crear' && (s.direccionOrganizacion || s.localidadOrganizacion || s.provinciaOrganizacion || s.telefonoOrganizacion || s.emailOrganizacion) && (
        <p className="muted" style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
          {[s.direccionOrganizacion, s.localidadOrganizacion, s.provinciaOrganizacion].filter(Boolean).join(', ')}
          {s.telefonoOrganizacion ? ` · Tel: ${s.telefonoOrganizacion}` : ''}
          {s.emailOrganizacion ? ` · ${s.emailOrganizacion}` : ''}
        </p>
      )}
      <p className="muted" style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
        {s.terminosAceptadosEn
          ? `Aceptó los términos el ${new Date(s.terminosAceptadosEn).toLocaleDateString()} (v${s.terminosVersion ?? '?'})`
          : 'No hay registro de aceptación de términos'}
      </p>

      {s.tipo === 'unirse' && (
        <div className="form-grid" style={{ marginTop: '0.5rem' }}>
          <label>
            Organización destino
            <select value={orgId} onChange={(e) => setOrgId(e.target.value)}>
              <option value="">Elegir…</option>
              {orgs.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
            </select>
          </label>
          <label>
            Rol
            <select value={rol} onChange={(e) => setRol(e.target.value)}>
              <option value="veterinario">Veterinario</option>
              <option value="recepcion">Administrativa / Recepción</option>
              <option value="admin">Administrador</option>
            </select>
          </label>
        </div>
      )}

      {error && <div className="alerta">{error}</div>}
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
        <button className="btn-ghost" disabled={trabajando} onClick={rechazar}>Rechazar</button>
        <button className="btn" disabled={trabajando} onClick={aprobar}>Aprobar</button>
      </div>
    </div>
  );
}

// ── Shell (nav rail + contenido, mismo patrón que App.tsx) ─────────────────
function IconoRail({ paths }: { paths: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: paths }}
    />
  );
}

function Shell({ children, onSalir, seccion, onSeccion }: {
  children: React.ReactNode;
  onSalir?: () => void;
  seccion?: Seccion;
  onSeccion?: (s: Seccion) => void;
}) {
  const tituloActivo = SECCIONES_NAV.find((s) => s.id === seccion)?.titulo;

  return (
    <div className="app app-rail">
      {onSalir && seccion && onSeccion && (
        <aside className="nav-rail">
          <div className="options-group">
            {SECCIONES_NAV.map((s) => (
              <button
                key={s.id}
                className={`option-btn${seccion === s.id ? ' active' : ''}`}
                data-title={s.titulo}
                onClick={() => onSeccion(s.id)}
              >
                <IconoRail paths={s.icono} />
              </button>
            ))}
          </div>
          <div className="user-group">
            <button className="user-btn" data-title="Salir" onClick={onSalir}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
          </div>
        </aside>
      )}

      <main className="contenido-shell">
        <div className="content-header">
          <div className="badge-huella">
            <span>Plataforma</span>
            {tituloActivo && (
              <>
                <span className="separator">|</span>
                <span>{tituloActivo}</span>
              </>
            )}
          </div>
        </div>
        <div className="contenido">{children}</div>
      </main>
    </div>
  );
}

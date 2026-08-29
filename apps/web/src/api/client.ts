import type { Sesion, Especie, Animal, Consulta, Persona, Turno,
  EstadoTurno, RecordatorioVacuna, Vacunacion, Establecimiento, Existencia, CategoriaHacienda,
  Movimiento, Evento, Producto, StockItem, MovimientoStock,
  ResumenDashboard, MensajePlataforma, Macro, CategoriaMacro, Indicacion, ConsultaResumen,
  Caja, Cobro, Egreso, EstadoAuditoriaCaja } from './types';

const API = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000';

function headers(sesion?: Sesion | null): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (sesion?.token) h['Authorization'] = `Bearer ${sesion.token}`;
  if (sesion?.organizacionId) h['X-Organizacion-Id'] = sesion.organizacionId;
  return h;
}

async function handle(res: Response) {
  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try {
      const body = await res.json();
      if (body?.message) msg = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    } catch {
      /* respuesta sin cuerpo JSON */
    }
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────
// Refresh silencioso: si un pedido vuelve 401, se intenta renovar el access
// token con el refreshToken de la sesión y se reintenta una sola vez. Cuando
// funciona, se avisa a App.tsx (vía configurarRefrescoSesion) para que
// persista los tokens nuevos en useSesion/localStorage.
// ─────────────────────────────────────────────────────────────────────────
let _onRefresco: ((tokens: { accessToken: string; refreshToken: string }) => void) | null = null;

/** Llamar desde App.tsx: useEffect(() => configurarRefrescoSesion(actualizarTokens), []). */
export function configurarRefrescoSesion(cb: typeof _onRefresco) {
  _onRefresco = cb;
}

async function refrescarTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string } | null> {
  try {
    const res = await fetch(`${API}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/** fetch autenticado con reintento único ante un 401 (renovando el access token). */
async function pedir(s: Sesion, path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${API}${path}`, { ...options, headers: headers(s) });
  if (res.status !== 401 || !s.refreshToken) return handle(res);

  const tokens = await refrescarTokens(s.refreshToken);
  if (!tokens) return handle(res); // refresh token también vencido: dejamos que falle con el 401 original

  _onRefresco?.(tokens);
  const sNueva: Sesion = { ...s, token: tokens.accessToken, refreshToken: tokens.refreshToken };
  const res2 = await fetch(`${API}${path}`, { ...options, headers: headers(sNueva) });
  return handle(res2);
}

export interface RegisterData {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  nombreOrganizacion: string;
}

export const api = {
  register(data: RegisterData): Promise<{ accessToken: string; refreshToken: string }> {
    return fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(data),
    }).then(handle);
  },

  login(
    email: string,
    password: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    organizaciones: { organizacionId: string; roles: string[]; tipo: string }[];
  }> {
    return fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ email, password }),
    }).then(handle);
  },

  especies(s: Sesion): Promise<Especie[]> {
    return pedir(s, '/especies');
  },

  animales(s: Sesion): Promise<Animal[]> {
    return pedir(s, '/animales');
  },

  obtenerAnimal(s: Sesion, id: string): Promise<Animal> {
    return pedir(s, `/animales/${id}`);
  },

  crearAnimal(s: Sesion, data: Partial<Animal>): Promise<Animal> {
    return pedir(s, '/animales', { method: 'POST', body: JSON.stringify(data) });
  },

  actualizarAnimal(s: Sesion, id: string, data: Record<string, unknown>): Promise<Animal> {
    return pedir(s, `/animales/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  },

  personas(s: Sesion): Promise<Persona[]> {
    return pedir(s, '/personas');
  },

  crearPersona(s: Sesion, data: Record<string, unknown>): Promise<Persona> {
    return pedir(s, '/personas', { method: 'POST', body: JSON.stringify(data) });
  },

  actualizarPersona(s: Sesion, id: string, data: Record<string, unknown>): Promise<Persona> {
    return pedir(s, `/personas/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  },

  animalesDePersona(s: Sesion, personaId: string): Promise<Animal[]> {
    return pedir(s, `/personas/${personaId}/animales`);
  },

  consultasDeAnimal(s: Sesion, animalId: string): Promise<Consulta[]> {
    return pedir(s, `/consultas/animal/${animalId}`);
  },

  crearConsulta(s: Sesion, data: Record<string, unknown>): Promise<Consulta> {
    return pedir(s, '/consultas', { method: 'POST', body: JSON.stringify(data) });
  },

  actualizarConsulta(s: Sesion, id: string, data: Record<string, unknown>): Promise<Consulta> {
    return pedir(s, `/consultas/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  },

  eliminarConsulta(s: Sesion, id: string): Promise<{ ok: boolean }> {
    return pedir(s, `/consultas/${id}`, { method: 'DELETE' });
  },

  /** Drill-down del dashboard (§4.2): consultas de toda la organización en un rango de fechas. */
  consultasPorRango(s: Sesion, desde?: string, hasta?: string): Promise<ConsultaResumen[]> {
    const q = new URLSearchParams();
    if (desde) q.set('desde', desde);
    if (hasta) q.set('hasta', hasta);
    const qs = q.toString();
    return pedir(s, `/consultas${qs ? `?${qs}` : ''}`);
  },

  turnos(s: Sesion, desde?: string, hasta?: string): Promise<Turno[]> {
    const q = new URLSearchParams();
    if (desde) q.set('desde', desde);
    if (hasta) q.set('hasta', hasta);
    const qs = q.toString();
    return pedir(s, `/turnos${qs ? `?${qs}` : ''}`);
  },

  crearTurno(
    s: Sesion,
    data: { animalId: string; fechaHora: string; motivo?: string; canal?: string; veterinarioId?: string },
  ): Promise<Turno> {
    return pedir(s, '/turnos', { method: 'POST', body: JSON.stringify(data) });
  },

  cambiarEstadoTurno(
    s: Sesion,
    id: string,
    data: { estado: EstadoTurno; fechaHora?: string; veterinarioId?: string },
  ): Promise<Turno> {
    return pedir(s, `/turnos/${id}/estado`, { method: 'PATCH', body: JSON.stringify(data) });
  },

  turnosDeAnimal(s: Sesion, animalId: string): Promise<Turno[]> {
    return pedir(s, `/turnos/animal/${animalId}`);
  },

  recordatoriosVacunas(s: Sesion, dias = 30): Promise<RecordatorioVacuna[]> {
    return pedir(s, `/vacunaciones/recordatorios?dias=${dias}`);
  },

  vacunacionesDeAnimal(s: Sesion, animalId: string): Promise<Vacunacion[]> {
    return pedir(s, `/vacunaciones/animal/${animalId}`);
  },

  registrarVacunacion(s: Sesion, data: Record<string, unknown>): Promise<Vacunacion> {
    return pedir(s, '/vacunaciones', { method: 'POST', body: JSON.stringify(data) });
  },

  veterinarios(s: Sesion): Promise<Veterinario[]> {
    return pedir(s, '/personas/veterinarios');
  },

  establecimientos(s: Sesion): Promise<Establecimiento[]> {
    return pedir(s, '/tropera/establecimientos');
  },

  crearEstablecimiento(s: Sesion, data: Record<string, unknown>): Promise<Establecimiento> {
    return pedir(s, '/tropera/establecimientos', { method: 'POST', body: JSON.stringify(data) });
  },

  actualizarEstablecimiento(s: Sesion, id: string, data: Record<string, unknown>): Promise<Establecimiento> {
    return pedir(s, `/tropera/establecimientos/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  },

  existenciasDeEstablecimiento(s: Sesion, establecimientoId: string): Promise<Existencia[]> {
    return pedir(s, `/tropera/establecimientos/${establecimientoId}/existencias`);
  },

  /** Existencias de TODOS los establecimientos de la organización (panel consolidado). */
  existenciasConsolidadas(s: Sesion): Promise<{ establecimientoId: string; categoria: CategoriaHacienda; cantidad: number }[]> {
    return pedir(s, '/tropera/existencias');
  },

  fijarExistencia(
    s: Sesion,
    establecimientoId: string,
    data: { categoria: CategoriaHacienda; cantidad: number },
  ): Promise<Existencia> {
    return pedir(s, `/tropera/establecimientos/${establecimientoId}/existencias`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  crearMovimiento(s: Sesion, data: Record<string, unknown>): Promise<Movimiento> {
    return pedir(s, '/tropera/movimientos', { method: 'POST', body: JSON.stringify(data) });
  },

  movimientos(s: Sesion, establecimientoId?: string, desde?: string, hasta?: string): Promise<Movimiento[]> {
    const q = new URLSearchParams();
    if (establecimientoId) q.set('establecimientoId', establecimientoId);
    if (desde) q.set('desde', desde);
    if (hasta) q.set('hasta', hasta);
    const qs = q.toString();
    return pedir(s, `/tropera/movimientos${qs ? `?${qs}` : ''}`);
  },

  crearEvento(s: Sesion, data: Record<string, unknown>): Promise<Evento> {
    return pedir(s, '/tropera/eventos', { method: 'POST', body: JSON.stringify(data) });
  },

  eventos(s: Sesion, establecimientoId?: string): Promise<Evento[]> {
    const qs = establecimientoId ? `?establecimientoId=${establecimientoId}` : '';
    return pedir(s, `/tropera/eventos${qs}`);
  },

  miembros(s: Sesion): Promise<Miembro[]> {
    return pedir(s, '/usuarios');
  },

  resetearPassword(s: Sesion, usuarioId: string, nuevaPassword?: string): Promise<ResetPasswordResultado> {
    return pedir(s, `/usuarios/${usuarioId}/password`, {
      method: 'PATCH',
      body: JSON.stringify(nuevaPassword ? { nuevaPassword } : {}),
    });
  },

  /** Emite el magic-link de acceso al portal para un dueño (vale 30 días). */
  generarAccesoPortal(s: Sesion, personaId: string): Promise<{ token: string; portalUrl: string }> {
    return pedir(s, `/portal/acceso/${personaId}`, { method: 'POST' });
  },

  productos(s: Sesion): Promise<Producto[]> {
    return pedir(s, '/farmacia/productos');
  },

  crearProducto(s: Sesion, data: Record<string, unknown>): Promise<Producto> {
    return pedir(s, '/farmacia/productos', { method: 'POST', body: JSON.stringify(data) });
  },

  actualizarProducto(s: Sesion, id: string, data: Record<string, unknown>): Promise<Producto> {
    return pedir(s, `/farmacia/productos/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  },

  stock(s: Sesion): Promise<StockItem[]> {
    return pedir(s, '/farmacia/stock');
  },

  fijarStock(s: Sesion, productoId: string, cantidad: number): Promise<{ productoId: string; cantidad: number }> {
    return pedir(s, `/farmacia/stock/${productoId}`, { method: 'PATCH', body: JSON.stringify({ cantidad }) });
  },

  crearMovimientoStock(s: Sesion, data: Record<string, unknown>): Promise<MovimientoStock> {
    return pedir(s, '/farmacia/movimientos', { method: 'POST', body: JSON.stringify(data) });
  },

  movimientosStock(s: Sesion, productoId?: string, consultaId?: string): Promise<MovimientoStock[]> {
    const params = new URLSearchParams();
    if (productoId) params.set('productoId', productoId);
    if (consultaId) params.set('consultaId', consultaId);
    const qs = params.toString();
    return pedir(s, `/farmacia/movimientos${qs ? `?${qs}` : ''}`);
  },

  resumenDashboard(s: Sesion): Promise<ResumenDashboard> {
    return pedir(s, '/dashboard/resumen');
  },

  mensajesPendientes(s: Sesion): Promise<MensajePlataforma[]> {
    return pedir(s, '/mensajes/pendientes');
  },

  marcarMensajeLeido(s: Sesion, id: string): Promise<{ ok: boolean }> {
    return pedir(s, `/mensajes/${id}/leido`, { method: 'POST' });
  },

  // --- Caja (Fase D) ---

  cajaActual(s: Sesion): Promise<Caja | null> {
    return pedir(s, '/caja/cajas/actual');
  },

  abrirCaja(s: Sesion, montoInicial: number): Promise<Caja> {
    return pedir(s, '/caja/cajas', { method: 'POST', body: JSON.stringify({ montoInicial }) });
  },

  cerrarCaja(s: Sesion, id: string, data: { montoDeclarado: number; observaciones?: string }): Promise<Caja> {
    return pedir(s, `/caja/cajas/${id}/cerrar`, { method: 'PATCH', body: JSON.stringify(data) });
  },

  /** Bandeja de auditoría (§4.1) — histórico de cajas cerradas, opcionalmente filtrado por estado. */
  cajas(s: Sesion, estadoAuditoria?: EstadoAuditoriaCaja): Promise<Caja[]> {
    return pedir(s, `/caja/cajas${estadoAuditoria ? `?estadoAuditoria=${estadoAuditoria}` : ''}`);
  },

  auditarCaja(s: Sesion, id: string, data: { estadoAuditoria: string; observaciones?: string }): Promise<Caja> {
    return pedir(s, `/caja/cajas/${id}/auditoria`, { method: 'PATCH', body: JSON.stringify(data) });
  },

  crearCobro(s: Sesion, data: Record<string, unknown>): Promise<Cobro> {
    return pedir(s, '/caja/cobros', { method: 'POST', body: JSON.stringify(data) });
  },

  cobrosDeCaja(s: Sesion, cajaId: string): Promise<Cobro[]> {
    return pedir(s, `/caja/cobros?cajaId=${cajaId}`);
  },

  /** Liquidación de honorarios (§4.4). */
  honorarios(s: Sesion, desde?: string, hasta?: string, veterinarioId?: string): Promise<Cobro[]> {
    const q = new URLSearchParams();
    if (desde) q.set('desde', desde);
    if (hasta) q.set('hasta', hasta);
    if (veterinarioId) q.set('veterinarioId', veterinarioId);
    const qs = q.toString();
    return pedir(s, `/caja/cobros/honorarios${qs ? `?${qs}` : ''}`);
  },

  liquidarHonorarios(s: Sesion, data: { veterinarioId: string; desde: string; hasta: string }): Promise<{ ok: boolean; cantidad: number }> {
    return pedir(s, '/caja/cobros/honorarios/liquidar', { method: 'PATCH', body: JSON.stringify(data) });
  },

  crearEgreso(s: Sesion, data: { concepto: string; monto: number }): Promise<Egreso> {
    return pedir(s, '/caja/egresos', { method: 'POST', body: JSON.stringify(data) });
  },

  egresosDeCaja(s: Sesion, cajaId: string): Promise<Egreso[]> {
    return pedir(s, `/caja/egresos?cajaId=${cajaId}`);
  },

  macros(s: Sesion, categoria?: CategoriaMacro): Promise<Macro[]> {
    return pedir(s, `/hce/macros${categoria ? `?categoria=${categoria}` : ''}`);
  },

  crearMacro(s: Sesion, data: { categoria: CategoriaMacro; tag: string; texto: string }): Promise<Macro> {
    return pedir(s, '/hce/macros', { method: 'POST', body: JSON.stringify(data) });
  },

  actualizarMacro(s: Sesion, id: string, data: Record<string, unknown>): Promise<Macro> {
    return pedir(s, `/hce/macros/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  },

  eliminarMacro(s: Sesion, id: string): Promise<{ ok: boolean }> {
    return pedir(s, `/hce/macros/${id}`, { method: 'DELETE' });
  },

  indicacionesDeConsulta(s: Sesion, consultaId: string): Promise<Indicacion[]> {
    return pedir(s, `/hce/indicaciones?consultaId=${consultaId}`);
  },

  indicacionesDeAnimal(s: Sesion, animalId: string): Promise<Indicacion[]> {
    return pedir(s, `/hce/indicaciones?animalId=${animalId}`);
  },

  crearIndicacion(s: Sesion, data: Record<string, unknown>): Promise<Indicacion> {
    return pedir(s, '/hce/indicaciones', { method: 'POST', body: JSON.stringify(data) });
  },

  actualizarIndicacion(s: Sesion, id: string, data: Record<string, unknown>): Promise<Indicacion> {
    return pedir(s, `/hce/indicaciones/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  },

  eliminarIndicacion(s: Sesion, id: string): Promise<{ ok: boolean }> {
    return pedir(s, `/hce/indicaciones/${id}`, { method: 'DELETE' });
  },

};

export interface Veterinario {
  usuarioId: string;
  nombre: string | null;
  apellido: string | null;
}

export interface Miembro {
  usuarioId: string;
  nombre: string | null;
  apellido: string | null;
  roles: string[];
}

export interface ResetPasswordResultado {
  ok: boolean;
  email: string;
  temporal: boolean;
  password?: string; // sólo viene cuando `temporal` es true — se muestra una única vez
}

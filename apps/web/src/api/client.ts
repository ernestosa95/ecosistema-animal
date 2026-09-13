import type { Sesion, Especie, Animal, Consulta, Persona, Turno,
  EstadoTurno, RecordatorioVacuna, Vacunacion, ItemCatalogoVacunas, Establecimiento, Existencia, CategoriaHacienda,
  Movimiento, Evento, Producto, ProductoSenasa, StockItem, MovimientoStock,
  ResumenDashboard, MensajePlataforma, Macro, CategoriaMacro, Indicacion, ConsultaResumen,
  Caja, Cobro, Egreso, EstadisticasCaja, EstadoAuditoriaCaja, AnimalCampo, Hallazgo, ToroVirtual, Muestra, EvaluacionAndrologica,
  Potrero, PlantillaTareas, ProtocoloIatf, Tarea, EstadoTarea } from './types';

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
  // 204 explícito o un 200 con cuerpo vacío (Nest no manda body ni
  // Content-Type cuando el controller devuelve null/undefined — pasa en
  // endpoints tipo "actual" que representan "no hay nada" con null, ej.
  // GET /caja/cajas/actual). res.json() sobre texto vacío tira
  // "unexpected end of data", así que se lee como texto primero.
  if (res.status === 204) return null;
  const texto = await res.text();
  return texto ? JSON.parse(texto) : null;
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

/** Como `pedir`, pero para `multipart/form-data` — sin forzar Content-Type (el browser arma el boundary solo). */
async function pedirArchivo(s: Sesion, path: string, form: FormData): Promise<any> {
  const headersArchivo = (sesion: Sesion): Record<string, string> => {
    const h: Record<string, string> = {};
    if (sesion.token) h['Authorization'] = `Bearer ${sesion.token}`;
    if (sesion.organizacionId) h['X-Organizacion-Id'] = sesion.organizacionId;
    return h;
  };
  const res = await fetch(`${API}${path}`, { method: 'POST', headers: headersArchivo(s), body: form });
  if (res.status !== 401 || !s.refreshToken) return handle(res);

  const tokens = await refrescarTokens(s.refreshToken);
  if (!tokens) return handle(res);

  _onRefresco?.(tokens);
  const sNueva: Sesion = { ...s, token: tokens.accessToken, refreshToken: tokens.refreshToken };
  const res2 = await fetch(`${API}${path}`, { method: 'POST', headers: headersArchivo(sNueva), body: form });
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
  /**
   * Analítica de uso (a pedido del super-admin, ver AdminPage.tsx →
   * "Analítica"): fire-and-forget, nunca debe romper la UI si falla — de
   * ahí el `.catch` silencioso y que la función no devuelva la promesa.
   */
  registrarEvento(s: Sesion, tipo: 'pantalla' | 'accion', nombre: string): void {
    pedir(s, '/analitica/eventos', { method: 'POST', body: JSON.stringify({ tipo, nombre }) }).catch(() => {});
  },

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
    organizaciones: { organizacionId: string; roles: string[]; huellaActiva: boolean; troperaActiva: boolean }[];
  }> {
    return fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ email, password }),
    }).then(handle);
  },

  /** "Olvidé mi contraseña" — siempre resuelve igual, exista o no el email (no filtra cuentas). */
  olvidePassword(email: string): Promise<{ ok: true }> {
    return fetch(`${API}/auth/forgot-password`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ email }),
    }).then(handle);
  },

  resetearPasswordConToken(token: string, password: string): Promise<{ ok: true }> {
    return fetch(`${API}/auth/reset-password`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ token, password }),
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

  subirFotoAnimal(s: Sesion, id: string, foto: Blob): Promise<Animal> {
    const form = new FormData();
    form.append('foto', foto, 'foto.jpg');
    return pedirArchivo(s, `/animales/${id}/foto`, form);
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

  descartarRecordatorioVacuna(s: Sesion, id: string): Promise<{ ok: boolean }> {
    return pedir(s, `/vacunaciones/${id}/descartar-recordatorio`, { method: 'PATCH' });
  },

  vacunacionesDeAnimal(s: Sesion, animalId: string): Promise<Vacunacion[]> {
    return pedir(s, `/vacunaciones/animal/${animalId}`);
  },

  registrarVacunacion(s: Sesion, data: Record<string, unknown>): Promise<Vacunacion> {
    return pedir(s, '/vacunaciones', { method: 'POST', body: JSON.stringify(data) });
  },

  /** Catálogo de referencia (vacunas/antiparasitarios comunes) filtrado por especie — sólo asiste el alta. */
  catalogoVacunas(s: Sesion, especieId: string): Promise<ItemCatalogoVacunas[]> {
    return pedir(s, `/hce/catalogo-vacunas?especieId=${especieId}`);
  },

  /** Catálogo de referencia (diagnósticos comunes) filtrado por especie — sólo asiste el campo del mismo nombre. */
  catalogoDiagnosticos(s: Sesion, especieId: string): Promise<ItemCatalogoVacunas[]> {
    return pedir(s, `/hce/catalogo-diagnosticos?especieId=${especieId}`);
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

  /** Alta de un miembro de la propia organización (propietario/admin) — respeta el cupo del plan. */
  agregarMiembro(s: Sesion, data: {
    email: string; roles: string[]; nombre?: string; apellido?: string; password?: string;
  }): Promise<{ creado: boolean; roles: string[]; usuario: { id: string; email: string; nombre: string | null; apellido: string | null } }> {
    return pedir(s, '/usuarios', { method: 'POST', body: JSON.stringify(data) });
  },

  /** Cupo por rol del plan de la organización + cuántos hay usados hoy. */
  limitesPlan(s: Sesion): Promise<Record<string, { limite: number | null; usados: number }>> {
    return pedir(s, '/usuarios/limites-plan');
  },

  /** Reemplaza el conjunto completo de roles de un miembro activo (propietario/admin). */
  actualizarRolesMiembro(s: Sesion, usuarioId: string, roles: string[]): Promise<{ ok: boolean; roles: string[] }> {
    return pedir(s, `/usuarios/${usuarioId}/roles`, { method: 'PATCH', body: JSON.stringify({ roles }) });
  },

  resetearPassword(s: Sesion, usuarioId: string, nuevaPassword?: string): Promise<ResetPasswordResultado> {
    return pedir(s, `/usuarios/${usuarioId}/password`, {
      method: 'PATCH',
      body: JSON.stringify(nuevaPassword ? { nuevaPassword } : {}),
    });
  },

  /** Plan actual de la organización, próximo vencimiento y si ya hay un pago confirmado este mes / uno pendiente de revisión. */
  miPlan(s: Sesion): Promise<MiPlan> {
    return pedir(s, '/organizacion/plan');
  },

  /** Historial de pagos de la organización, más recientes primero (incluye pendientes/rechazados). */
  misPagos(s: Sesion): Promise<PagoOrganizacion[]> {
    return pedir(s, '/organizacion/pagos');
  },

  /** Carga un pago con comprobante de transferencia — queda pendiente de revisión del super-admin. */
  registrarPagoTransferencia(s: Sesion, data: {
    monto: number; periodo?: string; observaciones?: string; comprobante: File;
  }): Promise<PagoOrganizacion> {
    const form = new FormData();
    form.append('monto', String(data.monto));
    if (data.periodo) form.append('periodo', data.periodo);
    if (data.observaciones) form.append('observaciones', data.observaciones);
    form.append('comprobante', data.comprobante);
    return pedirArchivo(s, '/organizacion/pagos', form);
  },

  /** Sube/reemplaza el logo de la organización — se muestra en carnet, ficha y el portal del dueño. */
  subirLogoOrganizacion(s: Sesion, logo: File): Promise<{ id: string; logoUrl: string }> {
    const form = new FormData();
    form.append('logo', logo, logo.name);
    return pedirArchivo(s, '/organizacion/logo', form);
  },

  /** Emite el magic-link de acceso al portal para un dueño (vale 30 días). */
  generarAccesoPortal(s: Sesion, personaId: string): Promise<{ token: string; portalUrl: string }> {
    return pedir(s, `/portal/acceso/${personaId}`, { method: 'POST' });
  },

  /** Emite un código corto (15 min, un solo uso) para el acceso al portal por DNI + código — ver /portal en la web pública. */
  generarCodigoPortal(s: Sesion, personaId: string): Promise<{ codigo: string; expiraEnMinutos: number }> {
    return pedir(s, `/portal/codigo/${personaId}`, { method: 'POST' });
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

  /** Buscador contra el catálogo de referencia de SENASA (F4.1) — sólo asiste el alta de un producto. */
  buscarVademecumSenasa(s: Sesion, termino: string): Promise<ProductoSenasa[]> {
    return pedir(s, `/farmacia/vademecum-senasa?buscar=${encodeURIComponent(termino)}`);
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

  /** Responder es opcional — enviarlo también marca el mensaje leído, ver MensajesBanner.tsx. */
  responderMensaje(s: Sesion, id: string, respuestas: Array<{ preguntaId: string; respuesta: string }>): Promise<{ ok: boolean }> {
    return pedir(s, `/mensajes/${id}/responder`, { method: 'POST', body: JSON.stringify({ respuestas }) });
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

  /** Totales del período (últimos 30 días si no se pasan fechas) — análisis rápido para propietario/gerente. */
  estadisticasCaja(s: Sesion, desde?: string, hasta?: string): Promise<EstadisticasCaja> {
    const q = new URLSearchParams();
    if (desde) q.set('desde', desde);
    if (hasta) q.set('hasta', hasta);
    const qs = q.toString();
    return pedir(s, `/caja/cajas/estadisticas${qs ? `?${qs}` : ''}`);
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

  // --- Fase E: animales individuales de campo ---

  animalesCampo(s: Sesion, establecimientoId?: string, soloTransitorios?: boolean): Promise<AnimalCampo[]> {
    const q = new URLSearchParams();
    if (establecimientoId) q.set('establecimientoId', establecimientoId);
    if (soloTransitorios) q.set('transitorios', 'true');
    const qs = q.toString();
    return pedir(s, `/tropera/animales-campo${qs ? `?${qs}` : ''}`);
  },

  crearAnimalCampo(s: Sesion, data: Record<string, unknown>): Promise<AnimalCampo> {
    return pedir(s, '/tropera/animales-campo', { method: 'POST', body: JSON.stringify(data) });
  },

  actualizarAnimalCampo(s: Sesion, id: string, data: Record<string, unknown>): Promise<AnimalCampo> {
    return pedir(s, `/tropera/animales-campo/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  },

  conciliarAnimalCampo(s: Sesion, id: string, caravana: string): Promise<AnimalCampo> {
    return pedir(s, `/tropera/animales-campo/${id}/conciliar`, { method: 'PATCH', body: JSON.stringify({ caravana }) });
  },

  eventosDeAnimalCampo(s: Sesion, id: string): Promise<Evento[]> {
    return pedir(s, `/tropera/animales-campo/${id}/eventos`);
  },

  // --- Fase E.2/E.3: hallazgos, toros virtuales, muestreos, evaluación andrológica ---

  hallazgos(s: Sesion): Promise<Hallazgo[]> {
    return pedir(s, '/tropera/hallazgos');
  },

  crearHallazgo(s: Sesion, nombre: string): Promise<Hallazgo> {
    return pedir(s, '/tropera/hallazgos', { method: 'POST', body: JSON.stringify({ nombre }) });
  },

  torosVirtuales(s: Sesion): Promise<ToroVirtual[]> {
    return pedir(s, '/tropera/toros-virtuales');
  },

  crearToroVirtual(s: Sesion, data: Record<string, unknown>): Promise<ToroVirtual> {
    return pedir(s, '/tropera/toros-virtuales', { method: 'POST', body: JSON.stringify(data) });
  },

  crearMuestra(s: Sesion, data: Record<string, unknown>): Promise<Muestra> {
    return pedir(s, '/tropera/muestras', { method: 'POST', body: JSON.stringify(data) });
  },

  muestras(s: Sesion, establecimientoId: string): Promise<Muestra[]> {
    return pedir(s, `/tropera/muestras?establecimientoId=${establecimientoId}`);
  },

  ultimoTubo(s: Sesion, establecimientoId: string): Promise<{ ultimoTubo: number }> {
    return pedir(s, `/tropera/muestras/ultimo-tubo?establecimientoId=${establecimientoId}`);
  },

  crearEvaluacionAndrologica(s: Sesion, data: Record<string, unknown>): Promise<EvaluacionAndrologica> {
    return pedir(s, '/tropera/evaluaciones-andrologicas', { method: 'POST', body: JSON.stringify(data) });
  },

  evaluacionesAndrologicas(s: Sesion, animalCampoId: string): Promise<EvaluacionAndrologica[]> {
    return pedir(s, `/tropera/evaluaciones-andrologicas?animalCampoId=${animalCampoId}`);
  },

  // --- Fase E.4: potreros ---

  potreros(s: Sesion, establecimientoId: string): Promise<Potrero[]> {
    return pedir(s, `/tropera/potreros?establecimientoId=${establecimientoId}`);
  },

  crearPotrero(s: Sesion, data: Record<string, unknown>): Promise<Potrero> {
    return pedir(s, '/tropera/potreros', { method: 'POST', body: JSON.stringify(data) });
  },

  // --- Fase E.5: plantillas de tareas (modo plantilla, 1-tap) ---

  plantillasTareas(s: Sesion): Promise<PlantillaTareas[]> {
    return pedir(s, '/tropera/plantillas-tareas');
  },

  crearPlantillaTareas(s: Sesion, data: Record<string, unknown>): Promise<PlantillaTareas> {
    return pedir(s, '/tropera/plantillas-tareas', { method: 'POST', body: JSON.stringify(data) });
  },

  aplicarPlantillaTareas(s: Sesion, id: string, animalCampoId: string, establecimientoId: string): Promise<Evento[]> {
    return pedir(s, `/tropera/plantillas-tareas/${id}/aplicar`, {
      method: 'POST',
      body: JSON.stringify({ animalCampoId, establecimientoId }),
    });
  },

  // --- Fase E.6: protocolos IATF + tareas programadas ---

  protocolosIatf(s: Sesion): Promise<ProtocoloIatf[]> {
    return pedir(s, '/tropera/protocolos-iatf');
  },

  crearProtocoloIatf(s: Sesion, data: Record<string, unknown>): Promise<ProtocoloIatf> {
    return pedir(s, '/tropera/protocolos-iatf', { method: 'POST', body: JSON.stringify(data) });
  },

  aplicarProtocoloIatf(s: Sesion, id: string, data: Record<string, unknown>): Promise<Tarea[]> {
    return pedir(s, `/tropera/protocolos-iatf/${id}/aplicar`, { method: 'POST', body: JSON.stringify(data) });
  },

  tareas(s: Sesion, establecimientoId?: string, animalCampoId?: string, estado?: EstadoTarea): Promise<Tarea[]> {
    const q = new URLSearchParams();
    if (establecimientoId) q.set('establecimientoId', establecimientoId);
    if (animalCampoId) q.set('animalCampoId', animalCampoId);
    if (estado) q.set('estado', estado);
    const qs = q.toString();
    return pedir(s, `/tropera/tareas${qs ? `?${qs}` : ''}`);
  },

  actualizarTarea(s: Sesion, id: string, data: { estado: 'completada' | 'cancelada'; observaciones?: string }): Promise<Tarea> {
    return pedir(s, `/tropera/tareas/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
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

export interface MiPlan {
  nombre: string;
  logoUrl: string | null;
  activo: boolean;
  plan: {
    id: string; nombre: string; descripcion: string | null;
    precioMensual: string | null; precioAnual: string | null;
    limitesRoles: Record<string, number>;
  } | null;
  fechaActivacion: string | null;
  proximoVencimiento: string;
  accesoHasta: string | null;
  pagoEsteMes: boolean;
  tienePagoPendiente: boolean;
}

export interface PagoOrganizacion {
  id: string;
  organizacionId: string;
  periodo: string;
  monto: string;
  fechaPago: string;
  medioPago: string | null;
  observaciones: string | null;
  estado: 'pendiente' | 'confirmado' | 'rechazado';
  comprobanteUrl: string | null;
  motivoRechazo: string | null;
  createdAt: string;
}

export interface ResetPasswordResultado {
  ok: boolean;
  email: string;
  temporal: boolean;
  password?: string; // sólo viene cuando `temporal` es true — se muestra una única vez
}

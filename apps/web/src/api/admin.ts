// apps/web/src/api/admin.ts
const BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000';
const TOKEN_KEY = 'ecosistema.admin.token';

export const getToken = () => localStorage.getItem(TOKEN_KEY) ?? '';
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

// AdminPage.tsx se suscribe acá (una vez, al montar) para volver a la
// pantalla de login apenas cualquier llamado del panel devuelva 401 (token
// vencido o inválido) — antes eso se mostraba como el JSON crudo del error
// en la primera card que fallaba, en vez de sacar a la persona de un panel
// al que ya no tiene acceso.
let alExpirar: (() => void) | null = null;
export const suscribirseAExpiracion = (cb: () => void) => { alExpirar = cb; };

/**
 * `api/interesados.ts` y `api/solicitudes.ts` también llaman al panel /admin
 * con este mismo token, pero con su propio fetch duplicado — sin esto,
 * un 401 ahí se mostraba como el JSON crudo del error en vez de sacar a la
 * persona de un panel al que ya no tiene acceso. `req()`, acá abajo, usa lo
 * mismo — un solo lugar con la lógica real.
 */
export const manejar401 = () => { clearToken(); alExpirar?.(); };

async function req(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...(options.headers as Record<string, string> || {}),
    },
  });
  if (res.status === 401) manejar401();
  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(msg || `Error ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

export interface Organizacion {
  id: string; nombre: string; huellaActiva: boolean; troperaActiva: boolean;
  cuit?: string; activo?: boolean; createdAt?: string;
  grupoId?: string | null; planId?: string | null; accesoHasta?: string | null;
  fechaActivacion?: string | null; esDemo?: boolean;
}
export interface ResumenPagoOrg {
  id: string; nombre: string; activo: boolean;
  fechaActivacion: string | null;
  proximoVencimiento: string;
  pagoEsteMes: boolean;
  montoUltimoPago: string | null;
  fechaUltimoPago: string | null;
}
export interface Pago {
  id: string; organizacionId: string; periodo: string; monto: string;
  fechaPago: string; medioPago?: string | null; observaciones?: string | null;
  estado?: 'pendiente' | 'confirmado' | 'rechazado';
}
export interface PagoPendiente {
  id: string; organizacionId: string; organizacionNombre: string;
  periodo: string; monto: string; medioPago: string | null;
  observaciones: string | null; comprobanteUrl: string | null; createdAt: string;
}
export interface GananciasPeriodo {
  porPeriodo: Array<{ periodo: string; total: string }>;
  totalAcumulado: number;
}
export interface ResumenAnalitica {
  pantallas: Array<{ nombre: string; cantidad: number }>;
  acciones: Array<{ nombre: string; cantidad: number }>;
  porOrganizacion: Array<{ organizacionId: string; organizacionNombre: string; cantidad: number }>;
  total: number;
}
export interface Miembro {
  membresiaId: string; roles: string[]; activo: boolean;
  usuarioId: string; email: string; nombre?: string; apellido?: string;
}
export interface Grupo { id: string; nombre: string; descripcion?: string | null; }
export interface Plan {
  id: string; nombre: string;
  precioMensual?: string | null; precioAnual?: string | null;
  /** Cupo máximo de miembros por rol en las organizaciones de este plan. Un rol ausente = sin límite. */
  limitesRoles: Record<string, number>;
  descripcion?: string | null; activo: boolean;
  /** Meses gratis al arrancar (ej. 3 = "3 meses bonificados"). 0 = sin bonificación. */
  mesesBonificados: number;
}
export type DestinatarioTipo = 'todas' | 'organizacion' | 'grupo';
export type TipoPregunta = 'si_no' | 'opcion_multiple' | 'texto_breve';
/** `id` sólo viene presente en una pregunta ya guardada (lo asigna el server, ver MensajesAdminService.crear()). */
export interface Pregunta {
  id?: string;
  tipo: TipoPregunta;
  texto: string;
  opciones?: string[];
}
export interface MensajeAdmin {
  id: string; titulo: string; cuerpo: string; destinatarioTipo: DestinatarioTipo;
  organizacionId?: string | null; grupoId?: string | null; publicadoEn: string;
  preguntas: Pregunta[];
}
export interface RespuestasMensaje {
  mensajeId: string; titulo: string; totalRespondieron: number;
  preguntas: Array<
    | { id: string; tipo: 'si_no' | 'opcion_multiple'; texto: string; opciones?: string[]; conteos: Record<string, number> }
    | { id: string; tipo: 'texto_breve'; texto: string; respuestas: Array<{ respuesta: string; organizacion: string; fecha: string }> }
  >;
}

/**
 * Inicia sesión con las credenciales del super-admin (mismo /auth/login,
 * que no distingue super-admin de un usuario común — cualquier cuenta
 * válida "loguea" acá). Por eso después de loguear se confirma contra
 * GET /admin/whoami (gateado por SuperAdminGuard): si el usuario no es
 * super-admin de la plataforma, se descarta el token en vez de dejarlo
 * entrar al panel y recién enterarse con un 403 en la primera lista.
 */
export async function login(email: string, password: string) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error('Credenciales inválidas');
  const data = await res.json();
  // Chequea /admin/whoami con el token todavía SIN persistir — así el token
  // de una cuenta válida pero no super-admin nunca llega a tocar
  // localStorage, ni por la ventana breve entre guardarlo y confirmarlo.
  const whoami = await fetch(`${BASE}/admin/whoami`, {
    headers: { Authorization: `Bearer ${data.accessToken}` },
  });
  if (!whoami.ok) {
    throw new Error('Tu cuenta no tiene permisos de administración de la plataforma');
  }
  setToken(data.accessToken);
  return data;
}

export const listarOrganizaciones = (): Promise<Organizacion[]> => req('/admin/organizaciones');

export const crearOrganizacion = (
  d: { nombre: string; huellaActiva?: boolean; troperaActiva?: boolean; cuit?: string },
): Promise<Organizacion> => req('/admin/organizaciones', { method: 'POST', body: JSON.stringify(d) });

export const listarMiembros = (orgId: string): Promise<Miembro[]> =>
  req(`/admin/organizaciones/${orgId}/miembros`);

export const agregarMiembro = (
  orgId: string,
  d: { email: string; roles: string[]; nombre?: string; apellido?: string; password?: string },
) => req(`/admin/organizaciones/${orgId}/miembros`, { method: 'POST', body: JSON.stringify(d) });

// ── Ciclo de vida de la organización ──────────────────────────────────────
export const setOrgActivo = (orgId: string, activo: boolean) =>
  req(`/admin/organizaciones/${orgId}/activo`, { method: 'PATCH', body: JSON.stringify({ activo }) });

export const eliminarOrg = (orgId: string) =>
  req(`/admin/organizaciones/${orgId}`, { method: 'DELETE' });

export const quitarMiembro = (orgId: string, membresiaId: string) =>
  req(`/admin/organizaciones/${orgId}/miembros/${membresiaId}`, { method: 'DELETE' });

export const setMiembroActivo = (orgId: string, membresiaId: string, activo: boolean) =>
  req(`/admin/organizaciones/${orgId}/miembros/${membresiaId}/activo`, {
    method: 'PATCH', body: JSON.stringify({ activo }),
  });

export const setMiembroRoles = (orgId: string, membresiaId: string, roles: string[]) =>
  req(`/admin/organizaciones/${orgId}/miembros/${membresiaId}/roles`, {
    method: 'PATCH', body: JSON.stringify({ roles }),
  });

// ── Acceso: grupo, plan, vencimiento/demo ────────────────────────────────
export const setAcceso = (
  orgId: string,
  d: {
    grupoId?: string | null; planId?: string | null; accesoHasta?: string | null;
    fechaActivacion?: string | null; esDemo?: boolean;
  },
) => req(`/admin/organizaciones/${orgId}/acceso`, { method: 'PATCH', body: JSON.stringify(d) });

// ── Pagos / facturación ────────────────────────────────────────────────
export const resumenPagos = (): Promise<ResumenPagoOrg[]> => req('/admin/resumen-pagos');

/** Manda por email un recordatorio de pago a los propietarios/admins activos de la organización. */
export const enviarRecordatorioPago = (orgId: string): Promise<{ ok: true; enviados: number }> =>
  req(`/admin/organizaciones/${orgId}/recordatorio-pago`, { method: 'POST' });

export const gananciasPorPeriodo = (): Promise<GananciasPeriodo> => req('/admin/pagos/ganancias');

export const resumenAnalitica = (desde?: string, hasta?: string): Promise<ResumenAnalitica> => {
  const qs = new URLSearchParams();
  if (desde) qs.set('desde', desde);
  if (hasta) qs.set('hasta', hasta);
  const query = qs.toString();
  return req(`/admin/analitica${query ? `?${query}` : ''}`);
};

export const listarPagosOrg = (orgId: string): Promise<Pago[]> => req(`/admin/organizaciones/${orgId}/pagos`);

export const registrarPago = (
  orgId: string,
  d: { periodo?: string; monto: number; medioPago?: string; observaciones?: string },
): Promise<Pago> => req(`/admin/organizaciones/${orgId}/pagos`, { method: 'POST', body: JSON.stringify(d) });

/** Pagos cargados por las propias organizaciones (comprobante de transferencia) a la espera de revisión. */
export const listarPagosPendientes = (): Promise<PagoPendiente[]> => req('/admin/pagos/pendientes');

/** Aprueba (`aprobar: true`) o rechaza un pago pendiente. */
export const revisarPago = (id: string, aprobar: boolean, motivoRechazo?: string) =>
  req(`/admin/pagos/${id}/revisar`, { method: 'POST', body: JSON.stringify({ aprobar, motivoRechazo }) });

// ── Soluciones habilitadas (Tropera / Huella) ────────────────────────────
export const setSoluciones = (
  orgId: string,
  d: { huellaActiva: boolean; troperaActiva: boolean },
): Promise<Organizacion> =>
  req(`/admin/organizaciones/${orgId}/soluciones`, { method: 'PATCH', body: JSON.stringify(d) });

// ── Grupos de organizaciones ──────────────────────────────────────────────
export const listarGrupos = (): Promise<Grupo[]> => req('/admin/grupos-organizaciones');

export const crearGrupo = (d: { nombre: string; descripcion?: string }): Promise<Grupo> =>
  req('/admin/grupos-organizaciones', { method: 'POST', body: JSON.stringify(d) });

export const actualizarGrupo = (id: string, d: { nombre?: string; descripcion?: string }): Promise<Grupo> =>
  req(`/admin/grupos-organizaciones/${id}`, { method: 'PATCH', body: JSON.stringify(d) });

export const eliminarGrupo = (id: string) => req(`/admin/grupos-organizaciones/${id}`, { method: 'DELETE' });

// ── Planes ─────────────────────────────────────────────────────────────
export const listarPlanes = (): Promise<Plan[]> => req('/admin/planes');

export const crearPlan = (
  d: {
    nombre: string; precioMensual: number; precioAnual: number;
    limitesRoles: Record<string, number>; descripcion?: string; mesesBonificados?: number;
  },
): Promise<Plan> => req('/admin/planes', { method: 'POST', body: JSON.stringify(d) });

export const actualizarPlan = (
  id: string,
  d: {
    nombre?: string; precioMensual?: number | null; precioAnual?: number | null;
    limitesRoles?: Record<string, number>; descripcion?: string; activo?: boolean; mesesBonificados?: number;
  },
): Promise<Plan> => req(`/admin/planes/${id}`, { method: 'PATCH', body: JSON.stringify(d) });

export const eliminarPlan = (id: string) => req(`/admin/planes/${id}`, { method: 'DELETE' });

// ── Mensajes de la plataforma ─────────────────────────────────────────────
export const listarMensajesAdmin = (): Promise<MensajeAdmin[]> => req('/admin/mensajes');

export const crearMensaje = (d: {
  titulo: string; cuerpo: string; destinatarioTipo: DestinatarioTipo;
  organizacionId?: string; grupoId?: string;
  preguntas?: Pregunta[];
}): Promise<MensajeAdmin> => req('/admin/mensajes', { method: 'POST', body: JSON.stringify(d) });

export const eliminarMensaje = (id: string) => req(`/admin/mensajes/${id}`, { method: 'DELETE' });

/** Feedback recibido para un mensaje — conteos por opción y texto libre, ver MensajesAdminService.respuestas(). */
export const respuestasMensaje = (id: string): Promise<RespuestasMensaje> => req(`/admin/mensajes/${id}/respuestas`);

/** Descarga el respaldo JSON de una organización. */
export async function exportarOrg(orgId: string, nombre?: string) {
  const data = await req(`/admin/organizaciones/${orgId}/export`);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ecosistema-${(nombre || 'organizacion').replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

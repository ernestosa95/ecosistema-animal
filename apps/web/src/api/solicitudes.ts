// apps/web/src/api/solicitudes.ts
import { getToken } from './admin';

const BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000';

export interface PlanPublico {
  id: string; nombre: string;
  precioMensual?: string | null; precioAnual?: string | null;
  limitesRoles: Record<string, number>;
  descripcion?: string | null;
  /** Meses gratis al arrancar (ej. 3 = "3 meses bonificados"). 0 = sin bonificación. */
  mesesBonificados: number;
}

export interface Solicitud {
  id: string;
  tipo: 'crear' | 'unirse';
  estado: string;
  nombre: string;
  apellido: string;
  dni?: string;
  email: string;
  telefono?: string;
  planId?: string | null;
  nombreOrganizacion?: string;
  tipoOrganizacion?: string;
  direccionOrganizacion?: string;
  localidadOrganizacion?: string;
  provinciaOrganizacion?: string;
  telefonoOrganizacion?: string;
  emailOrganizacion?: string;
  organizacionSolicitada?: string;
  terminosAceptadosEn?: string;
  terminosVersion?: string;
  createdAt?: string;
}

// ── Público (sin token): planes para elegir + enviar una solicitud de registro ──
export async function listarPlanesPublicos(): Promise<PlanPublico[]> {
  const res = await fetch(`${BASE}/solicitudes/planes`);
  if (!res.ok) throw new Error('No se pudieron cargar los planes');
  return res.json();
}

/** Paso 1 de la verificación de email previa al alta: manda el código de 6 dígitos. Devuelve un token opaco que hay que retener para confirmarlo. */
export async function enviarCodigoVerificacion(email: string): Promise<{ token: string }> {
  const res = await fetch(`${BASE}/solicitudes/verificar-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error((await res.text().catch(() => '')) || 'No se pudo enviar el código');
  return res.json();
}

/** Paso 2: confirma el código contra el token del paso 1 — devuelve el token que hay que adjuntar a `crearSolicitud`. */
export async function confirmarCodigoVerificacion(token: string, codigo: string): Promise<{ emailVerificadoToken: string }> {
  const res = await fetch(`${BASE}/solicitudes/verificar-email/confirmar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, codigo }),
  });
  if (!res.ok) throw new Error((await res.text().catch(() => '')) || 'El código no es correcto');
  return res.json();
}

export async function crearSolicitud(d: {
  nombre: string; apellido: string; email: string; password: string;
  terminosAceptados: boolean;
  telefono: string; dni: string;
  planId: string;
  nombreOrganizacion: string; tipoOrganizacion?: string;
  direccionOrganizacion?: string; localidadOrganizacion: string; provinciaOrganizacion: string;
  telefonoOrganizacion?: string; emailOrganizacion?: string;
  emailVerificadoToken: string;
}): Promise<{ ok: boolean; id: string }> {
  const res = await fetch(`${BASE}/solicitudes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tipo: 'crear', ...d }),
  });
  if (!res.ok) throw new Error((await res.text().catch(() => '')) || 'No se pudo enviar la solicitud');
  return res.json();
}

// ── Admin (usa el token del panel /admin) ────────────────────────────────
async function adminReq(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...(options.headers as Record<string, string> || {}),
    },
  });
  if (!res.ok) throw new Error((await res.text().catch(() => '')) || `Error ${res.status}`);
  return res.status === 204 ? null : res.json();
}

export const listarSolicitudes = (estado = 'pendiente'): Promise<Solicitud[]> =>
  adminReq(`/admin/solicitudes?estado=${estado}`);

export const aprobarSolicitud = (id: string, d: { organizacionId?: string; rol?: string } = {}) =>
  adminReq(`/admin/solicitudes/${id}/aprobar`, { method: 'POST', body: JSON.stringify(d) });

export const rechazarSolicitud = (id: string, motivo?: string) =>
  adminReq(`/admin/solicitudes/${id}/rechazar`, { method: 'POST', body: JSON.stringify({ motivo }) });

export const obtenerConfiguracionSolicitudes = (): Promise<{ aprobacionAutomatica: boolean }> =>
  adminReq('/admin/solicitudes/configuracion');

export const actualizarConfiguracionSolicitudes = (aprobacionAutomatica: boolean): Promise<{ aprobacionAutomatica: boolean }> =>
  adminReq('/admin/solicitudes/configuracion', { method: 'PATCH', body: JSON.stringify({ aprobacionAutomatica }) });

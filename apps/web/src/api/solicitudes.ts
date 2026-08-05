// apps/web/src/api/solicitudes.ts
import { getToken } from './admin';

const BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000';

export interface Solicitud {
  id: string;
  tipo: 'crear' | 'unirse';
  estado: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  nombreOrganizacion?: string;
  tipoOrganizacion?: string;
  organizacionSolicitada?: string;
  createdAt?: string;
}

// ── Público (sin token): enviar una solicitud de registro ────────────────
export async function crearSolicitud(d: {
  tipo: 'crear' | 'unirse';
  nombre: string; apellido: string; email: string; password: string;
  telefono?: string;
  nombreOrganizacion?: string; tipoOrganizacion?: string;
  organizacionSolicitada?: string;
}): Promise<{ ok: boolean; id: string }> {
  const res = await fetch(`${BASE}/solicitudes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(d),
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

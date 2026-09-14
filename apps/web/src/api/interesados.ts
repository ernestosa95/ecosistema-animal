// apps/web/src/api/interesados.ts
// Cliente de la captura de interés para el lanzamiento (landing, botón
// "Estoy interesado") — cupo fijo controlado en el backend (ver
// InteresadosService). Reemplaza temporalmente al alta self-service directa
// mientras dure esta etapa de 10 lugares. Dos partes: las de arriba son
// públicas (sin sesión, las usa la landing); `listarInteresadosAdmin` usa el
// token del panel /admin (mismo patrón que `adminReq` en api/solicitudes.ts)
// para que el super-admin vea la lista y haga el seguimiento manual.
import { getToken, manejar401 } from './admin';
import type { Sesion } from './types';

const API = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000';

export interface CupoInteresados {
  disponible: boolean;
  restantes: number;
}

export async function consultarCupoInteresados(): Promise<CupoInteresados> {
  const res = await fetch(`${API}/interesados/cupo`);
  if (!res.ok) throw new Error('No se pudo consultar el cupo disponible.');
  return res.json();
}

export async function crearInteresado(dto: {
  nombre: string;
  email: string;
  celular?: string;
  nombreVeterinaria: string;
}): Promise<{ ok: true }> {
  const res = await fetch(`${API}/interesados`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    if (res.status === 409) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.message || 'Ya completamos las primeras 10 solicitudes de esta etapa.');
    }
    if (res.status === 429) throw new Error('Demasiados intentos — probá de nuevo en un rato.');
    throw new Error(`No se pudo enviar la solicitud (Error ${res.status}).`);
  }
  return res.json();
}

export interface Interesado {
  id: string;
  nombre: string;
  email: string | null;
  celular: string | null;
  nombreVeterinaria: string;
  createdAt: string;
}

/** Las 5 llamadas admin de acá abajo comparten este helper (mismo criterio que `adminReq` en api/solicitudes.ts) — así el chequeo de 401 vive en un solo lugar. */
async function adminReq(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...(options.headers as Record<string, string> || {}),
    },
  });
  if (res.status === 401) manejar401();
  if (!res.ok) throw new Error((await res.text().catch(() => '')) || `Error ${res.status}`);
  return res.status === 204 ? null : res.json();
}

/** Admin (super-admin, panel /admin) — lista de interesados para el seguimiento manual. */
export const listarInteresadosAdmin = (): Promise<Interesado[]> => adminReq('/admin/interesados');

/** Admin — corrige/completa datos a mano (ej. cargar el email de alguien que se anotó antes de que fuera obligatorio). */
export const editarInteresadoAdmin = (
  id: string,
  dto: Partial<Pick<Interesado, 'nombre' | 'email' | 'celular' | 'nombreVeterinaria'>>,
): Promise<Interesado> =>
  adminReq(`/admin/interesados/${id}`, { method: 'PATCH', body: JSON.stringify(dto) });

/** Admin — saca el registro y libera su lugar en el cupo. */
export const eliminarInteresadoAdmin = (id: string): Promise<void> =>
  adminReq(`/admin/interesados/${id}`, { method: 'DELETE' });

/** Admin — reenvía el mail de confirmación (sólo si ya tiene email cargado). */
export const reenviarConfirmacionInteresado = (id: string): Promise<void> =>
  adminReq(`/admin/interesados/${id}/reenviar`, { method: 'POST' });

/** Admin — dispara el link de "terminá tu alta" a todos los interesados que tengan email cargado. */
export const invitarTodosInteresados = (): Promise<{ enviados: number }> =>
  adminReq('/admin/interesados/invitar-todos', { method: 'POST' });

// ── Activación (link que abre ActivarInteresadoPage.tsx, ?activarToken=) ──

export interface DatosActivacion {
  nombre: string;
  email: string;
  nombreVeterinaria: string;
}

/** Público — precarga la página de activación con lo que el interesado ya había dejado. */
export async function obtenerDatosActivacion(token: string): Promise<DatosActivacion> {
  const res = await fetch(`${API}/interesados/activar/${token}`);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || 'Este link no es válido o venció.');
  }
  return res.json();
}

/** Público — crea la cuenta y devuelve una sesión lista para guardar (ver ActivarInteresadoPage.tsx). */
export async function activarInteresado(dto: {
  token: string;
  apellido: string;
  password: string;
  nombreOrganizacion?: string;
}): Promise<Sesion> {
  const res = await fetch(`${API}/interesados/activar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || `No se pudo activar la cuenta (Error ${res.status}).`);
  }
  const data = await res.json();
  return {
    token: data.accessToken,
    refreshToken: data.refreshToken,
    organizacionId: data.organizacionId,
    roles: data.roles,
    huellaActiva: data.huellaActiva,
    troperaActiva: data.troperaActiva,
  };
}

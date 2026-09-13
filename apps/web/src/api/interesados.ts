// apps/web/src/api/interesados.ts
// Cliente de la captura de interés para el lanzamiento (landing, botón
// "Estoy interesado") — cupo fijo controlado en el backend (ver
// InteresadosService). Reemplaza temporalmente al alta self-service directa
// mientras dure esta etapa de 10 lugares. Dos partes: las de arriba son
// públicas (sin sesión, las usa la landing); `listarInteresadosAdmin` usa el
// token del panel /admin (mismo patrón que `adminReq` en api/solicitudes.ts)
// para que el super-admin vea la lista y haga el seguimiento manual.
import { getToken } from './admin';

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

/** Admin (super-admin, panel /admin) — lista de interesados para el seguimiento manual. */
export async function listarInteresadosAdmin(): Promise<Interesado[]> {
  const res = await fetch(`${API}/admin/interesados`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error((await res.text().catch(() => '')) || `Error ${res.status}`);
  return res.json();
}

/** Admin — corrige/completa datos a mano (ej. cargar el email de alguien que se anotó antes de que fuera obligatorio). */
export async function editarInteresadoAdmin(
  id: string,
  dto: Partial<Pick<Interesado, 'nombre' | 'email' | 'celular' | 'nombreVeterinaria'>>,
): Promise<Interesado> {
  const res = await fetch(`${API}/admin/interesados/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error((await res.text().catch(() => '')) || `Error ${res.status}`);
  return res.json();
}

/** Admin — saca el registro y libera su lugar en el cupo. */
export async function eliminarInteresadoAdmin(id: string): Promise<void> {
  const res = await fetch(`${API}/admin/interesados/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error((await res.text().catch(() => '')) || `Error ${res.status}`);
}

/** Admin — reenvía el mail de confirmación (sólo si ya tiene email cargado). */
export async function reenviarConfirmacionInteresado(id: string): Promise<void> {
  const res = await fetch(`${API}/admin/interesados/${id}/reenviar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || `Error ${res.status}`);
  }
}

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
  contacto: string;
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
  contacto: string;
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

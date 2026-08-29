import type { Sesion } from '../auth/useSesion';

// Puerto de apps/web/src/api/client.ts (mismo patrón: headers, refresh
// silencioso en 401 con reintento único) adaptado a React Native — no hay
// import.meta.env, se usa una var EXPO_PUBLIC_* (inlineada por Expo).
const API = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

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

let _onRefresco: ((tokens: { accessToken: string; refreshToken: string }) => void) | null = null;

/** Llamar una vez desde la raíz de la app: configurarRefrescoSesion(actualizarTokens). */
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
  if (!tokens) return handle(res);

  _onRefresco?.(tokens);
  const sNueva: Sesion = { ...s, token: tokens.accessToken, refreshToken: tokens.refreshToken };
  const res2 = await fetch(`${API}${path}`, { ...options, headers: headers(sNueva) });
  return handle(res2);
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  organizaciones: { organizacionId: string; rol: string }[];
}

export interface Especie {
  id: string;
  codigo: string;
  nombre: string;
}

export const api = {
  API,

  login(email: string, password: string): Promise<LoginResponse> {
    return fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }).then(handle);
  },

  /** Catálogo global (no depende de organización) — se pide on-demand, no vive en WatermelonDB. */
  especies(s: Sesion): Promise<Especie[]> {
    return pedir(s, '/especies');
  },

  /** GET/POST /sync — usado por src/db/sync.ts (synchronize() de WatermelonDB). */
  pull(s: Sesion, lastPulledAt: number | null) {
    const qs = lastPulledAt ? `?lastPulledAt=${lastPulledAt}` : '';
    return pedir(s, `/sync${qs}`);
  },
  push(s: Sesion, changes: unknown, lastPulledAt: number | null) {
    return pedir(s, '/sync', {
      method: 'POST',
      body: JSON.stringify({ changes, lastPulledAt }),
    });
  },
};

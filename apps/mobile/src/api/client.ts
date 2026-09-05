import { File, UploadType } from 'expo-file-system';
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
  // ver la nota equivalente en apps/web/src/api/client.ts: un 200 con
  // cuerpo vacío (null/undefined devuelto por el controller de Nest) rompe
  // res.json() directo.
  if (res.status === 204) return null;
  const texto = await res.text();
  return texto ? JSON.parse(texto) : null;
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

/**
 * Traduce el resultado de `File.upload()` (expo-file-system) al mismo shape
 * de error que `handle()` para el resto de los llamados. No pasa por el
 * `fetch` global: el SDK 57 reemplazó el `fetch` de RN por el suyo propio
 * ("winter"), que no entiende el `{uri, name, type}` clásico de React
 * Native para adjuntar un archivo a un FormData ("Unsupported FormDataPart
 * implementation") — la subida nativa de expo-file-system evita ese problema
 * por completo, además de ser el mecanismo pensado para esto.
 */
function handleUpload(resultado: { status: number; body: string }) {
  if (resultado.status < 200 || resultado.status >= 300) {
    let msg = `Error ${resultado.status}`;
    try {
      const body = JSON.parse(resultado.body);
      if (body?.message) msg = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    } catch {
      /* respuesta sin cuerpo JSON */
    }
    throw new Error(msg);
  }
  return resultado.body ? JSON.parse(resultado.body) : null;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  organizaciones: { organizacionId: string; roles: string[]; huellaActiva: boolean; troperaActiva: boolean }[];
}

export interface Especie {
  id: string;
  codigo: string;
  nombre: string;
}

/** Fila del catálogo de referencia por especie (vacunas/antiparasitarios comunes) — sólo asiste el alta. */
export interface ItemCatalogoVacunas {
  id: string;
  especieId: string;
  categoria: string;
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

  /**
   * "Olvidé mi contraseña" — el reset en sí (elegir la contraseña nueva) pasa
   * por el link que llega al mail, abierto en el navegador del teléfono
   * (misma pantalla web que usa el staff desde PC); acá sólo se dispara el
   * pedido. Siempre resuelve igual, exista o no el email.
   */
  olvidePassword(email: string): Promise<{ ok: true }> {
    return fetch(`${API}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }).then(handle);
  },

  /** Catálogo global (no depende de organización) — se pide on-demand, no vive en WatermelonDB. */
  especies(s: Sesion): Promise<Especie[]> {
    return pedir(s, '/especies');
  },

  /** Catálogo de referencia (vacunas/antiparasitarios comunes) filtrado por especie — sólo asiste el alta. */
  catalogoVacunas(s: Sesion, especieId: string): Promise<ItemCatalogoVacunas[]> {
    return pedir(s, `/hce/catalogo-vacunas?especieId=${especieId}`);
  },

  /** Catálogo de referencia (diagnósticos comunes) filtrado por especie — sólo asiste el campo del mismo nombre. */
  catalogoDiagnosticos(s: Sesion, especieId: string): Promise<ItemCatalogoVacunas[]> {
    return pedir(s, `/hce/catalogo-diagnosticos?especieId=${especieId}`);
  },

  /**
   * Fire-and-forget, igual que en la web (`api/client.ts`) — nunca debe
   * bloquear ni romper la acción que instrumenta. Requiere conexión en el
   * momento (no pasa por WatermelonDB/sync); si no hay red simplemente se
   * pierde ese evento, aceptable para analítica de uso.
   */
  registrarEvento(s: Sesion, tipo: 'pantalla' | 'accion', nombre: string) {
    pedir(s, '/analitica/eventos', {
      method: 'POST',
      body: JSON.stringify({ tipo, nombre }),
    }).catch(() => {});
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

  /**
   * Sube/reemplaza la foto de perfil del paciente — mismo endpoint que usa
   * la web desde la ficha (`POST /animales/:id/foto`, staff). A diferencia
   * del resto de las altas, esto NO pasa por WatermelonDB/sync (es un
   * archivo binario, el motor de sync es JSON) — llamada directa a la API,
   * necesita conexión en el momento.
   */
  async subirFotoAnimal(s: Sesion, animalId: string, uriLocal: string): Promise<{ id: string; fotoUrl: string }> {
    const archivo = new File(uriLocal);
    const resultado = await archivo.upload(`${API}/animales/${animalId}/foto`, {
      httpMethod: 'POST',
      uploadType: UploadType.MULTIPART,
      fieldName: 'foto',
      mimeType: 'image/jpeg',
      headers: {
        Authorization: `Bearer ${s.token}`,
        'X-Organizacion-Id': s.organizacionId,
      },
    });
    return handleUpload(resultado);
  },
};

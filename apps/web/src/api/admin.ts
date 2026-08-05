// apps/web/src/api/admin.ts
const BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000';
const TOKEN_KEY = 'ecosistema.admin.token';

export const getToken = () => localStorage.getItem(TOKEN_KEY) ?? '';
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function req(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...(options.headers as Record<string, string> || {}),
    },
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(msg || `Error ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

export interface Organizacion { id: string; nombre: string; tipo: string; cuit?: string; activo?: boolean; createdAt?: string; }
export interface Miembro {
  membresiaId: string; rol: string; activo: boolean;
  usuarioId: string; email: string; nombre?: string; apellido?: string;
}

/** Inicia sesión con las credenciales del super-admin (mismo /auth/login). */
export async function login(email: string, password: string) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error('Credenciales inválidas');
  const data = await res.json();
  setToken(data.accessToken);
  return data;
}

export const listarOrganizaciones = (): Promise<Organizacion[]> => req('/admin/organizaciones');

export const crearOrganizacion = (d: { nombre: string; tipo?: string; cuit?: string }): Promise<Organizacion> =>
  req('/admin/organizaciones', { method: 'POST', body: JSON.stringify(d) });

export const listarMiembros = (orgId: string): Promise<Miembro[]> =>
  req(`/admin/organizaciones/${orgId}/miembros`);

export const agregarMiembro = (
  orgId: string,
  d: { email: string; rol: string; nombre?: string; apellido?: string; password?: string },
) => req(`/admin/organizaciones/${orgId}/miembros`, { method: 'POST', body: JSON.stringify(d) });

// ── Ciclo de vida de la veterinaria ──────────────────────────────────────
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

/** Descarga el respaldo JSON de una veterinaria. */
export async function exportarOrg(orgId: string, nombre?: string) {
  const data = await req(`/admin/organizaciones/${orgId}/export`);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `huella-${(nombre || 'veterinaria').replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

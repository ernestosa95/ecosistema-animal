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

export interface Organizacion {
  id: string; nombre: string; huellaActiva: boolean; troperaActiva: boolean;
  cuit?: string; activo?: boolean; createdAt?: string;
  grupoId?: string | null; planId?: string | null; accesoHasta?: string | null; esDemo?: boolean;
}
export interface Miembro {
  membresiaId: string; roles: string[]; activo: boolean;
  usuarioId: string; email: string; nombre?: string; apellido?: string;
}
export interface Grupo { id: string; nombre: string; descripcion?: string | null; }
export interface Plan { id: string; nombre: string; precio?: string | null; descripcion?: string | null; activo: boolean; }
export type DestinatarioTipo = 'todas' | 'organizacion' | 'grupo';
export interface MensajeAdmin {
  id: string; titulo: string; cuerpo: string; destinatarioTipo: DestinatarioTipo;
  organizacionId?: string | null; grupoId?: string | null; publicadoEn: string;
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
  d: { grupoId?: string | null; planId?: string | null; accesoHasta?: string | null; esDemo?: boolean },
) => req(`/admin/organizaciones/${orgId}/acceso`, { method: 'PATCH', body: JSON.stringify(d) });

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

export const crearPlan = (d: { nombre: string; precio?: number; descripcion?: string }): Promise<Plan> =>
  req('/admin/planes', { method: 'POST', body: JSON.stringify(d) });

export const actualizarPlan = (
  id: string,
  d: { nombre?: string; precio?: number | null; descripcion?: string; activo?: boolean },
): Promise<Plan> => req(`/admin/planes/${id}`, { method: 'PATCH', body: JSON.stringify(d) });

export const eliminarPlan = (id: string) => req(`/admin/planes/${id}`, { method: 'DELETE' });

// ── Mensajes de la plataforma ─────────────────────────────────────────────
export const listarMensajesAdmin = (): Promise<MensajeAdmin[]> => req('/admin/mensajes');

export const crearMensaje = (d: {
  titulo: string; cuerpo: string; destinatarioTipo: DestinatarioTipo;
  organizacionId?: string; grupoId?: string;
}): Promise<MensajeAdmin> => req('/admin/mensajes', { method: 'POST', body: JSON.stringify(d) });

export const eliminarMensaje = (id: string) => req(`/admin/mensajes/${id}`, { method: 'DELETE' });

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

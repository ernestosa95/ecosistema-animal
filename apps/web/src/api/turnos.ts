// apps/web/src/api/turnos.ts
// Cliente de Turnos — CONECTADO AL BACKEND REAL.
// La sesión NO se lee de una clave hardcodeada: se registra desde App.tsx con
// configurarSesionTurnos(sesion). Así funciona sea cual sea la marca/clave
// ('huella.sesion', 'ecosistema.sesion', etc.). Hay un fallback por las dudas.

import type { Sesion } from './types';

const BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000';

// ─────────────────────────────────────────────────────────────────────────
// Sesión: fuente de verdad = la que registra App.tsx desde useSesion.
// ─────────────────────────────────────────────────────────────────────────
let _sesion: Sesion | null = null;

/** Llamar desde App.tsx: useEffect(() => configurarSesionTurnos(sesion), [sesion]). */
export function configurarSesionTurnos(s: Sesion | null) {
  _sesion = s;
}

// Refresh silencioso, igual criterio que api/client.ts (duplicado a propósito:
// este cliente mantiene su propia sesión independiente, ver comentario de arriba).
let _onRefresco: ((tokens: { accessToken: string; refreshToken: string }) => void) | null = null;

/** Llamar desde App.tsx: useEffect(() => configurarRefrescoSesionTurnos(actualizarTokens), []). */
export function configurarRefrescoSesionTurnos(cb: typeof _onRefresco) {
  _onRefresco = cb;
}

// Mismo criterio que `configurarExpiracionSesion` en api/client.ts — este
// cliente mantiene su propia sesión independiente, así que necesita su
// propio aviso cuando el refresh token también venció.
let _alExpirar: (() => void) | null = null;

/** Llamar desde App.tsx: useEffect(() => configurarExpiracionSesionTurnos(cerrar), []). */
export function configurarExpiracionSesionTurnos(cb: typeof _alExpirar) {
  _alExpirar = cb;
}

function auth(): { token?: string; refreshToken?: string; organizacionId?: string } {
  if (_sesion?.token) {
    return { token: _sesion.token, refreshToken: _sesion.refreshToken, organizacionId: _sesion.organizacionId };
  }
  // Fallback defensivo: buscar la sesión en localStorage bajo claves conocidas.
  for (const k of ['huella.sesion', 'ecosistema.sesion']) {
    try {
      const raw = localStorage.getItem(k);
      if (raw) {
        const s = JSON.parse(raw);
        if (s?.token) return { token: s.token, refreshToken: s.refreshToken, organizacionId: s.organizacionId };
      }
    } catch {
      /* noop */
    }
  }
  return {};
}

function headers(): Record<string, string> {
  const { token, organizacionId } = auth();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(organizacionId ? { 'X-Organizacion-Id': organizacionId } : {}),
  };
}

async function fetchCrudo(path: string, options: RequestInit): Promise<Response> {
  return fetch(`${BASE}${path}`, {
    ...options,
    headers: { ...headers(), ...((options.headers as Record<string, string>) || {}) },
  });
}

async function manejarRespuesta(res: Response): Promise<any> {
  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try {
      const body = await res.json();
      if (body?.message) msg = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    } catch {
      /* sin cuerpo JSON */
    }
    throw new Error(msg);
  }
  // ver la nota en api/client.ts: un 200 con cuerpo vacío (null/undefined
  // devuelto por el controller) rompe res.json() directo.
  if (res.status === 204) return null;
  const texto = await res.text();
  return texto ? JSON.parse(texto) : null;
}

async function request(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetchCrudo(path, options);
  const { refreshToken } = auth();
  if (res.status !== 401 || !refreshToken) return manejarRespuesta(res);

  let tokens: { accessToken: string; refreshToken: string } | null = null;
  try {
    const r = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    tokens = r.ok ? await r.json() : null;
  } catch {
    tokens = null;
  }
  if (!tokens) { _alExpirar?.(); return manejarRespuesta(res); } // refresh también vencido

  if (_sesion) _sesion = { ..._sesion, token: tokens.accessToken, refreshToken: tokens.refreshToken };
  _onRefresco?.(tokens);

  const res2 = await fetchCrudo(path, options);
  return manejarRespuesta(res2);
}

/**
 * Analítica de uso (mismo endpoint que `api.registrarEvento` de client.ts,
 * duplicado acá porque este archivo mantiene su propia sesión — ver
 * comentario de arriba) — fire-and-forget, nunca debe romper la UI.
 */
export function registrarEvento(tipo: 'pantalla' | 'accion', nombre: string): void {
  if (!_sesion) return;
  request('/analitica/eventos', { method: 'POST', body: JSON.stringify({ tipo, nombre }) }).catch(() => {});
}

// ─────────────────────────────────────────────────────────────────────────
// Tipos que usa la UI
// ─────────────────────────────────────────────────────────────────────────
export type EstadoTurno =
  | 'solicitado' | 'confirmado' | 'reprogramado' | 'atendido' | 'cancelado';

export interface Turno {
  id: string;
  fecha: string;
  hora: string;
  estado: EstadoTurno;
  canal: string;
  motivo: string;
  pacienteId: string;
  paciente: string;
  especie: string;
  dueno: string;
  agendaId?: string;
  agendaNombre?: string;
  agendaUsuarioId?: string;
}

export interface AnimalOpcion {
  id: string;
  nombre: string;
  especie: string;
  dueno: string;
}

export interface EspecieOpcion {
  id: string;
  nombre: string;
}

export interface DuenoOpcion {
  id: string;
  nombre: string;
}

export interface MiembroOpcion {
  id: string;
  nombre: string;
  rol: string; // roles.join(' + ')
}

export interface Agenda {
  id: string;
  nombre: string;
  usuarioId?: string | null;
  usuarioNombre?: string | null;
  duracionTurnoMinutos: number;
  color?: string | null;
  activa: boolean;
}

export interface AgendaBloque {
  id: string;
  diaSemana: number; // 0=domingo .. 6=sábado
  horaInicio: string; // 'HH:MM'
  horaFin: string;
}

export interface AgendaExcepcion {
  id: string;
  fecha: string; // YYYY-MM-DD
  tipo: 'cierre' | 'apertura_extra';
  horaInicio?: string | null;
  horaFin?: string | null;
  motivo?: string | null;
}

export interface Slot {
  hora: string; // 'HH:MM'
  disponible: boolean;
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers de fecha/hora
// ─────────────────────────────────────────────────────────────────────────
function fechaHoraLocalISO(fecha: string, hora: string): string {
  return `${fecha}T${(hora || '00:00').slice(0, 5)}:00`;
}

function partirFechaHora(iso: string): { fecha: string; hora: string } {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    fecha: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    hora: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Catálogos (para resolver nombres y para el alta inline)
// ─────────────────────────────────────────────────────────────────────────
async function catalogos() {
  const [animales, especies, personas] = await Promise.all([
    request('/animales'),
    request('/especies'),
    request('/personas'),
  ]);
  const espById = new Map<string, string>(especies.map((e: any) => [e.id, e.nombre]));
  const perById = new Map<string, string>(
    personas.map((p: any) => [p.id, `${p.nombre ?? ''} ${p.apellido ?? ''}`.trim()]),
  );
  const aniById = new Map<string, any>(animales.map((a: any) => [a.id, a]));
  return { espById, perById, aniById, animales, especies, personas };
}

function mapTurno(r: any, cat: Awaited<ReturnType<typeof catalogos>>): Turno {
  const { fecha, hora } = partirFechaHora(r.fechaHora ?? r.fecha_hora);
  const animal = cat.aniById.get(r.animalId ?? r.animal_id);
  return {
    id: String(r.id),
    fecha,
    hora,
    estado: r.estado,
    canal: r.canal ?? 'mostrador',
    motivo: r.motivo ?? '',
    pacienteId: String(r.animalId ?? r.animal_id ?? ''),
    paciente: animal?.nombre ?? '—',
    especie: animal ? cat.espById.get(animal.especieId) ?? '' : '',
    dueno:
      (r.personaId ?? r.persona_id)
        ? cat.perById.get(r.personaId ?? r.persona_id) ?? '—'
        : animal?.personaId
        ? cat.perById.get(animal.personaId) ?? '—'
        : '—',
    agendaId: r.agendaId ?? r.agenda_id ?? undefined,
    agendaNombre: r.agendaNombre ?? r.agenda_nombre ?? undefined,
    agendaUsuarioId: r.agendaUsuarioId ?? r.agenda_usuario_id ?? undefined,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Endpoints de turnos
// ─────────────────────────────────────────────────────────────────────────
/** Sin `hasta`, trae sólo el día de `fecha`. Con `hasta`, trae el rango [fecha, hasta] completo. */
export async function listarTurnos(fecha: string, hasta?: string): Promise<Turno[]> {
  const cat = await catalogos();
  const desdeISO = `${fecha}T00:00:00`;
  const hastaISO = `${hasta ?? fecha}T23:59:59`;
  const rows: any[] = await request(
    `/turnos?desde=${encodeURIComponent(desdeISO)}&hasta=${encodeURIComponent(hastaISO)}`,
  );
  return rows
    .map((r) => mapTurno(r, cat))
    .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
}

/** Cuenta turnos por día en un rango (para marcar el calendario). 1 sola request, sin enriquecer. */
export async function contarTurnosPorDia(desde: string, hasta: string): Promise<Record<string, number>> {
  const rows: any[] = await request(
    `/turnos?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`,
  );
  const acc: Record<string, number> = {};
  for (const r of rows) {
    const { fecha } = partirFechaHora(r.fechaHora ?? r.fecha_hora);
    acc[fecha] = (acc[fecha] ?? 0) + 1;
  }
  return acc;
}

export async function crearTurno(data: {
  animalId: string;
  motivo: string;
  fecha: string;
  hora: string;
  canal?: string;
  agendaId?: string;
  estado?: 'solicitado' | 'confirmado';
}): Promise<Turno> {
  const r = await request('/turnos', {
    method: 'POST',
    body: JSON.stringify({
      animalId: data.animalId,
      fechaHora: fechaHoraLocalISO(data.fecha, data.hora),
      motivo: data.motivo,
      canal: data.canal ?? 'mostrador',
      estado: data.estado ?? 'confirmado',
      ...(data.agendaId ? { agendaId: data.agendaId } : {}),
    }),
  });
  const cat = await catalogos();
  return mapTurno(r, cat);
}

async function cambiarEstado(
  id: string,
  estado: EstadoTurno,
  extra: { fechaHora?: string; agendaId?: string } = {},
): Promise<Turno> {
  const r = await request(`/turnos/${id}/estado`, {
    method: 'PATCH',
    body: JSON.stringify({ estado, ...extra }),
  });
  const cat = await catalogos();
  return mapTurno(r, cat);
}

export const confirmarTurno = (id: string) => cambiarEstado(id, 'confirmado');
export const atenderTurno = (id: string) => cambiarEstado(id, 'atendido');
export const cancelarTurno = (id: string, _motivo?: string) => cambiarEstado(id, 'cancelado');
export const reprogramarTurno = (id: string, data: { fecha: string; hora: string }) =>
  cambiarEstado(id, 'reprogramado', { fechaHora: fechaHoraLocalISO(data.fecha, data.hora) });

// ─────────────────────────────────────────────────────────────────────────
// Búsqueda de animales (filtrada en cliente)
// ─────────────────────────────────────────────────────────────────────────
export async function buscarAnimales(q: string): Promise<AnimalOpcion[]> {
  const cat = await catalogos();
  const term = q.trim().toLowerCase();
  return cat.animales
    .filter((a: any) => (a.nombre ?? '').toLowerCase().includes(term))
    .slice(0, 8)
    .map((a: any) => ({
      id: String(a.id),
      nombre: a.nombre,
      especie: cat.espById.get(a.especieId) ?? '',
      dueno: a.personaId ? cat.perById.get(a.personaId) ?? '' : '',
    }));
}

// ─────────────────────────────────────────────────────────────────────────
// Catálogos para el alta inline
// ─────────────────────────────────────────────────────────────────────────
export async function listarEspecies(): Promise<EspecieOpcion[]> {
  const rows: any[] = await request('/especies');
  return rows.map((e) => ({ id: String(e.id), nombre: e.nombre }));
}

export async function listarDuenos(): Promise<DuenoOpcion[]> {
  const rows: any[] = await request('/personas');
  return rows
    .map((p) => ({ id: String(p.id), nombre: `${p.nombre ?? ''} ${p.apellido ?? ''}`.trim() }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

/** Miembros de la organización, para elegir a quién asignarle una agenda. */
export async function listarMiembros(): Promise<MiembroOpcion[]> {
  const rows: any[] = await request('/usuarios');
  return (rows || [])
    .map((u) => {
      const id = String(u.usuarioId ?? u.id ?? u.usuario_id ?? '');
      const nombre = `${u.nombre ?? ''} ${u.apellido ?? ''}`.trim();
      const roles: string[] = u.roles ?? u.roles_membresia ?? [];
      return { id, nombre: nombre || roles.join(' + ') || 'Miembro', rol: roles.join(' + ') };
    })
    .filter((m) => m.id);
}

// ─────────────────────────────────────────────────────────────────────────
// Agendas (por profesional, o sin profesional — ej. peluquería) y sus
// bloques de horario recurrentes / excepciones puntuales.
// ─────────────────────────────────────────────────────────────────────────
export async function listarAgendas(): Promise<Agenda[]> {
  const rows: any[] = await request('/agendas');
  return (rows || []).map((a) => ({
    id: String(a.id),
    nombre: a.nombre,
    usuarioId: a.usuarioId ?? a.usuario_id ?? null,
    usuarioNombre: a.usuarioNombre ?? a.usuario_nombre ?? null,
    duracionTurnoMinutos: a.duracionTurnoMinutos ?? a.duracion_turno_minutos ?? 30,
    color: a.color ?? null,
    activa: a.activa !== false,
  }));
}

export const crearAgenda = (
  d: { nombre: string; usuarioId?: string | null; duracionTurnoMinutos?: number; color?: string },
) => request('/agendas', { method: 'POST', body: JSON.stringify(d) });

export const actualizarAgenda = (
  id: string,
  d: { nombre?: string; usuarioId?: string | null; duracionTurnoMinutos?: number; color?: string; activa?: boolean },
) => request(`/agendas/${id}`, { method: 'PATCH', body: JSON.stringify(d) });

export const eliminarAgenda = (id: string) => request(`/agendas/${id}`, { method: 'DELETE' });

export async function listarBloques(agendaId: string): Promise<AgendaBloque[]> {
  const rows: any[] = await request(`/agendas/${agendaId}/bloques`);
  return (rows || []).map((b) => ({
    id: String(b.id),
    diaSemana: b.diaSemana ?? b.dia_semana,
    horaInicio: (b.horaInicio ?? b.hora_inicio ?? '').slice(0, 5),
    horaFin: (b.horaFin ?? b.hora_fin ?? '').slice(0, 5),
  }));
}

export const crearBloque = (agendaId: string, d: { diaSemana: number; horaInicio: string; horaFin: string }) =>
  request(`/agendas/${agendaId}/bloques`, { method: 'POST', body: JSON.stringify(d) });

export const eliminarBloque = (agendaId: string, bloqueId: string) =>
  request(`/agendas/${agendaId}/bloques/${bloqueId}`, { method: 'DELETE' });

export async function listarExcepciones(agendaId: string): Promise<AgendaExcepcion[]> {
  const rows: any[] = await request(`/agendas/${agendaId}/excepciones`);
  return (rows || []).map((e) => ({
    id: String(e.id),
    fecha: e.fecha,
    tipo: e.tipo,
    horaInicio: e.horaInicio ? String(e.horaInicio).slice(0, 5) : e.hora_inicio ? String(e.hora_inicio).slice(0, 5) : null,
    horaFin: e.horaFin ? String(e.horaFin).slice(0, 5) : e.hora_fin ? String(e.hora_fin).slice(0, 5) : null,
    motivo: e.motivo ?? null,
  }));
}

export const crearExcepcion = (
  agendaId: string,
  d: { fecha: string; tipo: 'cierre' | 'apertura_extra'; horaInicio?: string; horaFin?: string; motivo?: string },
) => request(`/agendas/${agendaId}/excepciones`, { method: 'POST', body: JSON.stringify(d) });

export const eliminarExcepcion = (agendaId: string, excepcionId: string) =>
  request(`/agendas/${agendaId}/excepciones/${excepcionId}`, { method: 'DELETE' });

export async function slotsDisponibles(agendaId: string, fecha: string, excluirTurnoId?: string): Promise<Slot[]> {
  const qs = new URLSearchParams({ fecha, ...(excluirTurnoId ? { excluirTurnoId } : {}) });
  const rows: any[] = await request(`/agendas/${agendaId}/slots?${qs.toString()}`);
  return (rows || []).map((s) => ({ hora: s.hora, disponible: !!s.disponible }));
}

// ─────────────────────────────────────────────────────────────────────────
// Alta rápida de paciente (dueño existente O dueño nuevo) desde el modal
// ─────────────────────────────────────────────────────────────────────────
export interface PacienteCreado {
  id: string;
  nombre: string;
  personaId?: string;
  duenoNombre?: string; // solo si se creó un dueño nuevo en el mismo paso
}

/**
 * Crea (opcionalmente) el dueño y luego el animal. Devuelve SOLO lo que sale de
 * los POST — sin GETs de más. Los nombres de especie/dueño para mostrar los
 * resuelve el modal con los catálogos que ya tiene en memoria. Así, si algo del
 * "adorno" fallara, no se pierde la selección del paciente recién creado.
 */
export async function crearPacienteRapido(input: {
  nombre: string;
  especieId: string;
  personaId?: string; // dueño existente
  duenoNuevo?: { nombre: string; apellido: string; celular?: string; dni?: string };
}): Promise<PacienteCreado> {
  let personaId = input.personaId;
  let duenoNombre: string | undefined;

  if (!personaId && input.duenoNuevo && input.duenoNuevo.nombre) {
    const persona = await request('/personas', {
      method: 'POST',
      body: JSON.stringify({
        nombre: input.duenoNuevo.nombre,
        apellido: input.duenoNuevo.apellido,
        ...(input.duenoNuevo.celular ? { celular: input.duenoNuevo.celular } : {}),
        ...(input.duenoNuevo.dni ? { dni: input.duenoNuevo.dni } : {}),
      }),
    });
    personaId = String(persona.id);
    duenoNombre = `${persona.nombre ?? ''} ${persona.apellido ?? ''}`.trim();
  }

  const animal = await request('/animales', {
    method: 'POST',
    body: JSON.stringify({
      nombre: input.nombre,
      especieId: input.especieId,
      ...(personaId ? { personaId } : {}),
    }),
  });

  return {
    id: String(animal.id),
    nombre: animal.nombre ?? input.nombre,
    personaId,
    duenoNombre,
  };
}
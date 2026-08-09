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

function auth(): { token?: string; organizacionId?: string } {
  if (_sesion?.token) {
    return { token: _sesion.token, organizacionId: _sesion.organizacionId };
  }
  // Fallback defensivo: buscar la sesión en localStorage bajo claves conocidas.
  for (const k of ['huella.sesion', 'ecosistema.sesion']) {
    try {
      const raw = localStorage.getItem(k);
      if (raw) {
        const s = JSON.parse(raw);
        if (s?.token) return { token: s.token, organizacionId: s.organizacionId };
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

async function request(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { ...headers(), ...((options.headers as Record<string, string>) || {}) },
  });
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
  return res.status === 204 ? null : res.json();
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
  veterinarioId?: string;
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

export interface Profesional {
  id: string;
  nombre: string;
  rol: string;
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
    veterinarioId: r.veterinarioId ?? r.veterinario_id ?? undefined,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Endpoints de turnos
// ─────────────────────────────────────────────────────────────────────────
export async function listarTurnos(fecha: string): Promise<Turno[]> {
  const cat = await catalogos();
  const desde = `${fecha}T00:00:00`;
  const hasta = `${fecha}T23:59:59`;
  const rows: any[] = await request(
    `/turnos?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`,
  );
  return rows.map((r) => mapTurno(r, cat)).sort((a, b) => a.hora.localeCompare(b.hora));
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
  veterinarioId?: string;
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
      ...(data.veterinarioId ? { veterinarioId: data.veterinarioId } : {}),
    }),
  });
  const cat = await catalogos();
  return mapTurno(r, cat);
}

async function cambiarEstado(
  id: string,
  estado: EstadoTurno,
  extra: { fechaHora?: string; veterinarioId?: string } = {},
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

export async function listarProfesionales(): Promise<Profesional[]> {
  // No se cazan errores acá a propósito: si /usuarios falla (p. ej. módulo sin
  // registrar), el modal muestra el motivo en vez de un dropdown vacío y mudo.
  const rows: any[] = await request('/usuarios');
  const norm: Profesional[] = (rows || [])
    .map((u) => {
      const id = String(u.usuarioId ?? u.id ?? u.usuario_id ?? '');
      const nombre = `${u.nombre ?? ''} ${u.apellido ?? ''}`.trim();
      const rol = u.rol ?? u.rolMembresia ?? u.rol_membresia ?? '';
      return { id, nombre: nombre || rol || 'Profesional', rol };
    })
    .filter((p) => p.id);

  // Preferimos quienes atienden (veterinario / propietario). Pero si el filtro
  // deja la lista vacía y sí hay miembros, devolvemos todos: mejor poder elegir.
  const ATIENDEN = new Set(['veterinario', 'propietario']);
  const soloAtienden = norm.filter((p) => ATIENDEN.has(p.rol));
  return soloAtienden.length ? soloAtienden : norm;
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
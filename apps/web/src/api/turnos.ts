// apps/web/src/api/turnos.ts
// Cliente de la API de Turnos, conectado a los endpoints reales del backend.

const BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000';

// Ya conectado a datos reales. (Dejá en true solo si querés volver a datos de ejemplo.)
export const USAR_MOCK = false;

const SESION_KEY = 'ecosistema.sesion';

function auth(): { token?: string; organizacionId?: string } {
  try {
    const raw = localStorage.getItem(SESION_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
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
    headers: { ...headers(), ...(options.headers as Record<string, string> || {}) },
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(msg || `Error ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

// ─── Tipos de la UI ──────────────────────────────────────────────────────
export type EstadoTurno =
  | 'solicitado' | 'confirmado' | 'reprogramado' | 'atendido' | 'cancelado' | 'ausente';

export interface Turno {
  id: string;
  fecha: string;   // 'YYYY-MM-DD'
  hora: string;    // 'HH:MM'
  estado: EstadoTurno;
  canal: string;
  motivo: string;
  pacienteId: string;
  paciente: string;
  especie: string;
  dueno: string;
}

export interface AnimalOpcion { id: string; nombre: string; especie: string; dueno: string; }

// ─── Helpers de fecha ────────────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, '0');

/** Separa un ISO/timestamp en { fecha:'YYYY-MM-DD', hora:'HH:MM' } en hora local. */
function partes(fechaHora?: string): { fecha: string; hora: string } {
  if (!fechaHora) return { fecha: '', hora: '' };
  const d = new Date(fechaHora);
  if (isNaN(d.getTime())) return { fecha: String(fechaHora).slice(0, 10), hora: '' };
  return {
    fecha: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    hora: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

/** Une fecha + hora locales en un string que el backend interpreta como fecha/hora. */
const unir = (fecha: string, hora: string) => `${fecha}T${hora}:00`;

// ─── Adaptador: fila del backend → Turno de la UI ────────────────────────
function mapTurno(r: any): Turno {
  const { fecha, hora } = partes(r.fechaHora);
  const dueno = [r.duenoNombre, r.duenoApellido].filter(Boolean).join(' ');
  return {
    id: String(r.id),
    fecha,
    hora,
    estado: r.estado,
    canal: r.canal ?? 'mostrador',
    motivo: r.motivo ?? '',
    pacienteId: String(r.animalId ?? ''),
    paciente: r.pacienteNombre ?? '—',
    especie: r.especie ?? '',
    dueno: dueno || '—',
  };
}

// ─── Endpoints ───────────────────────────────────────────────────────────
export async function listarTurnos(fecha: string): Promise<Turno[]> {
  const desde = `${fecha}T00:00:00`;
  const hasta = `${fecha}T23:59:59.999`;
  const rows: any[] = await request(`/turnos?desde=${desde}&hasta=${hasta}`);
  return rows.map(mapTurno);
}

export async function crearTurno(data: {
  animalId: string; motivo: string; fecha: string; hora: string; canal?: string;
}): Promise<Turno> {
  const r = await request('/turnos', {
    method: 'POST',
    body: JSON.stringify({
      animalId: data.animalId,
      fechaHora: unir(data.fecha, data.hora),
      motivo: data.motivo,
      canal: data.canal ?? 'mostrador',
    }),
  });
  return mapTurno(r);
}

function cambiarEstado(id: string, estado: EstadoTurno, fechaHora?: string) {
  return request(`/turnos/${id}/estado`, {
    method: 'PATCH',
    body: JSON.stringify(fechaHora ? { estado, fechaHora } : { estado }),
  }).then(mapTurno);
}

export const confirmarTurno = (id: string) => cambiarEstado(id, 'confirmado');
export const atenderTurno = (id: string) => cambiarEstado(id, 'atendido');
export const cancelarTurno = (id: string, _motivo?: string) => cambiarEstado(id, 'cancelado');
export const reprogramarTurno = (id: string, data: { fecha: string; hora: string }) =>
  cambiarEstado(id, 'reprogramado', unir(data.fecha, data.hora));

// El backend no tiene búsqueda de animales: traemos la lista y filtramos acá.
export async function buscarAnimales(q: string): Promise<AnimalOpcion[]> {
  const rows: any[] = await request('/animales');
  const term = q.trim().toLowerCase();
  return rows
    .filter((a) => (a.nombre ?? '').toLowerCase().includes(term))
    .slice(0, 8)
    .map((a) => ({
      id: String(a.id),
      nombre: a.nombre,
      especie: a.especie?.nombre ?? '',
      dueno: '',
    }));
}

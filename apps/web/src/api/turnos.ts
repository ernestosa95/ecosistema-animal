// apps/web/src/api/turnos.ts
// Cliente de la API de Turnos para Huella.
// Diseñado para que, si tu backend difiere, sólo toques 3 puntos marcados con ★.

// ─────────────────────────────────────────────────────────────────────────
// ★1. CONFIG — base, auth y modo mock
// ─────────────────────────────────────────────────────────────────────────
const BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000';

// Poné en true para ver la página andar SIN backend (datos de ejemplo).
// Cuando confirmes que los endpoints responden, poné false.
export const USAR_MOCK = true;

// ★ La MISMA clave con la que useSesion guarda la sesión en localStorage.
// Si tu useSesion guarda { token, organizacionId } bajo otra clave, cambiala acá.
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

// Si ya tenés un client.ts propio, podés reemplazar esta función por tu cliente.
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

// ─────────────────────────────────────────────────────────────────────────
// Tipos que usa la UI
// ─────────────────────────────────────────────────────────────────────────
export type EstadoTurno =
  | 'solicitado' | 'confirmado' | 'reprogramado' | 'atendido' | 'cancelado';

export interface Turno {
  id: string;
  fecha: string;      // 'YYYY-MM-DD'
  hora: string;       // 'HH:MM'
  estado: EstadoTurno;
  canal: string;      // 'portal' | 'mostrador'
  motivo: string;
  pacienteId: string;
  paciente: string;
  especie: string;
  dueno: string;
}

export interface AnimalOpcion {
  id: string;
  nombre: string;
  especie: string;
  dueno: string;
}

// ─────────────────────────────────────────────────────────────────────────
// ★2. ADAPTADOR — normaliza la respuesta del backend a la forma de la UI.
// Si tus campos se llaman distinto, este es el ÚNICO lugar a tocar.
// ─────────────────────────────────────────────────────────────────────────
function mapTurno(r: any): Turno {
  return {
    id: String(r.id),
    fecha: r.fecha,
    hora: String(r.hora ?? '').slice(0, 5),
    estado: r.estado,
    canal: r.canal ?? 'mostrador',
    motivo: r.motivo ?? '',
    pacienteId: String(r.animalId ?? r.animal?.id ?? ''),
    paciente: r.animal?.nombre ?? r.pacienteNombre ?? '—',
    especie: r.animal?.especie?.nombre ?? r.animal?.especie ?? r.especie ?? '',
    dueno:
      r.solicitante?.nombre ??
      r.dueno?.nombre ??
      [r.dueno?.nombre, r.dueno?.apellido].filter(Boolean).join(' ') ??
      '—',
  };
}

// ─────────────────────────────────────────────────────────────────────────
// ★3. ENDPOINTS — rutas y verbos. Ajustá si tu API usa otra forma
//     (ej: PATCH /turnos/:id con { estado } en vez de sub-recursos).
// ─────────────────────────────────────────────────────────────────────────
export async function listarTurnos(fecha: string): Promise<Turno[]> {
  if (USAR_MOCK) return mock.listar(fecha);
  const rows: any[] = await request(`/turnos?fecha=${fecha}`);
  return rows.map(mapTurno);
}

export async function crearTurno(data: {
  animalId: string; motivo: string; fecha: string; hora: string; canal?: string;
}): Promise<Turno> {
  if (USAR_MOCK) return mock.crear(data);
  const r = await request('/turnos', {
    method: 'POST',
    body: JSON.stringify({ canal: 'mostrador', ...data }),
  });
  return mapTurno(r);
}

export async function confirmarTurno(id: string): Promise<Turno> {
  if (USAR_MOCK) return mock.transicion(id, 'confirmado');
  return mapTurno(await request(`/turnos/${id}/confirmar`, { method: 'PATCH' }));
}

export async function reprogramarTurno(id: string, data: { fecha: string; hora: string }): Promise<Turno> {
  if (USAR_MOCK) return mock.reprogramar(id, data);
  return mapTurno(await request(`/turnos/${id}/reprogramar`, { method: 'PATCH', body: JSON.stringify(data) }));
}

export async function cancelarTurno(id: string, motivo?: string): Promise<Turno> {
  if (USAR_MOCK) return mock.transicion(id, 'cancelado');
  return mapTurno(await request(`/turnos/${id}/cancelar`, { method: 'PATCH', body: JSON.stringify({ motivo }) }));
}

export async function atenderTurno(id: string): Promise<Turno> {
  if (USAR_MOCK) return mock.transicion(id, 'atendido');
  return mapTurno(await request(`/turnos/${id}/atender`, { method: 'PATCH' }));
}

export async function buscarAnimales(q: string): Promise<AnimalOpcion[]> {
  if (USAR_MOCK) return mock.animales(q);
  const rows: any[] = await request(`/animales?buscar=${encodeURIComponent(q)}`);
  return rows.map((a: any) => ({
    id: String(a.id),
    nombre: a.nombre,
    especie: a.especie?.nombre ?? a.especie ?? '',
    dueno: a.dueno?.nombre ?? '',
  }));
}

// ─────────────────────────────────────────────────────────────────────────
// Mock en memoria (sólo si USAR_MOCK = true). Borralo cuando conectes la API.
// ─────────────────────────────────────────────────────────────────────────
const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
const isoOf = (d: Date) => d.toISOString().slice(0, 10);
const mas = (n: number) => { const d = new Date(hoy); d.setDate(d.getDate() + n); return isoOf(d); };

let _mock: Turno[] = [
  { id: '1', fecha: mas(0), hora: '09:00', estado: 'solicitado',   canal: 'portal',    motivo: 'Control anual + antirrábica', pacienteId: 'a1', paciente: 'Frida', especie: 'Canino', dueno: 'Lucía Fernández' },
  { id: '2', fecha: mas(0), hora: '09:30', estado: 'confirmado',   canal: 'mostrador', motivo: 'Cojera pata trasera',          pacienteId: 'a2', paciente: 'Michi', especie: 'Felino', dueno: 'Marcos Ibáñez' },
  { id: '3', fecha: mas(0), hora: '10:15', estado: 'confirmado',   canal: 'portal',    motivo: 'Otitis, seguimiento',          pacienteId: 'a3', paciente: 'Toby',  especie: 'Canino', dueno: 'Ana Duarte' },
  { id: '4', fecha: mas(0), hora: '11:00', estado: 'reprogramado', canal: 'mostrador', motivo: 'Castración — prequirúrgico',    pacienteId: 'a4', paciente: 'Nube',  especie: 'Felino', dueno: 'Sofía Ríos' },
  { id: '5', fecha: mas(0), hora: '08:30', estado: 'atendido',     canal: 'mostrador', motivo: 'Vómitos, guardia',             pacienteId: 'a5', paciente: 'Rocco', especie: 'Canino', dueno: 'Diego Paz' },
  { id: '7', fecha: mas(1), hora: '10:00', estado: 'solicitado',   canal: 'portal',    motivo: 'Séxtuple 2da dosis',           pacienteId: 'a7', paciente: 'Luna',  especie: 'Canino', dueno: 'Pedro Sosa' },
];
let _mockId = 100;

const mock = {
  async listar(fecha: string) { await wait(); return _mock.filter(t => t.fecha === fecha).sort((a, b) => a.hora.localeCompare(b.hora)); },
  async crear(d: any) { await wait(); const t: Turno = { id: String(_mockId++), fecha: d.fecha, hora: d.hora, estado: 'confirmado', canal: d.canal ?? 'mostrador', motivo: d.motivo, pacienteId: d.animalId, paciente: d.paciente ?? 'Paciente', especie: d.especie ?? '', dueno: d.dueno ?? '—' }; _mock.push(t); return t; },
  async transicion(id: string, estado: EstadoTurno) { await wait(); const t = _mock.find(x => x.id === id)!; t.estado = estado; return { ...t }; },
  async reprogramar(id: string, d: any) { await wait(); const t = _mock.find(x => x.id === id)!; t.fecha = d.fecha; t.hora = d.hora; t.estado = 'reprogramado'; return { ...t }; },
  async animales(q: string) { await wait(); const base: AnimalOpcion[] = [{ id: 'a1', nombre: 'Frida', especie: 'Canino', dueno: 'Lucía Fernández' }, { id: 'a2', nombre: 'Michi', especie: 'Felino', dueno: 'Marcos Ibáñez' }, { id: 'a8', nombre: 'Zeus', especie: 'Equino', dueno: 'Est. La Loma' }]; return base.filter(a => a.nombre.toLowerCase().includes(q.toLowerCase())); },
};
const wait = () => new Promise(r => setTimeout(r, 250));

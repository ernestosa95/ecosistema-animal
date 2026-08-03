// apps/web/src/api/portal.ts
// Cliente de la API del Portal del Dueño (acceso por token / magic-link).
// Si tu backend difiere, sólo tocás los 3 puntos marcados con ★.

// ─────────────────────────────────────────────────────────────────────────
// ★1. CONFIG — base, token de acceso y modo mock
// ─────────────────────────────────────────────────────────────────────────
const BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000';

// Poné en true para ver el portal SIN backend (datos de ejemplo).
export const USAR_MOCK = true;

// El token del dueño viaja en la URL: .../portal?token=xxxxx
export function tokenDeUrl(): string {
  const p = new URLSearchParams(window.location.search);
  return p.get('token') ?? p.get('t') ?? '';
}

async function request(path: string, options: RequestInit = {}): Promise<any> {
  const token = tokenDeUrl();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      // El backend resuelve el dueño a partir de este token.
      ...(token ? { 'X-Portal-Token': token } : {}),
      ...(options.headers as Record<string, string> || {}),
    },
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
export type EstadoVacuna = 'al_dia' | 'proxima' | 'vencida';

export interface VacunaPortal { nombre: string; aplicada: string; proxima: string; estado: EstadoVacuna; }
export interface TurnoPortal { fecha: string; hora: string; estado: string; motivo: string; }
export interface ConsultaPortal { fecha: string; motivo: string; diagnostico: string; }

export interface AnimalPortal {
  id: string; nombre: string; especie: string; raza: string;
  sexo: string; nacimiento: string; codigoLegible: string; microchip: string;
  vacunas: VacunaPortal[]; turnos: TurnoPortal[]; consultas: ConsultaPortal[];
}
export interface PortalResumen { dueno: { nombre: string }; animales: AnimalPortal[]; }

// ─────────────────────────────────────────────────────────────────────────
// Helpers de fecha
// ─────────────────────────────────────────────────────────────────────────
function fmt(v?: string): string {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function estadoVacuna(proximaIso?: string): EstadoVacuna {
  if (!proximaIso) return 'al_dia';
  const p = new Date(proximaIso); if (isNaN(p.getTime())) return 'al_dia';
  const dias = Math.ceil((p.getTime() - Date.now()) / 86400000);
  if (dias < 0) return 'vencida';
  if (dias <= 45) return 'proxima';
  return 'al_dia';
}

// ─────────────────────────────────────────────────────────────────────────
// ★2. ADAPTADOR — normaliza la respuesta del backend a la forma de la UI.
// Único lugar a tocar si tus campos se llaman distinto.
// ─────────────────────────────────────────────────────────────────────────
function mapResumen(r: any): PortalResumen {
  return {
    dueno: { nombre: r.dueno?.nombre ?? [r.dueno?.nombre, r.dueno?.apellido].filter(Boolean).join(' ') ?? 'Hola' },
    animales: (r.animales ?? []).map((a: any): AnimalPortal => ({
      id: String(a.id),
      nombre: a.nombre,
      especie: a.especie?.nombre ?? a.especie ?? '',
      raza: a.datosEspecificos?.raza ?? a.raza ?? '—',
      sexo: a.sexo ?? '—',
      nacimiento: fmt(a.fechaNacimiento ?? a.nacimiento),
      codigoLegible: a.codigoLegible ?? '',
      microchip: a.microchip ?? '',
      vacunas: (a.vacunaciones ?? a.vacunas ?? []).map((v: any): VacunaPortal => ({
        nombre: v.nombre,
        aplicada: fmt(v.fechaAplicacion ?? v.aplicada),
        proxima: fmt(v.proximaDosis ?? v.proxima),
        estado: estadoVacuna(v.proximaDosis ?? v.proximaIso ?? v.proxima),
      })),
      turnos: (a.turnos ?? []).map((t: any): TurnoPortal => ({
        fecha: fmt(t.fecha), hora: String(t.hora ?? '').slice(0, 5), estado: t.estado ?? '', motivo: t.motivo ?? '',
      })),
      consultas: (a.consultas ?? []).map((c: any): ConsultaPortal => ({
        fecha: fmt(c.fecha), motivo: c.motivo ?? '', diagnostico: c.diagnostico ?? '—',
      })),
    })),
  };
}

// ─────────────────────────────────────────────────────────────────────────
// ★3. ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────
export async function obtenerResumen(): Promise<PortalResumen> {
  if (USAR_MOCK) return mock.resumen();
  return mapResumen(await request('/portal/resumen'));
}

export async function solicitarTurno(data: { animalId: string; motivo: string; fechaPreferida: string }): Promise<void> {
  if (USAR_MOCK) { await wait(); return; }
  await request('/portal/turnos', { method: 'POST', body: JSON.stringify({ canal: 'portal', ...data }) });
}

// ─────────────────────────────────────────────────────────────────────────
// Mock (sólo si USAR_MOCK = true). Borrar al conectar la API.
// ─────────────────────────────────────────────────────────────────────────
const wait = () => new Promise(r => setTimeout(r, 300));
const mock = {
  async resumen(): Promise<PortalResumen> {
    await wait();
    return {
      dueno: { nombre: 'Lucía' },
      animales: [{
        id: 'a1', nombre: 'Frida', especie: 'Canino', raza: 'Labrador Retriever',
        sexo: 'Hembra', nacimiento: '14/03/2022', codigoLegible: 'CAN-032-000123-4', microchip: '900032000123456',
        vacunas: [
          { nombre: 'Antirrábica', aplicada: '10/04/2025', proxima: '10/04/2026', estado: 'vencida' },
          { nombre: 'Séxtuple (DHPPiL)', aplicada: '02/03/2026', proxima: '15/09/2026', estado: 'proxima' },
          { nombre: 'Tos de las perreras', aplicada: '02/03/2026', proxima: '02/03/2027', estado: 'al_dia' },
        ],
        turnos: [{ fecha: '20/08/2026', hora: '10:00', estado: 'confirmado', motivo: 'Control + refuerzo antirrábica' }],
        consultas: [
          { fecha: '02/03/2026', motivo: 'Control anual', diagnostico: 'Sana. Peso adecuado.' },
          { fecha: '18/11/2025', motivo: 'Otitis', diagnostico: 'Otitis externa leve, tratada.' },
        ],
      }, {
        id: 'a2', nombre: 'Michi', especie: 'Felino', raza: 'Común europeo',
        sexo: 'Macho', nacimiento: '05/06/2023', codigoLegible: 'FEL-032-000487-9', microchip: '',
        vacunas: [{ nombre: 'Triple felina', aplicada: '10/01/2026', proxima: '10/01/2027', estado: 'al_dia' }],
        turnos: [],
        consultas: [{ fecha: '10/01/2026', motivo: 'Vacunación', diagnostico: 'Sano.' }],
      }],
    };
  },
};

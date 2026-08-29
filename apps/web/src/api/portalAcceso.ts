// apps/web/src/api/portalAcceso.ts
// Cliente del Portal del Dueño vía MAGIC-LINK (distinto del acceso público por
// código: acá el token lo emite el staff con POST /portal/acceso/:personaId y
// se manda por el header X-Portal-Token, no por query — la URL sólo lo transporta).

const API = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000';

/** Lee el token de la URL: ?token={token}. */
export function tokenDeUrl(): string {
  return new URLSearchParams(window.location.search).get('token') ?? '';
}

export interface VacunaPortal {
  nombre: string | null;
  fechaAplicacion: string | null;
  proximaDosis: string | null;
}
export interface ConsultaPortal {
  fecha: string | null;
  motivo: string;
  diagnostico: string;
}
export interface TurnoPortal {
  fecha: string;
  hora: string;
  estado: string;
  motivo: string;
}
export interface TratamientoPortal {
  farmaco: string;
  dosis: string | null;
  frecuencia: string | null;
  duracionDias: number | null; // null = indicación puntual; con valor = esquema continuo
  activo: boolean;
  desde: string;
}

export interface AnimalPortal {
  id: string;
  nombre: string;
  especie: { nombre: string };
  sexo: string;
  fechaNacimiento: string | null;
  codigoLegible: string | null;
  microchip: string | null;
  datosEspecificos?: Record<string, unknown>;
  vacunaciones: VacunaPortal[];
  turnos: TurnoPortal[];
  consultas: ConsultaPortal[];
  tratamientos: TratamientoPortal[];
}

export interface ResumenPortalDueno {
  dueno: { nombre: string };
  animales: AnimalPortal[];
}

async function manejar(res: Response) {
  if (!res.ok) {
    if (res.status === 401) throw new Error('El enlace no es válido o venció. Pedile a la veterinaria uno nuevo.');
    throw new Error(`No se pudo cargar la información (Error ${res.status}).`);
  }
  return res.json();
}

export async function obtenerResumenPortal(token: string): Promise<ResumenPortalDueno> {
  const res = await fetch(`${API}/portal/resumen`, { headers: { 'X-Portal-Token': token } });
  return manejar(res);
}

export async function solicitarTurnoPortal(
  token: string,
  data: { animalId: string; motivo?: string; fechaPreferida: string },
): Promise<{ ok: boolean; turnoId: string; estado: string }> {
  const res = await fetch(`${API}/portal/turnos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Portal-Token': token },
    body: JSON.stringify(data),
  });
  return manejar(res);
}

export function fmtFecha(v?: string | null): string {
  if (!v) return '—';
  const soloDia = /^\d{4}-\d{2}-\d{2}$/.test(v);
  const d = new Date(soloDia ? `${v}T00:00:00` : v);
  return isNaN(d.getTime()) ? v : d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// apps/web/src/api/portal.ts
// Cliente del Portal del Dueño. Acceso público por código legible (QR/carnet):
// la URL es  PORTAL_URL/c/{codigo}. Sin token ni sesión.

const API = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000';

/** Lee el código de la URL: /c/{codigo}  o  ?c={codigo}. */
export function codigoDeUrl(): string {
  const m = window.location.pathname.match(/\/c\/([^/?#]+)/);
  if (m) return decodeURIComponent(m[1]);
  const q = new URLSearchParams(window.location.search);
  return q.get('c') ?? q.get('codigo') ?? '';
}

export type EstadoVacuna = 'al_dia' | 'proxima' | 'vencida';

export interface VacunaPortal { producto: string; fecha: string | null; proximaDosis: string | null; }
export interface ConsultaPortal { fecha: string | null; motivo: string | null; diagnostico: string | null; }
export interface TurnoPortal { fechaHora: string; estado: string; motivo: string | null; }

export interface PortalResumen {
  animal: {
    nombre: string; especie: string; raza: string; sexo: string;
    nacimiento: string | null; codigoLegible: string; microchip: string; dueno: string;
  };
  vacunas: VacunaPortal[];
  consultas: ConsultaPortal[];
  turnos: TurnoPortal[];
}

export async function obtenerResumen(codigo: string): Promise<PortalResumen> {
  const res = await fetch(`${API}/portal/c/${encodeURIComponent(codigo)}`);
  if (!res.ok) {
    if (res.status === 404) throw new Error('No encontramos ninguna mascota con este código.');
    throw new Error(`No se pudo cargar la información (Error ${res.status}).`);
  }
  return res.json();
}

// ── Helpers de presentación ─────────────────────────────────────────────────
export function fmtFecha(v?: string | null): string {
  if (!v) return '—';
  // Fechas 'YYYY-MM-DD' o ISO completas.
  const soloDia = /^\d{4}-\d{2}-\d{2}$/.test(v);
  const d = new Date(soloDia ? `${v}T00:00:00` : v);
  return isNaN(d.getTime()) ? v : d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function fmtHora(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

/** Clasifica el estado de una vacuna según su próxima dosis. */
export function estadoVacuna(proxima?: string | null): EstadoVacuna {
  if (!proxima) return 'al_dia';
  const soloDia = /^\d{4}-\d{2}-\d{2}$/.test(proxima);
  const p = new Date(soloDia ? `${proxima}T00:00:00` : proxima);
  if (isNaN(p.getTime())) return 'al_dia';
  const dias = Math.ceil((p.getTime() - Date.now()) / 86_400_000);
  if (dias < 0) return 'vencida';
  if (dias <= 45) return 'proxima';
  return 'al_dia';
}

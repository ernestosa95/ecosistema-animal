import type { Sesion } from '../api/types';

export type SolucionId = 'tropera' | 'huella';

export function tieneAlguno(roles: string[] | undefined, set: Set<string>): boolean {
  return (roles ?? []).some((r) => set.has(r));
}

// --- Roles por sección (mismos sets que antes regían la nav horizontal) ---
export const ROLES_DASHBOARD = new Set(['propietario', 'admin']);
export const ROLES_TURNERO = new Set(['propietario', 'admin', 'recepcion', 'veterinario']);
/**
 * Quién puede entrar a Tropera en absoluto (visibilidad de la pestaña).
 * Incluye `veterinario` desde 2026-09-06 — la Fase E (evaluación andrológica,
 * protocolos IATF, muestras, diagnóstico reproductivo) es trabajo de un
 * veterinario sanitarista, y el backend ya lo permitía en esos endpoints
 * puntuales aunque acá nunca se le dejaba llegar a la pantalla. Dentro de
 * Tropera, no todas las acciones son para todos los que entran — ver
 * `ROLES_TROPERA_CAMPO`/`ROLES_TROPERA_VETERINARIO` más abajo, mismo criterio
 * que ya se aplica en la ficha del paciente de Huella (ver `ROLES_CLINICO`).
 */
export const ROLES_TROPERA = new Set(['propietario', 'admin', 'capataz', 'veterinario']);
/** Manejo de campo "de conteo" (establecimientos, potreros, existencias, movimientos, fichas individuales, plantillas 1-tap) — mismos roles que exige el backend en esos módulos, no incluye veterinario. */
export const ROLES_TROPERA_CAMPO = new Set(['propietario', 'admin', 'capataz']);
/** Trabajo veterinario específico de Tropera (evaluación andrológica, protocolos IATF) — mismos roles que exige el backend ahí, no incluye capataz. */
export const ROLES_TROPERA_VETERINARIO = new Set(['propietario', 'admin', 'veterinario']);
export const ROLES_USUARIOS = new Set(['propietario', 'admin']);
export const ROLES_FARMACIA = new Set(['propietario', 'admin', 'veterinario']);
export const ROLES_CAJA = new Set(['propietario', 'admin', 'recepcion']);
/** Quién puede cargar consultas/vacunaciones (mismos roles que el backend exige en esos endpoints). */
export const ROLES_CLINICO = new Set(['propietario', 'admin', 'veterinario']);
/** Roles que atienden turnos (se les ofrece el filtro "Mis turnos" y el flujo "Atender"). */
export const ROLES_ATIENDEN = new Set(['veterinario', 'propietario']);

export interface NavItemConfig {
  id: string;
  titulo: string;
  /** Contenido interno de un <svg>, portado del mockup (line-art, stroke=currentColor). */
  icono: string;
  /** Si falta, el ítem es visible para cualquier rol que ya tenga acceso a la solución. */
  roles?: Set<string>;
}

const ICONOS = {
  home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline>',
  animales:
    '<path d="M5 10c-1.5 0-3 1.5-3 3 0 1.5 2 1.5 2 1.5l2-1.5M19 10c1.5 0 3 1.5 3 3 0 1.5-2 1.5-2 1.5l-2-1.5"></path><path d="M6 8c-1-2-1-4 1-5 1.5 0 2 2 3 3M18 8c1-2 1-4-1-5-1.5 0-2 2-3 3"></path><path d="M10 6h4l3 5v4c0 3-2 5-5 5s-5-2-5-5v-4l3-5z"></path>',
  potreros:
    '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line>',
  individual:
    '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line>',
  plantillas:
    '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline>',
  turnos:
    '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>',
  duenos:
    '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>',
  recordatorios:
    '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path>',
  farmacia:
    '<rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>',
  caja: '<line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>',
} as const;

/** Ids con prefijo `tropera-` para no chocar con los homónimos de Huella (ambas soluciones tienen "Animales"). */
export const NAV_TROPERA: NavItemConfig[] = [
  { id: 'tropera-home', titulo: 'Home', icono: ICONOS.home, roles: ROLES_TROPERA },
  { id: 'tropera-animales', titulo: 'Animales', icono: ICONOS.animales, roles: ROLES_TROPERA },
  { id: 'tropera-potreros', titulo: 'Potreros', icono: ICONOS.potreros, roles: ROLES_TROPERA },
  { id: 'tropera-individuales', titulo: 'Animales individuales', icono: ICONOS.individual, roles: ROLES_TROPERA },
  { id: 'tropera-plantillas', titulo: 'Plantillas y protocolos', icono: ICONOS.plantillas, roles: ROLES_TROPERA },
];

export const NAV_HUELLA: NavItemConfig[] = [
  { id: 'dashboard', titulo: 'Home', icono: ICONOS.home, roles: ROLES_DASHBOARD },
  { id: 'turnos', titulo: 'Turnos', icono: ICONOS.turnos },
  { id: 'animales', titulo: 'Animales', icono: ICONOS.animales },
  { id: 'duenos', titulo: 'Dueños', icono: ICONOS.duenos },
  { id: 'recordatorios', titulo: 'Recordatorios', icono: ICONOS.recordatorios, roles: ROLES_TURNERO },
  { id: 'farmacia', titulo: 'Farmacia y stock', icono: ICONOS.farmacia, roles: ROLES_FARMACIA },
  { id: 'caja', titulo: 'Caja', icono: ICONOS.caja, roles: ROLES_CAJA },
];

export function itemsVisibles(items: NavItemConfig[], roles: string[] | undefined): NavItemConfig[] {
  return items.filter((it) => !it.roles || tieneAlguno(roles, it.roles));
}

/** Soluciones habilitadas para la organización (activadas por separado desde /admin) — nunca según el rol. */
export function solucionesDisponibles(sesion: Sesion): SolucionId[] {
  const soluciones: SolucionId[] = [];
  if (sesion.huellaActiva) soluciones.push('huella');
  if (sesion.troperaActiva) soluciones.push('tropera');
  return soluciones;
}

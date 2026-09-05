/**
 * Puerto directo de apps/web/src/nav/config.ts — mismos sets de roles, para
 * gatear los accesos rápidos del Home igual que hace `HuellaHomeSection.tsx`
 * en la web. Sólo se portan los sets que el mobile necesita hoy (los tres
 * accesos rápidos: consulta/vacuna, venta, turno).
 */
export function tieneAlguno(roles: string[] | undefined, set: Set<string>): boolean {
  return (roles ?? []).some((r) => set.has(r));
}

/** Quién puede cargar consultas/vacunaciones (mismos roles que el backend exige en esos endpoints). */
export const ROLES_CLINICO = new Set(['propietario', 'admin', 'veterinario']);
export const ROLES_CAJA = new Set(['propietario', 'admin', 'recepcion']);
export const ROLES_TURNERO = new Set(['propietario', 'admin', 'recepcion', 'veterinario']);
/** Quién puede marcar un turno como atendido (mismo set que `App.tsx`/`HuellaHomeSection.tsx` en la web). */
export const ROLES_ATIENDEN = new Set(['veterinario', 'propietario']);

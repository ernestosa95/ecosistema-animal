// apps/web/src/auth/permisos.ts
// Espejo de la matriz de permisos del backend. Sirve para ocultar botones en la UI.
// (La barrera real sigue estando en el backend; esto es prolijidad de interfaz.)

export type Accion = 'escribir_animales' | 'escribir_duenos' | 'gestionar_turnos' | 'clinico';

const MATRIZ: Record<Accion, string[]> = {
  escribir_animales: ['propietario', 'admin', 'veterinario', 'recepcion'],
  escribir_duenos: ['propietario', 'admin', 'veterinario', 'recepcion'],
  gestionar_turnos: ['propietario', 'admin', 'veterinario', 'recepcion'],
  clinico: ['propietario', 'admin', 'veterinario'], // recepción NO ve lo clínico
};

export function puede(rol: string | undefined, accion: Accion): boolean {
  return !!rol && MATRIZ[accion].includes(rol);
}

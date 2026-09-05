import { BadRequestException } from '@nestjs/common';
import { and, eq, ne, sql } from 'drizzle-orm';
import { organizaciones, membresias, planes } from '../database/schema';

const ROL_LABEL: Record<string, string> = {
  propietario: 'Propietario',
  admin: 'Administrador',
  capataz: 'Capataz',
  veterinario: 'Veterinario',
  recepcion: 'Administrativa / Recepción',
};

/**
 * Rechaza si `rolesNuevos` haría que la organización supere el cupo por rol
 * de su plan (`plataforma.planes.limitesRoles`, ej. { veterinario: 2 }).
 * Sin plan asignado, o sin límite configurado para un rol puntual, ese rol
 * queda sin tope — el catálogo es opt-in, no todo plan necesita definirlo.
 *
 * `membresiaIdExcluida` es la propia membresía que se está editando (si
 * aplica, ej. `setRoles`) — no cuenta contra su propio cupo, así se puede
 * volver a guardar el mismo rol sin que se autobloquee al estar ya en el
 * límite. Usada por `AdminService.agregarMiembro()` (excluida = null, la
 * membresía todavía no existe) y `AdminService.setRoles()`.
 */
export async function verificarLimitesRoles(
  db: any,
  organizacionId: string,
  membresiaIdExcluida: string | null,
  rolesNuevos: string[],
): Promise<void> {
  const [org] = await db
    .select({ planId: organizaciones.planId })
    .from(organizaciones)
    .where(eq(organizaciones.id, organizacionId))
    .limit(1);
  if (!org?.planId) return;

  const [plan] = await db
    .select({ limitesRoles: planes.limitesRoles })
    .from(planes)
    .where(eq(planes.id, org.planId))
    .limit(1);
  const limites = (plan?.limitesRoles ?? {}) as Record<string, number>;

  for (const rol of rolesNuevos) {
    const limite = limites[rol];
    if (limite == null) continue;

    const condiciones = [
      eq(membresias.organizacionId, organizacionId),
      eq(membresias.activo, true),
      sql`${rol} = ANY(${membresias.roles})`,
    ];
    if (membresiaIdExcluida) condiciones.push(ne(membresias.id, membresiaIdExcluida));

    const actuales = await db.select({ id: membresias.id }).from(membresias).where(and(...condiciones));
    if (actuales.length >= limite) {
      throw new BadRequestException(
        `El plan de esta organización permite hasta ${limite} miembro(s) con el rol "${ROL_LABEL[rol] ?? rol}".`,
      );
    }
  }
}

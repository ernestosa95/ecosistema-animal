import { BadRequestException } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { especies } from '../../database/schema';
import { generarCodigoLegible } from './codigo-legible.util';

/**
 * Resuelve el código de especie y consume la secuencia de Postgres para
 * generar el próximo código legible de un animal. Compartida entre
 * `AnimalesService.crear()` (alta online) y el hook `afterCreate` del motor
 * de sync (alta offline desde el mobile) — el código legible depende de un
 * `nextval()` centralizado, no se puede generar en el cliente.
 */
export async function generarProximoCodigoLegible(tx: any, especieId: string): Promise<string> {
  const [especie] = await tx
    .select({ codigo: especies.codigo })
    .from(especies)
    .where(eq(especies.id, especieId))
    .limit(1);
  if (!especie) {
    throw new BadRequestException('La especie indicada no existe');
  }

  const seqRes = await tx.execute(sql`SELECT nextval('core.animales_codigo_seq') AS n`);
  const secuencia = Number((seqRes.rows[0] as { n: string }).n);
  return generarCodigoLegible(especie.codigo, secuencia);
}

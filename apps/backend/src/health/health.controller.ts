import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../database/drizzle.provider';

/**
 * Sin guards a propósito — lo pega un servicio de uptime externo (o el
 * `healthcheck:` del propio `docker-compose.yml`) que no tiene ni token ni
 * `X-Organizacion-Id`. No expone nada sensible, sólo confirma que el proceso
 * responde y que la conexión a Postgres está viva.
 */
@Controller('health')
export class HealthController {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  @Get()
  async chequear() {
    try {
      await this.db.execute(sql`select 1`);
    } catch {
      throw new ServiceUnavailableException('No hay conexión con la base de datos');
    }
    return { ok: true, timestamp: new Date().toISOString() };
  }
}

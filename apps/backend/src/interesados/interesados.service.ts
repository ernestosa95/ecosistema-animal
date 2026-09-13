import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { desc, sql } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../database/drizzle.provider';
import { interesados } from '../database/schema';
import { CrearInteresadoDto } from './dto/crear-interesado.dto';

/**
 * Cupo fijo para el lanzamiento — a propósito en el código, no en una tabla
 * de configuración: es una decisión puntual de esta etapa, no un parámetro
 * que el super-admin necesite tocar desde una pantalla.
 */
const CUPO_MAXIMO = 10;

@Injectable()
export class InteresadosService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  private async contar(): Promise<number> {
    const [{ count }] = await this.db.select({ count: sql<number>`count(*)::int` }).from(interesados);
    return count;
  }

  /** Público — la landing lo consulta al cargar para decidir si muestra el botón o el aviso de cupo lleno. */
  async cupo(): Promise<{ disponible: boolean; restantes: number }> {
    const usados = await this.contar();
    const restantes = Math.max(0, CUPO_MAXIMO - usados);
    return { disponible: restantes > 0, restantes };
  }

  /** Público — registra un interesado si todavía hay cupo. */
  async crear(dto: CrearInteresadoDto): Promise<{ ok: true }> {
    const usados = await this.contar();
    if (usados >= CUPO_MAXIMO) {
      throw new ConflictException('Ya completamos las primeras 10 solicitudes de esta etapa.');
    }
    await this.db.insert(interesados).values(dto);
    return { ok: true };
  }

  /** STAFF (super-admin) — lista completa para hacer el seguimiento manual. */
  async listar() {
    return this.db.select().from(interesados).orderBy(desc(interesados.createdAt));
  }
}

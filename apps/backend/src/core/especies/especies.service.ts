import { Injectable, Inject } from '@nestjs/common';
import { asc } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../database/drizzle.provider';
import { especies } from '../../database/schema';

@Injectable()
export class EspeciesService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /** Catálogo global de especies (no depende de la organización). */
  listar() {
    return this.db.select().from(especies).orderBy(asc(especies.nombre));
  }
}

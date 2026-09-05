import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../database/drizzle.provider';
import { catalogoDiagnosticos } from '../../database/schema';

@Injectable()
export class CatalogoDiagnosticosService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /** Mismo criterio que `CatalogoVacunasService` — catálogo chico, sin búsqueda server-side. */
  porEspecie(especieId: string) {
    return this.db.select().from(catalogoDiagnosticos).where(eq(catalogoDiagnosticos.especieId, especieId));
  }
}

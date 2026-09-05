import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../database/drizzle.provider';
import { catalogoVacunas } from '../../database/schema';

@Injectable()
export class CatalogoVacunasService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /**
   * Lista el catálogo de referencia (vacunas/antiparasitarios comunes)
   * filtrado por especie — chico por diseño (una decena de items por
   * especie), no necesita búsqueda server-side como el vademécum de SENASA.
   * Sólo asiste `producto` (texto libre) de `vacunaciones`.
   */
  porEspecie(especieId: string) {
    return this.db.select().from(catalogoVacunas).where(eq(catalogoVacunas.especieId, especieId));
  }
}

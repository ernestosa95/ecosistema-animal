import { Injectable, Inject } from '@nestjs/common';
import { ilike } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../database/drizzle.provider';
import { vademecumSenasa } from '../../database/schema';

@Injectable()
export class VademecumSenasaService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /**
   * Búsqueda server-side sobre las ~7000 filas del registro nacional de
   * SENASA (F4.1) — a diferencia del resto de los buscadores del ecosistema
   * (filtrado client-side sobre una lista chica ya cargada, ver
   * `puntuarMultiple`), acá traer la tabla entera al cliente no tiene
   * sentido. Sólo asiste el alta de un producto propio (autocompletar
   * nombre/empresa) — no es una fuente de verdad, `farmacia.productos` sigue
   * siendo lo que cada organización realmente tiene.
   */
  buscar(termino: string) {
    const limpio = termino.trim();
    if (limpio.length < 2) return [];
    return this.db
      .select()
      .from(vademecumSenasa)
      .where(ilike(vademecumSenasa.nombreComercial, `%${limpio}%`))
      .limit(20);
  }
}

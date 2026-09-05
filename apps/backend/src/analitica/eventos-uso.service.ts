import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE, DrizzleDB } from '../database/drizzle.provider';
import { eventosUso } from '../database/schema';
import { RegistrarEventoDto } from './dto/registrar-evento.dto';

@Injectable()
export class EventosUsoService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /** Alta simple, sin devolver nada útil al cliente — el frontend la dispara fire-and-forget. */
  async registrar(organizacionId: string, usuarioId: string, dto: RegistrarEventoDto) {
    await this.db.insert(eventosUso).values({
      organizacionId,
      usuarioId,
      tipo: dto.tipo,
      nombre: dto.nombre,
    });
    return { ok: true };
  }
}

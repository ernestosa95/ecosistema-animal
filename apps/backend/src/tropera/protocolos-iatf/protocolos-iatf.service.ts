import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../database/drizzle.provider';
import {
  protocolosIatf, protocoloIatfPasos, establecimientos, animalesCampo, tareas,
} from '../../database/schema';
import { CreateProtocoloIatfDto } from './dto/create-protocolo-iatf.dto';
import { AplicarProtocoloIatfDto } from './dto/aplicar-protocolo-iatf.dto';

@Injectable()
export class ProtocolosIatfService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async crear(organizacionId: string, dto: CreateProtocoloIatfDto) {
    return this.db.transaction(async (tx) => {
      const [protocolo] = await tx
        .insert(protocolosIatf)
        .values({ organizacionId, nombre: dto.nombre, descripcion: dto.descripcion })
        .returning();

      const pasos = await tx
        .insert(protocoloIatfPasos)
        .values(
          dto.pasos.map((paso, i) => ({
            protocoloId: protocolo.id,
            diaOffset: paso.diaOffset,
            descripcion: paso.descripcion,
            producto: paso.producto,
            orden: i,
          })),
        )
        .returning();

      return { ...protocolo, pasos };
    });
  }

  async listar(organizacionId: string) {
    const propios = await this.db
      .select()
      .from(protocolosIatf)
      .where(and(eq(protocolosIatf.organizacionId, organizacionId), isNull(protocolosIatf.deletedAt)))
      .orderBy(asc(protocolosIatf.nombre));

    return Promise.all(
      propios.map(async (protocolo) => {
        const pasos = await this.db
          .select()
          .from(protocoloIatfPasos)
          .where(eq(protocoloIatfPasos.protocoloId, protocolo.id))
          .orderBy(asc(protocoloIatfPasos.orden));
        return { ...protocolo, pasos };
      }),
    );
  }

  async eliminar(organizacionId: string, id: string) {
    const [protocolo] = await this.db
      .select({ id: protocolosIatf.id })
      .from(protocolosIatf)
      .where(and(eq(protocolosIatf.id, id), eq(protocolosIatf.organizacionId, organizacionId)))
      .limit(1);
    if (!protocolo) throw new NotFoundException('Protocolo no encontrado');
    await this.db
      .update(protocolosIatf)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(protocolosIatf.id, id));
    return { ok: true };
  }

  /** Genera una tarea programada por cada paso del protocolo (fechaInicio + diaOffset días). */
  async aplicar(organizacionId: string, protocoloId: string, dto: AplicarProtocoloIatfDto) {
    const [establecimiento] = await this.db
      .select({ id: establecimientos.id })
      .from(establecimientos)
      .where(and(eq(establecimientos.id, dto.establecimientoId), eq(establecimientos.organizacionId, organizacionId)))
      .limit(1);
    if (!establecimiento) throw new NotFoundException('Establecimiento no encontrado');

    const [animal] = await this.db
      .select({ id: animalesCampo.id })
      .from(animalesCampo)
      .where(and(eq(animalesCampo.id, dto.animalCampoId), eq(animalesCampo.organizacionId, organizacionId)))
      .limit(1);
    if (!animal) throw new NotFoundException('El animal indicado no existe en esta organización');

    const pasos = await this.db
      .select()
      .from(protocoloIatfPasos)
      .where(eq(protocoloIatfPasos.protocoloId, protocoloId))
      .orderBy(asc(protocoloIatfPasos.orden));
    if (pasos.length === 0) throw new NotFoundException('Protocolo no encontrado o sin pasos');

    const inicio = new Date(`${dto.fechaInicio}T00:00:00`);

    return this.db.transaction(async (tx) => {
      const creadas = [];
      for (const paso of pasos) {
        const fecha = new Date(inicio);
        fecha.setDate(fecha.getDate() + paso.diaOffset);
        const [tarea] = await tx
          .insert(tareas)
          .values({
            organizacionId,
            establecimientoId: dto.establecimientoId,
            animalCampoId: dto.animalCampoId,
            protocoloId,
            descripcion: paso.descripcion,
            producto: paso.producto,
            fechaProgramada: fecha.toISOString().slice(0, 10),
          })
          .returning();
        creadas.push(tarea);
      }
      return creadas;
    });
  }
}

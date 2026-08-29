import { BadRequestException, Injectable, Inject, NotFoundException } from '@nestjs/common';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../database/drizzle.provider';
import { animalesCampo, establecimientos, eventos } from '../../database/schema';
import { CreateAnimalCampoDto } from './dto/create-animal-campo.dto';
import { UpdateAnimalCampoDto } from './dto/update-animal-campo.dto';
import { ConciliarAnimalCampoDto } from './dto/conciliar-animal-campo.dto';

@Injectable()
export class AnimalesCampoService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  private async verificarEstablecimiento(organizacionId: string, establecimientoId: string) {
    const [establecimiento] = await this.db
      .select({ id: establecimientos.id })
      .from(establecimientos)
      .where(
        and(
          eq(establecimientos.id, establecimientoId),
          eq(establecimientos.organizacionId, organizacionId),
          isNull(establecimientos.deletedAt),
        ),
      )
      .limit(1);
    if (!establecimiento) throw new NotFoundException('Establecimiento no encontrado');
  }

  /**
   * Alta de un animal individual. Si no viene `caravana` es alta express
   * transitoria (§5.2): se consume `tropera.animales_campo_temp_seq` para
   * asignar "TEMP-N" y queda `caravanaDefinitiva=false` hasta conciliar().
   */
  async crear(organizacionId: string, dto: CreateAnimalCampoDto) {
    await this.verificarEstablecimiento(organizacionId, dto.establecimientoId);

    let caravana = dto.caravana;
    let caravanaDefinitiva = true;
    if (!caravana) {
      const seqRes = await this.db.execute(sql`SELECT nextval('tropera.animales_campo_temp_seq') AS n`);
      const secuencia = (seqRes.rows[0] as { n: string }).n;
      caravana = `TEMP-${secuencia}`;
      caravanaDefinitiva = false;
    }

    const [animal] = await this.db
      .insert(animalesCampo)
      .values({
        organizacionId,
        establecimientoId: dto.establecimientoId,
        caravana,
        caravanaDefinitiva,
        categoria: dto.categoria,
        sexo: dto.sexo,
        potreroId: dto.potreroId,
        observaciones: dto.observaciones,
      })
      .returning();
    return animal;
  }

  /** Listado, opcionalmente acotado a un establecimiento, un potrero, y/o a los pendientes de conciliar (Bandeja de Conciliación). */
  listar(organizacionId: string, establecimientoId?: string, soloTransitorios?: boolean, potreroId?: string) {
    const condiciones = [eq(animalesCampo.organizacionId, organizacionId), isNull(animalesCampo.deletedAt)];
    if (establecimientoId) condiciones.push(eq(animalesCampo.establecimientoId, establecimientoId));
    if (soloTransitorios) condiciones.push(eq(animalesCampo.caravanaDefinitiva, false));
    if (potreroId) condiciones.push(eq(animalesCampo.potreroId, potreroId));
    return this.db
      .select()
      .from(animalesCampo)
      .where(and(...condiciones))
      .orderBy(desc(animalesCampo.createdAt));
  }

  async obtener(organizacionId: string, id: string) {
    const [animal] = await this.db
      .select()
      .from(animalesCampo)
      .where(
        and(eq(animalesCampo.id, id), eq(animalesCampo.organizacionId, organizacionId), isNull(animalesCampo.deletedAt)),
      )
      .limit(1);
    if (!animal) throw new NotFoundException('Animal no encontrado');
    return animal;
  }

  async actualizar(organizacionId: string, id: string, dto: UpdateAnimalCampoDto) {
    await this.obtener(organizacionId, id);
    const [animal] = await this.db
      .update(animalesCampo)
      .set({
        ...(dto.categoria !== undefined && { categoria: dto.categoria }),
        ...(dto.sexo !== undefined && { sexo: dto.sexo }),
        ...(dto.estado !== undefined && { estado: dto.estado }),
        ...(dto.potreroId !== undefined && { potreroId: dto.potreroId }),
        ...(dto.observaciones !== undefined && { observaciones: dto.observaciones }),
        updatedAt: new Date(),
      })
      .where(and(eq(animalesCampo.id, id), eq(animalesCampo.organizacionId, organizacionId)))
      .returning();
    return animal;
  }

  /** Bandeja de Conciliación: asigna la caravana definitiva a un animal transitorio. */
  async conciliar(organizacionId: string, id: string, dto: ConciliarAnimalCampoDto) {
    const animal = await this.obtener(organizacionId, id);
    if (animal.caravanaDefinitiva) {
      throw new BadRequestException('Este animal ya tiene una caravana definitiva');
    }
    const [actualizado] = await this.db
      .update(animalesCampo)
      .set({ caravana: dto.caravana, caravanaDefinitiva: true, updatedAt: new Date() })
      .where(eq(animalesCampo.id, id))
      .returning();
    return actualizado;
  }

  /** Historial de eventos imputados a este animal puntual (ficha individual). */
  async historialEventos(organizacionId: string, id: string) {
    await this.obtener(organizacionId, id);
    return this.db
      .select()
      .from(eventos)
      .where(and(eq(eventos.organizacionId, organizacionId), eq(eventos.animalCampoId, id)))
      .orderBy(desc(eventos.fecha), desc(eventos.createdAt));
  }
}

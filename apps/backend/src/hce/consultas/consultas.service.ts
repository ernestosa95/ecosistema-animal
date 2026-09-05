import {
  Injectable,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, gte, isNull, lte } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../database/drizzle.provider';
import { consultas, animales } from '../../database/schema';
import { CreateConsultaDto } from './dto/create-consulta.dto';
import { UpdateConsultaDto } from './dto/update-consulta.dto';

@Injectable()
export class ConsultasService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /** Verifica que el paciente pertenezca a la organización activa. */
  private async verificarAnimal(organizacionId: string, animalId: string) {
    const [animal] = await this.db
      .select({ id: animales.id })
      .from(animales)
      .where(
        and(eq(animales.id, animalId), eq(animales.organizacionId, organizacionId)),
      )
      .limit(1);
    if (!animal) {
      throw new NotFoundException('El paciente no existe en esta organización');
    }
  }

  /** Registra una consulta en la historia clínica de un paciente. */
  async crear(
    organizacionId: string,
    veterinarioId: string,
    dto: CreateConsultaDto,
  ) {
    await this.verificarAnimal(organizacionId, dto.animalId);

    const [consulta] = await this.db
      .insert(consultas)
      .values({
        organizacionId,
        animalId: dto.animalId,
        veterinarioId,
        fecha: dto.fecha ? new Date(dto.fecha) : undefined,
        motivo: dto.motivo,
        anamnesis: dto.anamnesis,
        examenFisico: dto.examenFisico,
        diagnostico: dto.diagnostico,
        tratamiento: dto.tratamiento,
        pesoKg: dto.pesoKg?.toString(),
        temperaturaC: dto.temperaturaC?.toString(),
        observaciones: dto.observaciones,
        costo: dto.costo.toString(),
      })
      .returning();

    return consulta;
  }

  /** Historia clínica de un paciente: consultas ordenadas de la más reciente. */
  async historiaPorAnimal(organizacionId: string, animalId: string) {
    await this.verificarAnimal(organizacionId, animalId);
    return this.db
      .select()
      .from(consultas)
      .where(
        and(
          eq(consultas.organizacionId, organizacionId),
          eq(consultas.animalId, animalId),
          isNull(consultas.deletedAt),
        ),
      )
      .orderBy(desc(consultas.fecha));
  }

  /**
   * Consultas de TODA la organización en un rango de fechas, con el nombre
   * del paciente (para el drill-down del dashboard, §4.2 del spec UI/UX —
   * antes sólo existía `historiaPorAnimal`, acotada a un paciente puntual).
   */
  porRango(organizacionId: string, desde?: string, hasta?: string) {
    const filtros = [eq(consultas.organizacionId, organizacionId), isNull(consultas.deletedAt)];
    if (desde) filtros.push(gte(consultas.fecha, new Date(desde)));
    if (hasta) filtros.push(lte(consultas.fecha, new Date(hasta)));
    return this.db
      .select({
        id: consultas.id,
        fecha: consultas.fecha,
        motivo: consultas.motivo,
        diagnostico: consultas.diagnostico,
        pesoKg: consultas.pesoKg,
        costo: consultas.costo,
        animalId: consultas.animalId,
        pacienteNombre: animales.nombre,
      })
      .from(consultas)
      .leftJoin(animales, eq(consultas.animalId, animales.id))
      .where(and(...filtros))
      .orderBy(desc(consultas.fecha));
  }

  /** Obtiene una consulta puntual, acotada a la organización activa. */
  async obtener(organizacionId: string, id: string) {
    const [consulta] = await this.db
      .select()
      .from(consultas)
      .where(
        and(
          eq(consultas.id, id),
          eq(consultas.organizacionId, organizacionId),
          isNull(consultas.deletedAt),
        ),
      )
      .limit(1);
    if (!consulta) throw new NotFoundException('Consulta no encontrada');
    return consulta;
  }

  /** Corrige los datos de una consulta ya cargada. */
  async actualizar(organizacionId: string, id: string, dto: UpdateConsultaDto) {
    await this.obtener(organizacionId, id); // valida pertenencia

    const [consulta] = await this.db
      .update(consultas)
      .set({
        ...(dto.fecha !== undefined && { fecha: new Date(dto.fecha) }),
        ...(dto.motivo !== undefined && { motivo: dto.motivo }),
        ...(dto.anamnesis !== undefined && { anamnesis: dto.anamnesis }),
        ...(dto.examenFisico !== undefined && { examenFisico: dto.examenFisico }),
        ...(dto.diagnostico !== undefined && { diagnostico: dto.diagnostico }),
        ...(dto.tratamiento !== undefined && { tratamiento: dto.tratamiento }),
        ...(dto.pesoKg !== undefined && { pesoKg: dto.pesoKg.toString() }),
        ...(dto.temperaturaC !== undefined && { temperaturaC: dto.temperaturaC.toString() }),
        ...(dto.observaciones !== undefined && { observaciones: dto.observaciones }),
        ...(dto.costo !== undefined && { costo: dto.costo.toString() }),
        updatedAt: new Date(),
      })
      .where(and(eq(consultas.id, id), eq(consultas.organizacionId, organizacionId)))
      .returning();

    return consulta;
  }

  /** Borra (soft delete) una consulta cargada por error. */
  async eliminar(organizacionId: string, id: string) {
    await this.obtener(organizacionId, id); // valida pertenencia
    await this.db
      .update(consultas)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(consultas.id, id), eq(consultas.organizacionId, organizacionId)));
    return { ok: true };
  }
}

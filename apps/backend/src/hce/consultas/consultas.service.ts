import {
  Injectable,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../database/drizzle.provider';
import { consultas, animales } from '../../database/schema';
import { CreateConsultaDto } from './dto/create-consulta.dto';

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
        ),
      )
      .orderBy(desc(consultas.fecha));
  }

  /** Obtiene una consulta puntual, acotada a la organización activa. */
  async obtener(organizacionId: string, id: string) {
    const [consulta] = await this.db
      .select()
      .from(consultas)
      .where(
        and(eq(consultas.id, id), eq(consultas.organizacionId, organizacionId)),
      )
      .limit(1);
    if (!consulta) throw new NotFoundException('Consulta no encontrada');
    return consulta;
  }
}

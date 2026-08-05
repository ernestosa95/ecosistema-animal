import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { and, asc, eq, gte, lte } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../database/drizzle.provider';
import { turnos, animales, especies, personas } from '../../database/schema';
import { CreateTurnoDto } from './dto/create-turno.dto';
import { UpdateEstadoTurnoDto } from './dto/update-estado-turno.dto';

/** Estados finales: no admiten más cambios. */
const ESTADOS_TERMINALES = new Set(['cancelado', 'atendido', 'ausente']);

@Injectable()
export class TurnosService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /**
   * Solicita un turno (por defecto desde el portal del dueño). El solicitante
   * se resuelve a partir del dueño del animal.
   */
  async solicitar(organizacionId: string, dto: CreateTurnoDto) {
    const [animal] = await this.db
      .select({ id: animales.id, personaId: animales.personaId })
      .from(animales)
      .where(and(eq(animales.id, dto.animalId), eq(animales.organizacionId, organizacionId)))
      .limit(1);
    if (!animal) {
      throw new NotFoundException('El paciente no existe en esta organización');
    }

    const [turno] = await this.db
      .insert(turnos)
      .values({
        organizacionId,
        animalId: dto.animalId,
        personaId: animal.personaId,
        fechaHora: new Date(dto.fechaHora),
        estado: 'solicitado',
        motivo: dto.motivo,
        canal: dto.canal ?? 'portal',
      })
      .returning();
    return turno;
  }

  /** Cambia el estado del turno (confirmar, reprogramar, cancelar, atender...). */
  async cambiarEstado(
    organizacionId: string,
    id: string,
    dto: UpdateEstadoTurnoDto,
  ) {
    const turno = await this.obtener(organizacionId, id);

    if (ESTADOS_TERMINALES.has(turno.estado)) {
      throw new BadRequestException(
        `El turno está en estado "${turno.estado}" y no admite cambios`,
      );
    }
    if (dto.estado === 'reprogramado' && !dto.fechaHora) {
      throw new BadRequestException('Para reprogramar hay que indicar la nueva fecha/hora');
    }

    const [actualizado] = await this.db
      .update(turnos)
      .set({
        estado: dto.estado,
        fechaHora: dto.fechaHora ? new Date(dto.fechaHora) : turno.fechaHora,
        veterinarioId: dto.veterinarioId ?? turno.veterinarioId,
        updatedAt: new Date(),
      })
      .where(and(eq(turnos.id, id), eq(turnos.organizacionId, organizacionId)))
      .returning();
    return actualizado;
  }

  /**
   * Agenda: turnos de la organización en un rango, ordenados por fecha/hora.
   * Trae también el nombre del paciente, su especie y el dueño para la vista.
   */
  agenda(organizacionId: string, desde?: string, hasta?: string) {
    const filtros = [eq(turnos.organizacionId, organizacionId)];
    if (desde) filtros.push(gte(turnos.fechaHora, new Date(desde)));
    if (hasta) filtros.push(lte(turnos.fechaHora, new Date(hasta)));
    return this.db
      .select({
        id: turnos.id,
        animalId: turnos.animalId,
        fechaHora: turnos.fechaHora,
        estado: turnos.estado,
        motivo: turnos.motivo,
        canal: turnos.canal,
        pacienteNombre: animales.nombre,
        especie: especies.nombre,
        duenoNombre: personas.nombre,
        duenoApellido: personas.apellido,
      })
      .from(turnos)
      .leftJoin(animales, eq(turnos.animalId, animales.id))
      .leftJoin(especies, eq(animales.especieId, especies.id))
      .leftJoin(personas, eq(animales.personaId, personas.id))
      .where(and(...filtros))
      .orderBy(asc(turnos.fechaHora));
  }

  /** Turnos de un paciente. */
  porAnimal(organizacionId: string, animalId: string) {
    return this.db
      .select()
      .from(turnos)
      .where(
        and(eq(turnos.organizacionId, organizacionId), eq(turnos.animalId, animalId)),
      )
      .orderBy(asc(turnos.fechaHora));
  }

  /** Obtiene un turno, acotado a la organización activa. */
  async obtener(organizacionId: string, id: string) {
    const [turno] = await this.db
      .select()
      .from(turnos)
      .where(and(eq(turnos.id, id), eq(turnos.organizacionId, organizacionId)))
      .limit(1);
    if (!turno) throw new NotFoundException('Turno no encontrado');
    return turno;
  }
}

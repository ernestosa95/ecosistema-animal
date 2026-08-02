import {
  Injectable,
  Inject,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../database/drizzle.provider';
import { personas, animales } from '../../database/schema';
import { CreatePersonaDto } from './dto/create-persona.dto';
import { UpdatePersonaDto } from './dto/update-persona.dto';

@Injectable()
export class PersonasService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /** Da de alta un dueño dentro de la organización activa. */
  async crear(organizacionId: string, dto: CreatePersonaDto) {
    // DNI único dentro de la organización (si se informa)
    if (dto.dni) {
      const [existe] = await this.db
        .select({ id: personas.id })
        .from(personas)
        .where(
          and(
            eq(personas.organizacionId, organizacionId),
            eq(personas.dni, dto.dni),
          ),
        )
        .limit(1);
      if (existe) {
        throw new ConflictException('Ya existe una persona con ese DNI en la organización');
      }
    }

    const [persona] = await this.db
      .insert(personas)
      .values({
        organizacionId,
        dni: dto.dni,
        nombre: dto.nombre,
        apellido: dto.apellido,
        sexo: dto.sexo,
        fechaNacimiento: dto.fechaNacimiento,
        celular: dto.celular,
        telefono: dto.telefono,
        email: dto.email,
      })
      .returning();

    return persona;
  }

  /** Lista los dueños de la organización activa. */
  listar(organizacionId: string) {
    return this.db
      .select()
      .from(personas)
      .where(eq(personas.organizacionId, organizacionId));
  }

  /** Obtiene un dueño, garantizando que pertenezca a la organización activa. */
  async obtener(organizacionId: string, id: string) {
    const [persona] = await this.db
      .select()
      .from(personas)
      .where(and(eq(personas.id, id), eq(personas.organizacionId, organizacionId)))
      .limit(1);
    if (!persona) throw new NotFoundException('Persona no encontrada');
    return persona;
  }

  /** Actualiza los datos de un dueño de la organización activa. */
  async actualizar(
    organizacionId: string,
    id: string,
    dto: UpdatePersonaDto,
  ) {
    const actual = await this.obtener(organizacionId, id);

    // Si cambia el DNI, verificar unicidad dentro de la organización
    if (dto.dni && dto.dni !== actual.dni) {
      const [existe] = await this.db
        .select({ id: personas.id })
        .from(personas)
        .where(
          and(eq(personas.organizacionId, organizacionId), eq(personas.dni, dto.dni)),
        )
        .limit(1);
      if (existe && existe.id !== id) {
        throw new ConflictException('Ya existe otra persona con ese DNI en la organización');
      }
    }

    const [persona] = await this.db
      .update(personas)
      .set({
        ...(dto.dni !== undefined && { dni: dto.dni }),
        ...(dto.nombre !== undefined && { nombre: dto.nombre }),
        ...(dto.apellido !== undefined && { apellido: dto.apellido }),
        ...(dto.sexo !== undefined && { sexo: dto.sexo }),
        ...(dto.fechaNacimiento !== undefined && { fechaNacimiento: dto.fechaNacimiento }),
        ...(dto.celular !== undefined && { celular: dto.celular }),
        ...(dto.telefono !== undefined && { telefono: dto.telefono }),
        ...(dto.email !== undefined && { email: dto.email }),
        updatedAt: new Date(),
      })
      .where(and(eq(personas.id, id), eq(personas.organizacionId, organizacionId)))
      .returning();

    return persona;
  }

  /** Lista los animales asociados a un dueño (dentro de la organización). */
  async listarAnimales(organizacionId: string, personaId: string) {
    await this.obtener(organizacionId, personaId); // valida pertenencia
    return this.db
      .select()
      .from(animales)
      .where(
        and(
          eq(animales.organizacionId, organizacionId),
          eq(animales.personaId, personaId),
        ),
      );
  }
}

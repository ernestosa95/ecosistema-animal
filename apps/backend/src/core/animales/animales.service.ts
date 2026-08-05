import {
  Injectable,
  Inject,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../database/drizzle.provider';
import { animales, especies, personas } from '../../database/schema';
import { CreateAnimalDto } from './dto/create-animal.dto';
import { UpdateAnimalDto } from './dto/update-animal.dto';
import {
  generarCodigoLegible,
  validarMicrochipISO,
} from './codigo-legible.util';

@Injectable()
export class AnimalesService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /**
   * Da de alta un paciente. El servidor asigna el codigo_legible unívoco a
   * partir de la secuencia de Postgres + la utilidad de código legible.
   */
  async crear(organizacionId: string, dto: CreateAnimalDto) {
    // 1) Resolver el código de la especie (prefijo del código legible)
    const [especie] = await this.db
      .select({ codigo: especies.codigo })
      .from(especies)
      .where(eq(especies.id, dto.especieId))
      .limit(1);
    if (!especie) {
      throw new BadRequestException('La especie indicada no existe');
    }

    // 2) Validar microchip si viene
    if (dto.microchip && !validarMicrochipISO(dto.microchip)) {
      throw new BadRequestException('El microchip no cumple el formato ISO (15 dígitos)');
    }

    // 2·bis) Microchip único: evita cargar dos veces el mismo animal.
    if (dto.microchip) {
      const [dup] = await this.db
        .select({ id: animales.id })
        .from(animales)
        .where(and(eq(animales.microchip, dto.microchip), isNull(animales.deletedAt)))
        .limit(1);
      if (dup) {
        throw new ConflictException('Ya existe un animal con ese microchip');
      }
    }

    // 2b) Si se asocia un dueño, verificar que sea de la misma organización
    if (dto.personaId) {
      const [dueno] = await this.db
        .select({ id: personas.id })
        .from(personas)
        .where(
          and(
            eq(personas.id, dto.personaId),
            eq(personas.organizacionId, organizacionId),
          ),
        )
        .limit(1);
      if (!dueno) {
        throw new BadRequestException('El dueño indicado no existe en esta organización');
      }
    }

    // 3) Obtener el próximo número de la secuencia y generar el código legible
    const seqRes = await this.db.execute(
      sql`SELECT nextval('core.animales_codigo_seq') AS n`,
    );
    const secuencia = Number((seqRes.rows[0] as { n: string }).n);
    const codigoLegible = generarCodigoLegible(especie.codigo, secuencia);

    // 4) Insertar (siempre dentro de la organización activa)
    const [animal] = await this.db
      .insert(animales)
      .values({
        organizacionId,
        especieId: dto.especieId,
        personaId: dto.personaId,
        nombre: dto.nombre,
        sexo: dto.sexo,
        fechaNacimiento: dto.fechaNacimiento,
        fechaNacEstimada: dto.fechaNacEstimada ?? false,
        fotoUrl: dto.fotoUrl,
        microchip: dto.microchip,
        codigoLegible,
        datosEspecificos: dto.datosEspecificos ?? {},
      })
      .returning();

    return animal;
  }

  /** Lista los pacientes de la organización activa. */
  listar(organizacionId: string) {
    return this.db
      .select()
      .from(animales)
      .where(eq(animales.organizacionId, organizacionId));
  }

  /** Obtiene un paciente, garantizando que pertenezca a la organización activa. */
  async obtener(organizacionId: string, id: string) {
    const [animal] = await this.db
      .select()
      .from(animales)
      .where(and(eq(animales.id, id), eq(animales.organizacionId, organizacionId)))
      .limit(1);
    if (!animal) throw new NotFoundException('Paciente no encontrado');
    return animal;
  }

  /** Actualiza los datos de un paciente de la organización activa. */
  async actualizar(
    organizacionId: string,
    id: string,
    dto: UpdateAnimalDto,
  ) {
    await this.obtener(organizacionId, id); // valida pertenencia (NotFound si no existe)

    if (dto.especieId) {
      const [especie] = await this.db
        .select({ id: especies.id })
        .from(especies)
        .where(eq(especies.id, dto.especieId))
        .limit(1);
      if (!especie) throw new BadRequestException('La especie indicada no existe');
    }
    if (dto.microchip && !validarMicrochipISO(dto.microchip)) {
      throw new BadRequestException('El microchip no cumple el formato ISO (15 dígitos)');
    }
    if (dto.personaId) {
      const [dueno] = await this.db
        .select({ id: personas.id })
        .from(personas)
        .where(
          and(eq(personas.id, dto.personaId), eq(personas.organizacionId, organizacionId)),
        )
        .limit(1);
      if (!dueno) {
        throw new BadRequestException('El dueño indicado no existe en esta organización');
      }
    }

    const [animal] = await this.db
      .update(animales)
      .set({
        ...(dto.nombre !== undefined && { nombre: dto.nombre }),
        ...(dto.especieId !== undefined && { especieId: dto.especieId }),
        ...(dto.personaId !== undefined && { personaId: dto.personaId }),
        ...(dto.sexo !== undefined && { sexo: dto.sexo }),
        ...(dto.fechaNacimiento !== undefined && { fechaNacimiento: dto.fechaNacimiento }),
        ...(dto.fechaNacEstimada !== undefined && { fechaNacEstimada: dto.fechaNacEstimada }),
        ...(dto.fotoUrl !== undefined && { fotoUrl: dto.fotoUrl }),
        ...(dto.microchip !== undefined && { microchip: dto.microchip }),
        ...(dto.estado !== undefined && { estado: dto.estado }),
        ...(dto.datosEspecificos !== undefined && { datosEspecificos: dto.datosEspecificos }),
        updatedAt: new Date(),
      })
      .where(and(eq(animales.id, id), eq(animales.organizacionId, organizacionId)))
      .returning();

    return animal;
  }
}

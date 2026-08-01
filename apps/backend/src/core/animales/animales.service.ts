import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../database/drizzle.provider';
import { animales, especies, personas } from '../../database/schema';
import { CreateAnimalDto } from './dto/create-animal.dto';
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
}

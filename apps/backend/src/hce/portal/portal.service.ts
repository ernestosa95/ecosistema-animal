import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { and, eq, desc, asc, gte, isNull, inArray } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../database/drizzle.provider';
import {
  animales, especies, personas, vacunaciones, consultas, turnos,
} from '../../database/schema';

// Estados de turno que siguen "vigentes" (para mostrar próximos turnos).
const ESTADOS_VIGENTES = ['solicitado', 'confirmado', 'reprogramado'] as const;

@Injectable()
export class PortalService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /**
   * Resumen público de un animal, identificado por su código legible
   * (el mismo del QR/carnet). El código ES la credencial de acceso: no hay
   * login. La consulta a datos relacionados se acota por la organización
   * dueña del animal, para no cruzar tenants.
   */
  async resumenPorCodigo(codigo: string) {
    const [a] = await this.db
      .select({
        animalId: animales.id,
        organizacionId: animales.organizacionId,
        nombre: animales.nombre,
        sexo: animales.sexo,
        fechaNacimiento: animales.fechaNacimiento,
        codigoLegible: animales.codigoLegible,
        microchip: animales.microchip,
        datosEspecificos: animales.datosEspecificos,
        especieNombre: especies.nombre,
        duenoNombre: personas.nombre,
        duenoApellido: personas.apellido,
      })
      .from(animales)
      .innerJoin(especies, eq(especies.id, animales.especieId))
      .leftJoin(personas, eq(personas.id, animales.personaId))
      .where(and(eq(animales.codigoLegible, codigo), isNull(animales.deletedAt)))
      .limit(1);

    if (!a) throw new NotFoundException('No encontramos ninguna mascota con este código');

    const vacunas = await this.db
      .select({
        producto: vacunaciones.producto,
        fecha: vacunaciones.fecha,
        proximaDosis: vacunaciones.proximaDosis,
      })
      .from(vacunaciones)
      .where(and(
        eq(vacunaciones.animalId, a.animalId),
        eq(vacunaciones.organizacionId, a.organizacionId),
        isNull(vacunaciones.deletedAt),
      ))
      .orderBy(desc(vacunaciones.fecha));

    const historia = await this.db
      .select({
        fecha: consultas.fecha,
        motivo: consultas.motivo,
        diagnostico: consultas.diagnostico,
      })
      .from(consultas)
      .where(and(
        eq(consultas.animalId, a.animalId),
        eq(consultas.organizacionId, a.organizacionId),
        isNull(consultas.deletedAt),
      ))
      .orderBy(desc(consultas.fecha));

    const proximos = await this.db
      .select({
        fechaHora: turnos.fechaHora,
        estado: turnos.estado,
        motivo: turnos.motivo,
      })
      .from(turnos)
      .where(and(
        eq(turnos.animalId, a.animalId),
        eq(turnos.organizacionId, a.organizacionId),
        isNull(turnos.deletedAt),
        gte(turnos.fechaHora, new Date()),
        inArray(turnos.estado, [...ESTADOS_VIGENTES]),
      ))
      .orderBy(asc(turnos.fechaHora));

    const datos = (a.datosEspecificos ?? {}) as Record<string, any>;

    return {
      animal: {
        nombre: a.nombre,
        especie: a.especieNombre ?? '—',
        raza: datos.raza ?? '—',
        sexo: a.sexo ?? '—',
        nacimiento: a.fechaNacimiento ?? null,
        codigoLegible: a.codigoLegible ?? '',
        microchip: a.microchip ?? '',
        dueno: [a.duenoNombre, a.duenoApellido].filter(Boolean).join(' ') || '—',
      },
      vacunas,
      consultas: historia,
      turnos: proximos,
    };
  }
}

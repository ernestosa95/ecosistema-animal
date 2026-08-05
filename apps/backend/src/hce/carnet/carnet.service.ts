import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { renderToBuffer } from '@react-pdf/renderer';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../database/drizzle.provider';
import { animales, especies, personas, vacunaciones } from '../../database/schema';
import { CarnetDocument } from './carnet.document';
import type { CarnetData } from './carnet.types';

const SEXO: Record<string, string> = {
  macho: 'Macho',
  hembra: 'Hembra',
  indefinido: 'Indefinido',
};

/** Formatea una fecha (Date o string) a dd/mm/aaaa (es-AR). */
function fmt(d: Date | string | null | undefined): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

@Injectable()
export class CarnetService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /** Genera el PDF del carnet de un animal y lo devuelve como Buffer. */
  async generarCarnet(animalId: string, organizacionId: string): Promise<Buffer> {
    const data = await this.buildData(animalId, organizacionId);
    return renderToBuffer(CarnetDocument(data) as any);
  }

  /** Arma el CarnetData desde la base, acotado a la organización activa. */
  private async buildData(animalId: string, organizacionId: string): Promise<CarnetData> {
    // 1) Paciente (+ especie)
    const [animal] = await this.db
      .select({
        nombre: animales.nombre,
        sexo: animales.sexo,
        fechaNacimiento: animales.fechaNacimiento,
        codigoLegible: animales.codigoLegible,
        microchip: animales.microchip,
        datosEspecificos: animales.datosEspecificos,
        personaId: animales.personaId,
        especieNombre: especies.nombre,
      })
      .from(animales)
      .leftJoin(especies, eq(animales.especieId, especies.id))
      .where(
        and(
          eq(animales.id, animalId),
          eq(animales.organizacionId, organizacionId),
          isNull(animales.deletedAt),
        ),
      )
      .limit(1);

    if (!animal) {
      throw new NotFoundException('Paciente no encontrado');
    }

    const de = (animal.datosEspecificos ?? {}) as Record<string, any>;

    // 2) Dueño (responsable)
    let dueno = { nombre: '—', dni: '—', telefono: '—', email: '—', domicilio: '—' };
    if (animal.personaId) {
      const [p] = await this.db
        .select()
        .from(personas)
        .where(and(eq(personas.id, animal.personaId), eq(personas.organizacionId, organizacionId)))
        .limit(1);
      if (p) {
        dueno = {
          nombre: `${p.nombre} ${p.apellido}`.trim(),
          dni: p.dni ?? '—',
          telefono: p.celular ?? p.telefono ?? '—',
          email: p.email ?? '—',
          domicilio: (de.domicilio as string) ?? '—', // el schema de personas no tiene domicilio
        };
      }
    }

    // 3) Vacunaciones
    const vac = await this.db
      .select()
      .from(vacunaciones)
      .where(and(eq(vacunaciones.animalId, animalId), isNull(vacunaciones.deletedAt)))
      .orderBy(desc(vacunaciones.fecha));

    return {
      emitidoEl: fmt(new Date()),
      paciente: {
        nombre: animal.nombre,
        especie: animal.especieNombre ?? '—',
        raza: (de.raza as string) ?? '—',
        sexo: animal.sexo ? SEXO[animal.sexo] ?? animal.sexo : '—',
        nacimiento: fmt(animal.fechaNacimiento),
        pelaje: (de.pelaje as string) ?? (de.color as string) ?? '—',
        esterilizado:
          de.esterilizado === true ? 'Sí' : de.esterilizado === false ? 'No' : '—',
        codigoLegible: animal.codigoLegible ?? '—',
        microchip: animal.microchip ?? '',
      },
      dueno,
      vacunaciones: vac.map((v) => ({
        nombre: v.producto ?? 'Vacuna',
        aplicada: fmt(v.fecha),
        proxima: fmt(v.proximaDosis),
      })),
    };
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { renderToBuffer } from '@react-pdf/renderer';
import { CarnetDocument } from './carnet.document';
import type { CarnetData } from './carnet.types';

@Injectable()
export class CarnetService {
  // Si tenés el provider de Drizzle, inyectalo:
  // constructor(@Inject('DRIZZLE') private readonly db: DrizzleDb) {}

  /** Genera el PDF del carnet de un animal y lo devuelve como Buffer. */
  async generarCarnet(animalId: string, organizacionId: string): Promise<Buffer> {
    const data = await this.buildData(animalId, organizacionId);
    return renderToBuffer(CarnetDocument(data) as any);
  }

  /**
   * Arma el contrato CarnetData desde la base.
   * HOY devuelve datos mock para que puedas probar el endpoint sin tocar la DB.
   * Cuando quieras datos reales, reemplazá el bloque MOCK por las consultas Drizzle
   * (dejé el esqueleto comentado con los nombres de tabla del proyecto).
   */
  private async buildData(animalId: string, organizacionId: string): Promise<CarnetData> {
    // ─── MOCK (borrar cuando conectes la DB) ───────────────────────────────
    return {
      emitidoEl: fmt(new Date()),
      paciente: {
        nombre: 'Frida',
        especie: 'Canino',
        raza: 'Labrador Retriever',
        sexo: 'Hembra',
        nacimiento: '14/03/2022',
        pelaje: 'Chocolate',
        esterilizado: 'Sí',
        codigoLegible: 'CAN-032-000123-4',
        microchip: '900032000123456',
      },
      dueno: {
        nombre: 'Lucía Fernández',
        dni: '35.812.447',
        telefono: '+54 9 351 512-3344',
        email: 'lucia.fernandez@mail.com',
        domicilio: 'Bv. San Juan 1240, Córdoba',
      },
      vacunaciones: [
        { nombre: 'Antirrábica', aplicada: '10/04/2026', proxima: '10/04/2027' },
        { nombre: 'Séxtuple (DHPPiL)', aplicada: '02/03/2026', proxima: '02/03/2027' },
        { nombre: 'Tos de las perreras', aplicada: '02/03/2026', proxima: '02/09/2026' },
      ],
    };

    // ─── DATOS REALES (descomentar y ajustar a tu schema) ──────────────────
    // const animal = await this.db.query.animales.findFirst({
    //   where: (a, { and, eq, isNull }) => and(
    //     eq(a.id, animalId),
    //     eq(a.organizacionId, organizacionId),   // aislamiento multi-tenant
    //     isNull(a.deletedAt),
    //   ),
    //   with: { especie: true, dueno: true },      // persona = responsable
    // });
    // if (!animal) throw new NotFoundException('Animal no encontrado');
    //
    // const vacunas = await this.db.query.vacunaciones.findMany({
    //   where: (v, { and, eq, isNull }) => and(eq(v.animalId, animalId), isNull(v.deletedAt)),
    //   orderBy: (v, { desc }) => [desc(v.fechaAplicacion)],
    // });
    //
    // return {
    //   emitidoEl: fmt(new Date()),
    //   paciente: {
    //     nombre: animal.nombre,
    //     especie: animal.especie?.nombre ?? '—',
    //     raza: (animal.datosEspecificos as any)?.raza ?? '—',   // viene del JSONB
    //     sexo: animal.sexo ?? '—',
    //     nacimiento: animal.fechaNacimiento ? fmt(animal.fechaNacimiento) : '—',
    //     pelaje: (animal.datosEspecificos as any)?.pelaje ?? '—',
    //     esterilizado: animal.esterilizado ? 'Sí' : 'No',
    //     codigoLegible: animal.codigoLegible,
    //     microchip: animal.microchip ?? '',
    //   },
    //   dueno: {
    //     nombre: `${animal.dueno.nombre} ${animal.dueno.apellido}`,
    //     dni: animal.dueno.dni ?? '—',
    //     telefono: animal.dueno.telefono ?? '—',
    //     email: animal.dueno.email ?? '—',
    //     domicilio: animal.dueno.domicilio ?? '—',
    //   },
    //   vacunaciones: vacunas.map((v) => ({
    //     nombre: v.nombre,
    //     aplicada: fmt(v.fechaAplicacion),
    //     proxima: v.proximaDosis ? fmt(v.proximaDosis) : '—',
    //   })),
    // };
  }
}

/** Formatea una fecha a dd/mm/aaaa (es-AR). */
function fmt(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

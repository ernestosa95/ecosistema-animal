import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { and, eq, desc, isNull } from 'drizzle-orm';
import { renderToBuffer } from '@react-pdf/renderer';
import * as QRCode from 'qrcode';
import { DRIZZLE, DrizzleDB } from '../../database/drizzle.provider';
import { animales, especies, personas, vacunaciones } from '../../database/schema';
import { CarnetDocument } from './carnet.document';
import type { CarnetData, CarnetVacuna } from './carnet.types';

// URL base del portal del dueño. El QR apunta acá; el código legible impreso
// bajo el QR es el ingreso manual de respaldo.
const PORTAL_URL = process.env.PORTAL_URL ?? 'https://portal.huella.vet';

@Injectable()
export class CarnetService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /** Genera el PDF del carnet de un animal y lo devuelve como Buffer. */
  async generarCarnet(animalId: string, organizacionId: string): Promise<Buffer> {
    const data = await this.buildData(animalId, organizacionId);
    return renderToBuffer(CarnetDocument(data) as any);
  }

  /** Arma el contrato CarnetData desde la base (aislado por organización). */
  private async buildData(
    animalId: string,
    organizacionId: string,
  ): Promise<CarnetData> {
    // 1) Animal + especie + dueño en un solo query (join).
    //    leftJoin en personas: el dueño es opcional a nivel de datos.
    const [row] = await this.db
      .select({
        nombre: animales.nombre,
        sexo: animales.sexo,
        fechaNacimiento: animales.fechaNacimiento,
        codigoLegible: animales.codigoLegible,
        microchip: animales.microchip,
        datosEspecificos: animales.datosEspecificos,
        especieNombre: especies.nombre,
        duenoNombre: personas.nombre,
        duenoApellido: personas.apellido,
        duenoDni: personas.dni,
        duenoCelular: personas.celular,
        duenoTelefono: personas.telefono,
        duenoEmail: personas.email,
      })
      .from(animales)
      .innerJoin(especies, eq(especies.id, animales.especieId))
      .leftJoin(personas, eq(personas.id, animales.personaId))
      .where(
        and(
          eq(animales.id, animalId),
          eq(animales.organizacionId, organizacionId),
          isNull(animales.deletedAt),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundException('Animal no encontrado');

    // 2) Vacunaciones del paciente (más reciente primero).
    const vacs = await this.db
      .select({
        producto: vacunaciones.producto,
        fecha: vacunaciones.fecha,
        proximaDosis: vacunaciones.proximaDosis,
      })
      .from(vacunaciones)
      .where(
        and(
          eq(vacunaciones.animalId, animalId),
          eq(vacunaciones.organizacionId, organizacionId),
          isNull(vacunaciones.deletedAt),
        ),
      )
      .orderBy(desc(vacunaciones.fecha));

    // 3) QR al portal. El código legible es el respaldo manual.
    const codigo = row.codigoLegible ?? '';
    const qrDataUrl = await QRCode.toDataURL(`${PORTAL_URL}/c/${codigo}`, {
      margin: 0,
      width: 220,
    });

    const datos = (row.datosEspecificos ?? {}) as Record<string, any>;

    return {
      emitidoEl: hoy(),
      qrDataUrl,
      paciente: {
        nombre: row.nombre,
        especie: row.especieNombre ?? '—',
        // raza/pelaje viven en datos_especificos (varían por especie).
        raza: datos.raza ?? '—',
        sexo: cap(row.sexo) ?? '—',
        nacimiento: fmtFecha(row.fechaNacimiento),
        pelaje: datos.pelaje ?? datos.color ?? '—',
        esterilizado: esterilizado(datos),
        codigoLegible: codigo || '—',
        microchip: row.microchip ?? 'Sin microchip',
      },
      dueno: {
        nombre: [row.duenoNombre, row.duenoApellido].filter(Boolean).join(' ') || '—',
        dni: row.duenoDni ?? '—',
        telefono: row.duenoCelular ?? row.duenoTelefono ?? '—',
        email: row.duenoEmail ?? '—',
        // core.personas no modela domicilio todavía; cuando se agregue, mapearlo acá.
        domicilio: '—',
      },
      vacunaciones: vacs.map(
        (v): CarnetVacuna => ({
          nombre: v.producto ?? 'Vacuna',
          aplicada: fmtFecha(v.fecha),
          proxima: fmtFecha(v.proximaDosis),
        }),
      ),
    };
  }
}

// ── Helpers de formato ──────────────────────────────────────────────────────
function hoy(): string {
  return new Date().toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// Las columnas `date` de Drizzle llegan como 'YYYY-MM-DD'.
function fmtFecha(v?: string | null): string {
  if (!v) return '—';
  const [y, m, d] = v.split('-');
  return y && m && d ? `${d}/${m}/${y}` : v;
}

function cap(v?: string | null): string | undefined {
  return v ? v.charAt(0).toUpperCase() + v.slice(1) : undefined;
}

// Deriva "esterilizado" desde datos_especificos, tolerando varias convenciones.
function esterilizado(datos: Record<string, any>): string {
  if (datos.esterilizado === true || datos.castrado === true) return 'Sí';
  const er = String(datos.estado_reproductivo ?? '').toLowerCase();
  if (['castrado', 'castrada', 'esterilizado', 'esterilizada'].includes(er)) return 'Sí';
  if (['entero', 'entera'].includes(er)) return 'No';
  return '—';
}

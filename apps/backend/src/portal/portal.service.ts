import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, gte, isNull, notInArray } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../database/drizzle.provider';
import { animales, especies, vacunaciones, turnos, consultas, indicaciones, productos } from '../database/schema';
import { SolicitarTurnoDto } from './dto/solicitar-turno.dto';

interface PersonaCtx {
  id: string;
  organizacionId: string;
  nombre: string;
  apellido: string;
}

const SEXO: Record<string, string> = {
  macho: 'Macho',
  hembra: 'Hembra',
  indefinido: 'Indefinido',
};

const pad = (n: number) => String(n).padStart(2, '0');

/** Parte un timestamp en { fecha: 'YYYY-MM-DD', hora: 'HH:MM' } (hora del servidor). */
function partesFechaHora(d: Date): { fecha: string; hora: string } {
  const x = new Date(d);
  return {
    fecha: `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`,
    hora: `${pad(x.getHours())}:${pad(x.getMinutes())}`,
  };
}

@Injectable()
export class PortalService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /**
   * Resumen del dueño: sus mascotas con identidad, vacunas, próximos turnos y
   * últimas consultas. Todo acotado a la persona y su organización.
   * El shape está pensado para que lo consuma tal cual el mapResumen() del front.
   */
  async resumen(persona: PersonaCtx) {
    const mascotas = await this.db
      .select({
        id: animales.id,
        nombre: animales.nombre,
        sexo: animales.sexo,
        fechaNacimiento: animales.fechaNacimiento,
        codigoLegible: animales.codigoLegible,
        microchip: animales.microchip,
        datosEspecificos: animales.datosEspecificos,
        fotoUrl: animales.fotoUrl,
        especieNombre: especies.nombre,
      })
      .from(animales)
      .leftJoin(especies, eq(animales.especieId, especies.id))
      .where(
        and(
          eq(animales.personaId, persona.id),
          eq(animales.organizacionId, persona.organizacionId),
          isNull(animales.deletedAt),
        ),
      )
      .orderBy(asc(animales.nombre));

    const inicioHoy = new Date();
    inicioHoy.setHours(0, 0, 0, 0);

    const animalesConDatos = await Promise.all(
      mascotas.map(async (a) => {
        const [vac, tur, con, ind] = await Promise.all([
          this.db
            .select()
            .from(vacunaciones)
            .where(and(eq(vacunaciones.animalId, a.id), isNull(vacunaciones.deletedAt)))
            .orderBy(desc(vacunaciones.fecha)),
          this.db
            .select()
            .from(turnos)
            .where(
              and(
                eq(turnos.animalId, a.id),
                isNull(turnos.deletedAt),
                gte(turnos.fechaHora, inicioHoy),
                notInArray(turnos.estado, ['cancelado', 'atendido', 'ausente']),
              ),
            )
            .orderBy(asc(turnos.fechaHora)),
          this.db
            .select()
            .from(consultas)
            .where(and(eq(consultas.animalId, a.id), isNull(consultas.deletedAt)))
            .orderBy(desc(consultas.fecha))
            .limit(5),
          // Plan de tratamiento activo (§8.1 spec UI/UX) — mismo criterio que hce/portal/portal.service.ts.
          this.db
            .select({
              producto: productos.nombre,
              productoNombre: indicaciones.productoNombre,
              origen: indicaciones.origen,
              dosis: indicaciones.dosis,
              frecuencia: indicaciones.frecuencia,
              duracionDias: indicaciones.duracionDias,
              activo: indicaciones.activo,
              desde: indicaciones.createdAt,
            })
            .from(indicaciones)
            .leftJoin(productos, eq(productos.id, indicaciones.productoId))
            .where(and(eq(indicaciones.animalId, a.id), isNull(indicaciones.deletedAt)))
            .orderBy(desc(indicaciones.createdAt)),
        ]);

        return {
          id: a.id,
          nombre: a.nombre,
          especie: { nombre: a.especieNombre ?? '' },
          sexo: a.sexo ? (SEXO[a.sexo] ?? a.sexo) : '',
          fechaNacimiento: a.fechaNacimiento,
          codigoLegible: a.codigoLegible,
          microchip: a.microchip,
          fotoUrl: a.fotoUrl,
          datosEspecificos: a.datosEspecificos, // incluye raza si está cargada
          vacunaciones: vac.map((v) => ({
            nombre: v.producto, // en la base el nombre vive en "producto"
            fechaAplicacion: v.fecha,
            proximaDosis: v.proximaDosis,
          })),
          turnos: tur.map((t) => ({
            ...partesFechaHora(t.fechaHora as Date),
            estado: t.estado,
            motivo: t.motivo ?? '',
          })),
          consultas: con.map((c) => ({
            fecha: c.fecha,
            motivo: c.motivo ?? '',
            diagnostico: c.diagnostico ?? '',
          })),
          tratamientos: ind.map((t) => ({
            farmaco: t.origen === 'stock_interno' ? (t.producto ?? '—') : (t.productoNombre ?? '—'),
            dosis: t.dosis,
            frecuencia: t.frecuencia,
            duracionDias: t.duracionDias,
            activo: t.activo,
            desde: t.desde,
          })),
        };
      }),
    );

    return {
      dueno: { nombre: `${persona.nombre} ${persona.apellido}`.trim() },
      animales: animalesConDatos,
    };
  }

  /**
   * El dueño solicita un turno para una de SUS mascotas. Verifica la propiedad
   * antes de crear. El turno queda 'solicitado' por canal 'portal'.
   */
  async solicitarTurno(persona: PersonaCtx, dto: SolicitarTurnoDto) {
    const [animal] = await this.db
      .select({ id: animales.id })
      .from(animales)
      .where(
        and(
          eq(animales.id, dto.animalId),
          eq(animales.personaId, persona.id),
          eq(animales.organizacionId, persona.organizacionId),
          isNull(animales.deletedAt),
        ),
      )
      .limit(1);

    if (!animal) {
      throw new ForbiddenException('Ese paciente no está asociado a tu cuenta');
    }

    const [turno] = await this.db
      .insert(turnos)
      .values({
        organizacionId: persona.organizacionId,
        animalId: dto.animalId,
        personaId: persona.id,
        fechaHora: new Date(dto.fechaPreferida),
        estado: 'solicitado',
        motivo: dto.motivo,
        canal: 'portal',
      })
      .returning({ id: turnos.id, estado: turnos.estado });

    return { ok: true, turnoId: turno.id, estado: turno.estado };
  }

  /**
   * El dueño sube/reemplaza la foto de perfil de UNA DE SUS mascotas. Misma
   * verificación de propiedad que solicitarTurno() antes de tocar nada.
   * `fotoUrl` ya viene resuelta (absoluta) desde el controller — el service
   * no sabe nada de multer/filesystem.
   */
  async actualizarFoto(persona: PersonaCtx, animalId: string, fotoUrl: string) {
    const [animal] = await this.db
      .select({ id: animales.id })
      .from(animales)
      .where(
        and(
          eq(animales.id, animalId),
          eq(animales.personaId, persona.id),
          eq(animales.organizacionId, persona.organizacionId),
          isNull(animales.deletedAt),
        ),
      )
      .limit(1);

    if (!animal) {
      throw new ForbiddenException('Ese paciente no está asociado a tu cuenta');
    }

    await this.db.update(animales).set({ fotoUrl, updatedAt: new Date() }).where(eq(animales.id, animalId));
    return { ok: true, fotoUrl };
  }
}

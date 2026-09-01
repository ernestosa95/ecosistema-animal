import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, gte, isNull, lte, ne } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../database/drizzle.provider';
import { agendas, agendaBloques, agendaExcepciones, turnos, usuarios } from '../../database/schema';
import { CrearAgendaDto } from './dto/crear-agenda.dto';
import { ActualizarAgendaDto } from './dto/actualizar-agenda.dto';
import { CrearBloqueDto } from './dto/crear-bloque.dto';
import { CrearExcepcionDto } from './dto/crear-excepcion.dto';

interface Ventana {
  inicio: number; // minutos desde medianoche
  fin: number;
}

/** Todo turno que no esté cancelado ocupa su slot. */
const ESTADO_CANCELADO = 'cancelado';

function horaAMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}
function minutosAHora(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
function pad2(n: number): string {
  return String(n).padStart(2, '0');
}
function fechaYHoraLocal(d: Date): { fechaStr: string; horaStr: string; diaSemana: number } {
  return {
    fechaStr: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
    horaStr: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
    diaSemana: d.getDay(),
  };
}

/** Resta la franja `corte` de la ventana `v` — puede partirla en 0, 1 o 2 sub-ventanas. */
function restarVentana(v: Ventana, corte: Ventana): Ventana[] {
  if (corte.fin <= v.inicio || corte.inicio >= v.fin) return [v]; // no se solapan
  const resultado: Ventana[] = [];
  if (corte.inicio > v.inicio) resultado.push({ inicio: v.inicio, fin: corte.inicio });
  if (corte.fin < v.fin) resultado.push({ inicio: corte.fin, fin: v.fin });
  return resultado;
}

/** Trocea un set de ventanas abiertas en slots de `duracion` minutos, ordenados. */
function trocear(ventanas: Ventana[], duracion: number): Ventana[] {
  const slots: Ventana[] = [];
  for (const v of ventanas) {
    for (let t = v.inicio; t + duracion <= v.fin; t += duracion) {
      slots.push({ inicio: t, fin: t + duracion });
    }
  }
  return slots.sort((a, b) => a.inicio - b.inicio);
}

@Injectable()
export class AgendasService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // ── Agendas ──────────────────────────────────────────────────────────────

  async listar(organizacionId: string) {
    const filas = await this.db
      .select({
        id: agendas.id,
        nombre: agendas.nombre,
        usuarioId: agendas.usuarioId,
        usuarioNombre: usuarios.nombre,
        usuarioApellido: usuarios.apellido,
        duracionTurnoMinutos: agendas.duracionTurnoMinutos,
        color: agendas.color,
        activa: agendas.activa,
      })
      .from(agendas)
      .leftJoin(usuarios, eq(agendas.usuarioId, usuarios.id))
      .where(and(eq(agendas.organizacionId, organizacionId), isNull(agendas.deletedAt)))
      .orderBy(asc(agendas.nombre));

    return filas.map(({ usuarioApellido, ...a }) => ({
      ...a,
      usuarioNombre: a.usuarioId ? `${a.usuarioNombre ?? ''} ${usuarioApellido ?? ''}`.trim() : null,
    }));
  }

  async crear(organizacionId: string, dto: CrearAgendaDto) {
    const [agenda] = await this.db
      .insert(agendas)
      .values({
        organizacionId,
        nombre: dto.nombre,
        usuarioId: dto.usuarioId,
        duracionTurnoMinutos: dto.duracionTurnoMinutos ?? 30,
        color: dto.color,
      })
      .returning();
    return agenda;
  }

  async actualizar(organizacionId: string, id: string, dto: ActualizarAgendaDto) {
    await this.verificarAgenda(organizacionId, id);
    const [agenda] = await this.db
      .update(agendas)
      .set({
        ...(dto.nombre !== undefined && { nombre: dto.nombre }),
        ...(dto.usuarioId !== undefined && { usuarioId: dto.usuarioId }),
        ...(dto.duracionTurnoMinutos !== undefined && { duracionTurnoMinutos: dto.duracionTurnoMinutos }),
        ...(dto.color !== undefined && { color: dto.color }),
        ...(dto.activa !== undefined && { activa: dto.activa }),
        updatedAt: new Date(),
      })
      .where(eq(agendas.id, id))
      .returning();
    return agenda;
  }

  async eliminar(organizacionId: string, id: string) {
    await this.verificarAgenda(organizacionId, id);
    await this.db.update(agendas).set({ deletedAt: new Date() }).where(eq(agendas.id, id));
    return { ok: true };
  }

  // ── Bloques recurrentes ─────────────────────────────────────────────────

  async listarBloques(organizacionId: string, agendaId: string) {
    await this.verificarAgenda(organizacionId, agendaId);
    return this.db
      .select()
      .from(agendaBloques)
      .where(and(eq(agendaBloques.agendaId, agendaId), isNull(agendaBloques.deletedAt)))
      .orderBy(asc(agendaBloques.diaSemana), asc(agendaBloques.horaInicio));
  }

  async crearBloque(organizacionId: string, agendaId: string, dto: CrearBloqueDto) {
    await this.verificarAgenda(organizacionId, agendaId);
    if (horaAMinutos(dto.horaInicio) >= horaAMinutos(dto.horaFin)) {
      throw new BadRequestException('horaInicio debe ser anterior a horaFin');
    }
    const [bloque] = await this.db
      .insert(agendaBloques)
      .values({ agendaId, diaSemana: dto.diaSemana, horaInicio: dto.horaInicio, horaFin: dto.horaFin })
      .returning();
    return bloque;
  }

  async eliminarBloque(organizacionId: string, agendaId: string, bloqueId: string) {
    await this.verificarAgenda(organizacionId, agendaId);
    await this.db
      .update(agendaBloques)
      .set({ deletedAt: new Date() })
      .where(and(eq(agendaBloques.id, bloqueId), eq(agendaBloques.agendaId, agendaId)));
    return { ok: true };
  }

  // ── Excepciones puntuales ───────────────────────────────────────────────

  async listarExcepciones(organizacionId: string, agendaId: string) {
    await this.verificarAgenda(organizacionId, agendaId);
    return this.db
      .select()
      .from(agendaExcepciones)
      .where(and(eq(agendaExcepciones.agendaId, agendaId), isNull(agendaExcepciones.deletedAt)))
      .orderBy(asc(agendaExcepciones.fecha));
  }

  async crearExcepcion(organizacionId: string, agendaId: string, dto: CrearExcepcionDto) {
    await this.verificarAgenda(organizacionId, agendaId);
    if (dto.tipo === 'apertura_extra' && (!dto.horaInicio || !dto.horaFin)) {
      throw new BadRequestException('Una apertura extra necesita horaInicio y horaFin');
    }
    if (dto.horaInicio && dto.horaFin && horaAMinutos(dto.horaInicio) >= horaAMinutos(dto.horaFin)) {
      throw new BadRequestException('horaInicio debe ser anterior a horaFin');
    }
    const [excepcion] = await this.db
      .insert(agendaExcepciones)
      .values({
        agendaId,
        fecha: dto.fecha,
        tipo: dto.tipo,
        horaInicio: dto.horaInicio,
        horaFin: dto.horaFin,
        motivo: dto.motivo,
      })
      .returning();
    return excepcion;
  }

  async eliminarExcepcion(organizacionId: string, agendaId: string, excepcionId: string) {
    await this.verificarAgenda(organizacionId, agendaId);
    await this.db
      .update(agendaExcepciones)
      .set({ deletedAt: new Date() })
      .where(and(eq(agendaExcepciones.id, excepcionId), eq(agendaExcepciones.agendaId, agendaId)));
    return { ok: true };
  }

  // ── Slots ────────────────────────────────────────────────────────────────

  /**
   * Horarios posibles de una agenda en una fecha (YYYY-MM-DD): bloques
   * recurrentes de ese día de semana, recortados por excepciones 'cierre' de
   * esa fecha exacta y sumando excepciones 'apertura_extra', troceados en
   * slots de `duracionTurnoMinutos` y cruzados contra los turnos ya tomados
   * (no cancelados) de esa agenda ese día.
   */
  async slotsDisponibles(organizacionId: string, agendaId: string, fechaStr: string, turnoIdAIgnorar?: string) {
    const agenda = await this.verificarAgenda(organizacionId, agendaId);
    const diaSemana = new Date(`${fechaStr}T00:00:00`).getDay();

    const [bloquesDia, excepciones] = await Promise.all([
      this.db
        .select()
        .from(agendaBloques)
        .where(
          and(
            eq(agendaBloques.agendaId, agendaId),
            eq(agendaBloques.diaSemana, diaSemana),
            isNull(agendaBloques.deletedAt),
          ),
        ),
      this.db
        .select()
        .from(agendaExcepciones)
        .where(
          and(
            eq(agendaExcepciones.agendaId, agendaId),
            eq(agendaExcepciones.fecha, fechaStr),
            isNull(agendaExcepciones.deletedAt),
          ),
        ),
    ]);

    let ventanas: Ventana[] = bloquesDia.map((b) => ({
      inicio: horaAMinutos(b.horaInicio),
      fin: horaAMinutos(b.horaFin),
    }));

    for (const e of excepciones) {
      if (e.tipo !== 'cierre') continue;
      if (!e.horaInicio || !e.horaFin) {
        ventanas = []; // cierre de día completo
        break;
      }
      const corte = { inicio: horaAMinutos(e.horaInicio), fin: horaAMinutos(e.horaFin) };
      ventanas = ventanas.flatMap((v) => restarVentana(v, corte));
    }
    for (const e of excepciones) {
      if (e.tipo === 'apertura_extra' && e.horaInicio && e.horaFin) {
        ventanas.push({ inicio: horaAMinutos(e.horaInicio), fin: horaAMinutos(e.horaFin) });
      }
    }

    const slots = trocear(ventanas, agenda.duracionTurnoMinutos);
    if (slots.length === 0) return [];

    const desde = new Date(`${fechaStr}T00:00:00`);
    const hasta = new Date(`${fechaStr}T23:59:59.999`);
    const filtrosTomados = [
      eq(turnos.organizacionId, organizacionId),
      eq(turnos.agendaId, agendaId),
      gte(turnos.fechaHora, desde),
      lte(turnos.fechaHora, hasta),
      ne(turnos.estado, ESTADO_CANCELADO),
      isNull(turnos.deletedAt),
    ];
    if (turnoIdAIgnorar) filtrosTomados.push(ne(turnos.id, turnoIdAIgnorar));

    const tomados = await this.db
      .select({ id: turnos.id, fechaHora: turnos.fechaHora })
      .from(turnos)
      .where(and(...filtrosTomados));

    const minutosTomados = new Set(tomados.map((t) => fechaYHoraLocal(t.fechaHora).horaStr));

    return slots.map((s) => {
      const hora = minutosAHora(s.inicio);
      return { hora, disponible: !minutosTomados.has(hora) };
    });
  }

  /**
   * Usado por TurnosService al crear/reprogramar un turno con agenda: valida
   * que la hora pedida sea un slot real de esa agenda y que esté libre.
   * `turnoIdAIgnorar` evita que un turno choque contra sí mismo al
   * reprogramarlo a su propio horario.
   */
  async validarDisponibilidad(
    organizacionId: string,
    agendaId: string,
    fechaHoraISO: string,
    turnoIdAIgnorar?: string,
  ) {
    const { fechaStr, horaStr } = fechaYHoraLocal(new Date(fechaHoraISO));
    const slots = await this.slotsDisponibles(organizacionId, agendaId, fechaStr, turnoIdAIgnorar);
    const slot = slots.find((s) => s.hora === horaStr);
    if (!slot) {
      throw new BadRequestException('El horario elegido no está dentro del horario de atención de esta agenda');
    }
    if (!slot.disponible) {
      throw new BadRequestException('Ese horario ya está ocupado en esta agenda');
    }
  }

  // ── Helper ───────────────────────────────────────────────────────────────

  private async verificarAgenda(organizacionId: string, id: string) {
    const [agenda] = await this.db
      .select()
      .from(agendas)
      .where(and(eq(agendas.id, id), eq(agendas.organizacionId, organizacionId), isNull(agendas.deletedAt)))
      .limit(1);
    if (!agenda) throw new NotFoundException('Agenda no encontrada');
    return agenda;
  }
}

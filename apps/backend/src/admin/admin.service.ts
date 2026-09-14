import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { and, asc, desc, eq, gte, lte, or, sql } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../database/drizzle.provider';
import {
  organizaciones, usuarios, membresias, planes, pagos,
  personas, animales, consultas, vacunaciones, turnos,
  eventosUso,
} from '../database/schema';
import { CrearOrganizacionDto } from './dto/crear-organizacion.dto';
import { AgregarMiembroDto } from './dto/agregar-miembro.dto';
import { RegistrarPagoDto } from './dto/registrar-pago.dto';
import { verificarLimitesRoles } from '../common/verificar-limites-roles';
import { inicioDeMes, proximoVencimiento } from '../common/facturacion.util';
import { MailService } from '../common/mail/mail.service';

type Rol = 'propietario' | 'admin' | 'capataz' | 'veterinario' | 'recepcion';

@Injectable()
export class AdminService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly mail: MailService,
  ) {}

  /** Lista todas las organizaciones de la plataforma. */
  listarOrganizaciones() {
    return this.db
      .select({
        id: organizaciones.id,
        nombre: organizaciones.nombre,
        huellaActiva: organizaciones.huellaActiva,
        troperaActiva: organizaciones.troperaActiva,
        cuit: organizaciones.cuit,
        activo: organizaciones.activo,
        grupoId: organizaciones.grupoId,
        planId: organizaciones.planId,
        accesoHasta: organizaciones.accesoHasta,
        fechaActivacion: organizaciones.fechaActivacion,
        esDemo: organizaciones.esDemo,
        createdAt: organizaciones.createdAt,
      })
      .from(organizaciones)
      .orderBy(asc(organizaciones.nombre));
  }

  /** Gestión de acceso: grupo, plan, vencimiento y fecha de activación. */
  async setAcceso(
    organizacionId: string,
    dto: {
      grupoId?: string | null; planId?: string | null; accesoHasta?: string | null;
      fechaActivacion?: string | null; esDemo?: boolean;
    },
  ) {
    const orgActual = await this.verificarOrg(organizacionId);
    if (dto.planId && dto.planId !== orgActual.planId) {
      const [plan] = await this.db
        .select({ activo: planes.activo })
        .from(planes)
        .where(eq(planes.id, dto.planId))
        .limit(1);
      if (!plan) throw new NotFoundException('Plan no encontrado');
      if (!plan.activo) {
        throw new BadRequestException('Este plan no está disponible para nuevas organizaciones');
      }
    }
    const [org] = await this.db
      .update(organizaciones)
      .set({
        ...(dto.grupoId !== undefined && { grupoId: dto.grupoId }),
        ...(dto.planId !== undefined && { planId: dto.planId }),
        ...(dto.accesoHasta !== undefined && {
          accesoHasta: dto.accesoHasta ? new Date(dto.accesoHasta) : null,
        }),
        ...(dto.fechaActivacion !== undefined && {
          fechaActivacion: dto.fechaActivacion ? new Date(dto.fechaActivacion) : null,
        }),
        ...(dto.esDemo !== undefined && { esDemo: dto.esDemo }),
        updatedAt: new Date(),
      })
      .where(eq(organizaciones.id, organizacionId))
      .returning();
    return org;
  }

  /**
   * Registra un pago de una organización para un período (mes calendario).
   * Uso del super-admin — a diferencia de `OrganizacionService.registrarPagoPendiente()`
   * (self-service, comprobante de transferencia), esto lo carga directamente
   * el super-admin al confirmar un cobro, así que queda `confirmado` de una
   * (mismo usuario que lo carga = quien lo "revisó").
   */
  async registrarPago(organizacionId: string, dto: RegistrarPagoDto, usuarioId?: string) {
    await this.verificarOrg(organizacionId);
    const periodo = inicioDeMes(dto.periodo ? new Date(dto.periodo) : new Date());
    const [pago] = await this.db
      .insert(pagos)
      .values({
        organizacionId,
        periodo: periodo.toISOString().slice(0, 10),
        monto: dto.monto.toString(),
        medioPago: dto.medioPago,
        observaciones: dto.observaciones,
        registradoPor: usuarioId,
        estado: 'confirmado',
        revisadoPor: usuarioId,
        revisadoEn: new Date(),
      })
      .returning();
    return pago;
  }

  /** Historial de pagos de una organización, más recientes primero (incluye pendientes/rechazados). */
  async listarPagos(organizacionId: string) {
    await this.verificarOrg(organizacionId);
    return this.db
      .select()
      .from(pagos)
      .where(eq(pagos.organizacionId, organizacionId))
      .orderBy(desc(pagos.periodo), desc(pagos.fechaPago));
  }

  /** Pagos cargados por organizaciones (comprobante de transferencia) esperando revisión, más antiguos primero. */
  async listarPagosPendientes() {
    return this.db
      .select({
        id: pagos.id,
        organizacionId: pagos.organizacionId,
        organizacionNombre: organizaciones.nombre,
        periodo: pagos.periodo,
        monto: pagos.monto,
        medioPago: pagos.medioPago,
        observaciones: pagos.observaciones,
        comprobanteUrl: pagos.comprobanteUrl,
        createdAt: pagos.createdAt,
      })
      .from(pagos)
      .innerJoin(organizaciones, eq(organizaciones.id, pagos.organizacionId))
      .where(eq(pagos.estado, 'pendiente'))
      .orderBy(asc(pagos.createdAt));
  }

  /** Aprueba o rechaza un pago pendiente cargado por una organización. */
  async revisarPago(pagoId: string, aprobar: boolean, revisorUsuarioId: string, motivoRechazo?: string) {
    const [pago] = await this.db.select().from(pagos).where(eq(pagos.id, pagoId)).limit(1);
    if (!pago) throw new NotFoundException('Pago no encontrado');
    if (pago.estado !== 'pendiente') {
      throw new BadRequestException('Este pago ya fue revisado');
    }
    const [actualizado] = await this.db
      .update(pagos)
      .set({
        estado: aprobar ? 'confirmado' : 'rechazado',
        revisadoPor: revisorUsuarioId,
        revisadoEn: new Date(),
        motivoRechazo: aprobar ? null : (motivoRechazo ?? null),
      })
      .where(eq(pagos.id, pagoId))
      .returning();
    return actualizado;
  }

  /**
   * Manda por email un recordatorio de pago a los propietarios/admins
   * activos de una organización — hoy se dispara a mano desde el botón
   * "Enviar recordatorio" de Home (super-admin decide cuándo). Reusa el
   * mismo cálculo de vencimiento que `resumenPagos()`; queda como un método
   * de servicio aparte a propósito, para que un futuro job automático
   * (todavía no existe ningún scheduler en el backend) pueda llamarlo igual
   * sin duplicar la lógica del mail.
   */
  async enviarRecordatorioPago(organizacionId: string): Promise<{ ok: true; enviados: number }> {
    const [org] = await this.db
      .select({
        nombre: organizaciones.nombre,
        fechaActivacion: organizaciones.fechaActivacion,
        createdAt: organizaciones.createdAt,
      })
      .from(organizaciones)
      .where(eq(organizaciones.id, organizacionId))
      .limit(1);
    if (!org) throw new NotFoundException('Organización no encontrada');

    const destinatarios = await this.db
      .select({ email: usuarios.email, nombre: usuarios.nombre })
      .from(membresias)
      .innerJoin(usuarios, eq(membresias.usuarioId, usuarios.id))
      .where(
        and(
          eq(membresias.organizacionId, organizacionId),
          eq(membresias.activo, true),
          or(
            sql`'propietario' = ANY(${membresias.roles})`,
            sql`'admin' = ANY(${membresias.roles})`,
          ),
        ),
      );
    if (destinatarios.length === 0) {
      throw new BadRequestException('Esta organización no tiene propietario/admin activo a quien avisar');
    }

    const hoy = new Date();
    const activacion = org.fechaActivacion ?? org.createdAt;
    const vencimiento = proximoVencimiento(activacion, hoy).toLocaleDateString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC',
    });
    for (const d of destinatarios) {
      await this.mail.enviar(
        d.email,
        `Recordatorio de pago — ${org.nombre}`,
        `<p>Hola${d.nombre ? ` ${d.nombre}` : ''},</p>
         <p>Te escribimos para recordarte el próximo vencimiento del plan de <b>${org.nombre}</b>: <b>${vencimiento}</b>.</p>
         <p>Podés registrar el pago (por transferencia, con el comprobante) desde "Mi plan" dentro del sistema.</p>`,
      );
    }
    return { ok: true, enviados: destinatarios.length };
  }

  /**
   * Estado de pago y facturación de cada organización, para la pantalla de
   * Home de /admin: próximo vencimiento (a partir de fechaActivacion, con
   * createdAt como fallback si todavía no se cargó) y si ya hay un pago
   * registrado para el mes calendario en curso.
   */
  async resumenPagos() {
    const hoy = new Date();
    const inicioMesActual = inicioDeMes(hoy).toISOString().slice(0, 10);
    const [orgs, pagosDelMes] = await Promise.all([
      this.db
        .select({
          id: organizaciones.id,
          nombre: organizaciones.nombre,
          activo: organizaciones.activo,
          fechaActivacion: organizaciones.fechaActivacion,
          createdAt: organizaciones.createdAt,
          accesoHasta: organizaciones.accesoHasta,
        })
        .from(organizaciones)
        .orderBy(asc(organizaciones.nombre)),
      this.db
        .select({ organizacionId: pagos.organizacionId, monto: pagos.monto, fechaPago: pagos.fechaPago })
        .from(pagos)
        .where(and(eq(pagos.periodo, inicioMesActual), eq(pagos.estado, 'confirmado'))),
    ]);
    const pagadoPorOrg = new Map(pagosDelMes.map((p) => [p.organizacionId, p]));
    return orgs.map((org) => {
      const activacion = org.fechaActivacion ?? org.createdAt;
      const pago = pagadoPorOrg.get(org.id);
      return {
        id: org.id,
        nombre: org.nombre,
        activo: org.activo,
        fechaActivacion: org.fechaActivacion,
        proximoVencimiento: proximoVencimiento(activacion, hoy),
        pagoEsteMes: !!pago,
        montoUltimoPago: pago?.monto ?? null,
        fechaUltimoPago: pago?.fechaPago ?? null,
      };
    });
  }

  /**
   * Analítica de uso (a pedido del super-admin): pantallas y acciones más
   * usadas + qué organizaciones generan más eventos, en un rango de fechas
   * (default: últimos 30 días, mismo criterio que
   * `CajasService.estadisticas()`). Se agrega en la consulta (3 `groupBy`
   * separados) en vez de traer todo el ledger crudo — a este volumen no
   * hace falta más que eso.
   */
  async resumenAnalitica(desde?: string, hasta?: string) {
    const rangoDesde = desde ? new Date(desde) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const rangoHasta = hasta ? new Date(hasta) : new Date();
    const enRango = and(gte(eventosUso.createdAt, rangoDesde), lte(eventosUso.createdAt, rangoHasta));

    const [pantallas, acciones, porOrganizacion, total] = await Promise.all([
      this.db
        .select({ nombre: eventosUso.nombre, cantidad: sql<number>`count(*)::int` })
        .from(eventosUso)
        .where(and(enRango, eq(eventosUso.tipo, 'pantalla')))
        .groupBy(eventosUso.nombre)
        .orderBy(desc(sql`count(*)`))
        .limit(15),
      this.db
        .select({ nombre: eventosUso.nombre, cantidad: sql<number>`count(*)::int` })
        .from(eventosUso)
        .where(and(enRango, eq(eventosUso.tipo, 'accion')))
        .groupBy(eventosUso.nombre)
        .orderBy(desc(sql`count(*)`))
        .limit(15),
      this.db
        .select({
          organizacionId: eventosUso.organizacionId,
          organizacionNombre: organizaciones.nombre,
          cantidad: sql<number>`count(*)::int`,
        })
        .from(eventosUso)
        .innerJoin(organizaciones, eq(organizaciones.id, eventosUso.organizacionId))
        .where(enRango)
        .groupBy(eventosUso.organizacionId, organizaciones.nombre)
        .orderBy(desc(sql`count(*)`))
        .limit(10),
      this.db
        .select({ cantidad: sql<number>`count(*)::int` })
        .from(eventosUso)
        .where(enRango),
    ]);

    return { pantallas, acciones, porOrganizacion, total: total[0]?.cantidad ?? 0 };
  }

  /** Ganancias acumuladas por período (mes calendario) más el total histórico. Sólo pagos confirmados. */
  async gananciasPorPeriodo() {
    const filas = await this.db
      .select({ periodo: pagos.periodo, total: sql<string>`sum(${pagos.monto})` })
      .from(pagos)
      .where(eq(pagos.estado, 'confirmado'))
      .groupBy(pagos.periodo)
      .orderBy(desc(pagos.periodo));
    const totalAcumulado = filas.reduce((acc, f) => acc + Number(f.total), 0);
    return { porPeriodo: filas, totalAcumulado };
  }

  /** Crea una organización vacía. Fecha de activación = ahora, igual criterio que aprobar() en solicitudes/. */
  async crearOrganizacion(dto: CrearOrganizacionDto) {
    const [org] = await this.db
      .insert(organizaciones)
      .values({
        nombre: dto.nombre,
        huellaActiva: dto.huellaActiva ?? true,
        troperaActiva: dto.troperaActiva ?? false,
        cuit: dto.cuit,
        fechaActivacion: new Date(),
      })
      .returning();
    return org;
  }

  /** Activa o desactiva por separado Huella y/o Tropera para una organización. */
  async setSoluciones(organizacionId: string, dto: { huellaActiva: boolean; troperaActiva: boolean }) {
    await this.verificarOrg(organizacionId);
    const [org] = await this.db
      .update(organizaciones)
      .set({ huellaActiva: dto.huellaActiva, troperaActiva: dto.troperaActiva, updatedAt: new Date() })
      .where(eq(organizaciones.id, organizacionId))
      .returning();
    return org;
  }

  /** Activa o desactiva una organización (reversible; los datos quedan intactos). */
  async setActivo(organizacionId: string, activo: boolean) {
    await this.verificarOrg(organizacionId);
    await this.db
      .update(organizaciones)
      .set({ activo, updatedAt: new Date() })
      .where(eq(organizaciones.id, organizacionId));
    return { ok: true, activo };
  }

  /** Elimina la organización y TODOS sus registros (cascada por claves foráneas). */
  async eliminar(organizacionId: string) {
    await this.verificarOrg(organizacionId);
    await this.db.delete(organizaciones).where(eq(organizaciones.id, organizacionId));
    return { ok: true };
  }

  /** Exporta todos los datos de una organización (para portabilidad/respaldo). */
  async exportar(organizacionId: string) {
    const [org] = await this.db
      .select()
      .from(organizaciones)
      .where(eq(organizaciones.id, organizacionId))
      .limit(1);
    if (!org) throw new NotFoundException('Organización no encontrada');

    const [personasR, animalesR, consultasR, vacunacionesR, turnosR, miembrosR] =
      await Promise.all([
        this.db.select().from(personas).where(eq(personas.organizacionId, organizacionId)),
        this.db.select().from(animales).where(eq(animales.organizacionId, organizacionId)),
        this.db.select().from(consultas).where(eq(consultas.organizacionId, organizacionId)),
        this.db.select().from(vacunaciones).where(eq(vacunaciones.organizacionId, organizacionId)),
        this.db.select().from(turnos).where(eq(turnos.organizacionId, organizacionId)),
        this.db
          .select({
            email: usuarios.email,
            nombre: usuarios.nombre,
            apellido: usuarios.apellido,
            roles: membresias.roles,
            activo: membresias.activo,
          })
          .from(membresias)
          .innerJoin(usuarios, eq(membresias.usuarioId, usuarios.id))
          .where(eq(membresias.organizacionId, organizacionId)),
      ]);

    return {
      exportadoEl: new Date().toISOString(),
      organizacion: org,
      miembros: miembrosR,
      personas: personasR,
      animales: animalesR,
      consultas: consultasR,
      vacunaciones: vacunacionesR,
      turnos: turnosR,
    };
  }

  /** Miembros (usuarios + rol) de una organización. */
  async miembros(organizacionId: string) {
    await this.verificarOrg(organizacionId);
    return this.db
      .select({
        membresiaId: membresias.id,
        roles: membresias.roles,
        activo: membresias.activo,
        usuarioId: usuarios.id,
        email: usuarios.email,
        nombre: usuarios.nombre,
        apellido: usuarios.apellido,
      })
      .from(membresias)
      .innerJoin(usuarios, eq(membresias.usuarioId, usuarios.id))
      .where(eq(membresias.organizacionId, organizacionId));
  }

  async agregarMiembro(organizacionId: string, dto: AgregarMiembroDto) {
    await this.verificarOrg(organizacionId);
    await verificarLimitesRoles(this.db, organizacionId, null, dto.roles);

    let [usuario] = await this.db
      .select()
      .from(usuarios)
      .where(eq(usuarios.email, dto.email))
      .limit(1);

    let creado = false;
    if (!usuario) {
      if (!dto.password) {
        throw new BadRequestException('El usuario es nuevo: hay que definir una contraseña');
      }
      const passwordHash = await bcrypt.hash(dto.password, 10);
      [usuario] = await this.db
        .insert(usuarios)
        .values({
          email: dto.email,
          passwordHash,
          nombre: dto.nombre,
          apellido: dto.apellido,
        })
        .returning();
      creado = true;
    }

    const [ya] = await this.db
      .select({ id: membresias.id })
      .from(membresias)
      .where(
        and(
          eq(membresias.usuarioId, usuario.id),
          eq(membresias.organizacionId, organizacionId),
        ),
      )
      .limit(1);
    if (ya) {
      throw new ConflictException('El usuario ya es miembro de esta organización');
    }

    await this.db.insert(membresias).values({
      usuarioId: usuario.id,
      organizacionId,
      roles: dto.roles as Rol[],
    });

    return {
      creado,
      roles: dto.roles,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
      },
    };
  }

  /** Quita (elimina) un miembro de la organización. */
  async quitarMiembro(organizacionId: string, membresiaId: string) {
    const m = await this.obtenerMembresia(organizacionId, membresiaId);
    await this.protegerUltimoPropietario(organizacionId, m);
    await this.db.delete(membresias).where(eq(membresias.id, membresiaId));
    return { ok: true };
  }

  /** Activa o desactiva un miembro (desactivado = no puede operar). */
  async setMiembroActivo(organizacionId: string, membresiaId: string, activo: boolean) {
    const m = await this.obtenerMembresia(organizacionId, membresiaId);
    if (!activo) await this.protegerUltimoPropietario(organizacionId, m);
    // Reactivar también puede chocar con el cupo del plan (ej. se sumaron
    // otros miembros del mismo rol mientras este estaba inactivo).
    else await verificarLimitesRoles(this.db, organizacionId, membresiaId, m.roles);
    await this.db
      .update(membresias)
      .set({ activo, updatedAt: new Date() })
      .where(eq(membresias.id, membresiaId));
    return { ok: true, activo };
  }

  // ── Helpers ───────────────────────────────────────────────────────────
  private async verificarOrg(organizacionId: string) {
    const [org] = await this.db
      .select({ id: organizaciones.id, planId: organizaciones.planId })
      .from(organizaciones)
      .where(eq(organizaciones.id, organizacionId))
      .limit(1);
    if (!org) throw new NotFoundException('Organización no encontrada');
    return org;
  }

  private async obtenerMembresia(organizacionId: string, membresiaId: string) {
    const [m] = await this.db
      .select({ id: membresias.id, roles: membresias.roles, activo: membresias.activo })
      .from(membresias)
      .where(and(eq(membresias.id, membresiaId), eq(membresias.organizacionId, organizacionId)))
      .limit(1);
    if (!m) throw new NotFoundException('Miembro no encontrado');
    return m;
  }

  /** Evita dejar la organización sin ningún propietario activo. */
  private async protegerUltimoPropietario(
    organizacionId: string,
    m: { roles: string[]; activo: boolean },
  ) {
    if (!m.roles.includes('propietario') || !m.activo) return;
    const propietariosActivos = await this.db
      .select({ id: membresias.id })
      .from(membresias)
      .where(
        and(
          eq(membresias.organizacionId, organizacionId),
          sql`'propietario' = ANY(${membresias.roles})`,
          eq(membresias.activo, true),
        ),
      );
    if (propietariosActivos.length <= 1) {
      throw new BadRequestException('No podés dejar la organización sin propietario activo');
    }
  }

  /** Actualiza los roles apilados de una membresía (reemplaza el conjunto completo). */
  async setRoles(organizacionId: string, membresiaId: string, roles: Rol[]) {
    const m = await this.obtenerMembresia(organizacionId, membresiaId);
    // Si se le está quitando "propietario", aplica la misma protección que
    // desactivar/quitar: no puede quedar la organización sin propietario activo.
    if (m.roles.includes('propietario') && !roles.includes('propietario')) {
      await this.protegerUltimoPropietario(organizacionId, m);
    }
    await verificarLimitesRoles(this.db, organizacionId, membresiaId, roles);
    await this.db
      .update(membresias)
      .set({ roles, updatedAt: new Date() })
      .where(eq(membresias.id, membresiaId));
    return { ok: true, roles };
  }
}

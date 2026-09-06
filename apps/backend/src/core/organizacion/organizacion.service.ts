import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../database/drizzle.provider';
import { organizaciones, planes, pagos } from '../../database/schema';
import { inicioDeMes, proximoVencimiento } from '../../common/facturacion.util';
import { RegistrarPagoOrgDto } from './dto/registrar-pago-org.dto';

/**
 * Self-service para que el propietario/admin de la propia organización vea
 * su plan y estado de pago sin pasar por /admin (que es del super-admin de
 * plataforma) — y pueda cargar un pago con comprobante de transferencia,
 * que queda `pendiente` hasta que el super-admin lo revisa
 * (`AdminService.revisarPago()`).
 */
@Injectable()
export class OrganizacionService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /** Plan actual + próximo vencimiento + si ya hay un pago confirmado este mes / uno pendiente de revisión. */
  async miPlan(organizacionId: string) {
    const [org] = await this.db
      .select({
        nombre: organizaciones.nombre,
        logoUrl: organizaciones.logoUrl,
        activo: organizaciones.activo,
        planId: organizaciones.planId,
        fechaActivacion: organizaciones.fechaActivacion,
        createdAt: organizaciones.createdAt,
        accesoHasta: organizaciones.accesoHasta,
      })
      .from(organizaciones)
      .where(eq(organizaciones.id, organizacionId))
      .limit(1);
    if (!org) throw new NotFoundException('Organización no encontrada');

    let plan: {
      id: string; nombre: string; descripcion: string | null;
      precioMensual: string | null; precioAnual: string | null;
      limitesRoles: Record<string, number>;
    } | null = null;
    if (org.planId) {
      const [p] = await this.db
        .select({
          id: planes.id, nombre: planes.nombre, descripcion: planes.descripcion,
          precioMensual: planes.precioMensual, precioAnual: planes.precioAnual,
          limitesRoles: planes.limitesRoles,
        })
        .from(planes)
        .where(eq(planes.id, org.planId))
        .limit(1);
      plan = p ? { ...p, limitesRoles: (p.limitesRoles ?? {}) as Record<string, number> } : null;
    }

    const hoy = new Date();
    const activacion = org.fechaActivacion ?? org.createdAt;
    const inicioMesActual = inicioDeMes(hoy).toISOString().slice(0, 10);

    const [pagoDelMes] = await this.db
      .select({ id: pagos.id })
      .from(pagos)
      .where(
        and(
          eq(pagos.organizacionId, organizacionId),
          eq(pagos.periodo, inicioMesActual),
          eq(pagos.estado, 'confirmado'),
        ),
      )
      .limit(1);

    const [pagoPendiente] = await this.db
      .select({ id: pagos.id })
      .from(pagos)
      .where(and(eq(pagos.organizacionId, organizacionId), eq(pagos.estado, 'pendiente')))
      .orderBy(desc(pagos.createdAt))
      .limit(1);

    return {
      nombre: org.nombre,
      logoUrl: org.logoUrl,
      activo: org.activo,
      plan,
      fechaActivacion: org.fechaActivacion,
      proximoVencimiento: proximoVencimiento(activacion, hoy),
      accesoHasta: org.accesoHasta,
      pagoEsteMes: !!pagoDelMes,
      tienePagoPendiente: !!pagoPendiente,
    };
  }

  /** Historial de pagos de la propia organización, más recientes primero (incluye pendientes/rechazados). */
  async listarPagos(organizacionId: string) {
    return this.db
      .select()
      .from(pagos)
      .where(eq(pagos.organizacionId, organizacionId))
      .orderBy(desc(pagos.createdAt));
  }

  /**
   * Carga un pago con comprobante de transferencia — nace `pendiente`, no
   * cuenta como "pagó este mes" hasta que el super-admin lo aprueba
   * (`AdminService.revisarPago()`). `medioPago` queda fijo en
   * 'transferencia': es la única vía self-service por ahora. Rechaza si ya
   * hay un pago pendiente sin revisar (la UI de "Mi plan" ya oculta el
   * formulario en ese caso, esto es el resguardo del lado del servidor —
   * dos pestañas o un doble click no deberían poder crear dos pendientes).
   */
  async registrarPagoPendiente(
    organizacionId: string,
    dto: RegistrarPagoOrgDto,
    usuarioId: string,
    comprobanteUrl: string,
  ) {
    const [yaPendiente] = await this.db
      .select({ id: pagos.id })
      .from(pagos)
      .where(and(eq(pagos.organizacionId, organizacionId), eq(pagos.estado, 'pendiente')))
      .limit(1);
    if (yaPendiente) {
      throw new BadRequestException('Ya hay un pago pendiente de revisión — esperá a que se resuelva antes de cargar otro');
    }

    const periodo = inicioDeMes(dto.periodo ? new Date(dto.periodo) : new Date());
    const [pago] = await this.db
      .insert(pagos)
      .values({
        organizacionId,
        periodo: periodo.toISOString().slice(0, 10),
        monto: dto.monto.toString(),
        medioPago: 'transferencia',
        observaciones: dto.observaciones,
        registradoPor: usuarioId,
        estado: 'pendiente',
        comprobanteUrl,
      })
      .returning();
    return pago;
  }

  /**
   * Reemplaza el logo de la organización — se muestra desde acá en todo lo
   * que llega al dueño de una mascota: carnet/ficha PDF (`hce/carnet/`) y
   * ambos portales del dueño (`hce/portal/` por código, `portal/` por
   * magic-link). `logoUrl` ya viene resuelta (absoluta) desde el controller.
   */
  async actualizarLogo(organizacionId: string, logoUrl: string) {
    const [org] = await this.db
      .update(organizaciones)
      .set({ logoUrl, updatedAt: new Date() })
      .where(eq(organizaciones.id, organizacionId))
      .returning({ id: organizaciones.id, logoUrl: organizaciones.logoUrl });
    if (!org) throw new NotFoundException('Organización no encontrada');
    return org;
  }
}

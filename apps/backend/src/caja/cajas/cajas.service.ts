import { BadRequestException, Injectable, Inject, NotFoundException } from '@nestjs/common';
import { and, desc, eq, isNull, sum } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../database/drizzle.provider';
import { cajas, cobros, egresos } from '../../database/schema';
import { AbrirCajaDto } from './dto/abrir-caja.dto';
import { CerrarCajaDto } from './dto/cerrar-caja.dto';
import { AuditarCajaDto } from './dto/auditar-caja.dto';

@Injectable()
export class CajasService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /** La caja abierta de la organización, si hay una — null si está todo cerrado. */
  async actual(organizacionId: string) {
    const [caja] = await this.db
      .select()
      .from(cajas)
      .where(and(eq(cajas.organizacionId, organizacionId), eq(cajas.estado, 'abierta')))
      .limit(1);
    return caja ?? null;
  }

  /** Abre la caja del día. Rechaza si ya hay una abierta — una sola caja por organización a la vez. */
  async abrir(organizacionId: string, usuarioId: string, dto: AbrirCajaDto) {
    const abierta = await this.actual(organizacionId);
    if (abierta) {
      throw new BadRequestException('Ya hay una caja abierta. Cerrala antes de abrir una nueva.');
    }
    const [caja] = await this.db
      .insert(cajas)
      .values({
        organizacionId,
        abiertaPorUsuarioId: usuarioId,
        montoInicial: (dto.montoInicial ?? 0).toString(),
      })
      .returning();
    return caja;
  }

  private async obtener(organizacionId: string, id: string) {
    const [caja] = await this.db
      .select()
      .from(cajas)
      .where(and(eq(cajas.id, id), eq(cajas.organizacionId, organizacionId)))
      .limit(1);
    if (!caja) throw new NotFoundException('Caja no encontrada');
    return caja;
  }

  /**
   * Cierra la caja: calcula lo esperado (inicial + cobros − egresos) y lo
   * compara contra el arqueo declarado. Sin diferencia, el cierre queda
   * `aceptado` automáticamente; con diferencia, queda `pendiente` de
   * auditoría (§4.1) — "alerta silenciosa hacia la gerencia" del spec.
   */
  async cerrar(organizacionId: string, usuarioId: string, id: string, dto: CerrarCajaDto) {
    const caja = await this.obtener(organizacionId, id);
    if (caja.estado !== 'abierta') {
      throw new BadRequestException('Esta caja ya está cerrada');
    }

    const [{ total: totalCobros }] = await this.db
      .select({ total: sum(cobros.monto) })
      .from(cobros)
      .where(eq(cobros.cajaId, id));
    const [{ total: totalEgresos }] = await this.db
      .select({ total: sum(egresos.monto) })
      .from(egresos)
      .where(eq(egresos.cajaId, id));

    const calculado = Number(caja.montoInicial) + Number(totalCobros ?? 0) - Number(totalEgresos ?? 0);
    const diferencia = dto.montoDeclarado - calculado;

    const [actualizada] = await this.db
      .update(cajas)
      .set({
        estado: 'cerrada',
        montoDeclarado: dto.montoDeclarado.toString(),
        montoCalculado: calculado.toString(),
        diferencia: diferencia.toString(),
        observacionesCierre: dto.observaciones,
        estadoAuditoria: diferencia === 0 ? 'aceptado' : 'pendiente',
        cerradaPorUsuarioId: usuarioId,
        cerradaEn: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(cajas.id, id))
      .returning();
    return actualizada;
  }

  /** Historial de cajas cerradas — bandeja de auditoría (§4.1) cuando se filtra por estadoAuditoria. */
  listar(organizacionId: string, estadoAuditoria?: string) {
    const condiciones = [eq(cajas.organizacionId, organizacionId), isNull(cajas.deletedAt)];
    if (estadoAuditoria) {
      condiciones.push(
        eq(cajas.estadoAuditoria, estadoAuditoria as NonNullable<(typeof cajas.$inferSelect)['estadoAuditoria']>),
      );
    }
    return this.db
      .select()
      .from(cajas)
      .where(and(...condiciones))
      .orderBy(desc(cajas.abiertaEn));
  }

  /** Acción del propietario/gerente sobre un cierre con diferencia (§4.1). */
  async auditar(organizacionId: string, usuarioId: string, id: string, dto: AuditarCajaDto) {
    const caja = await this.obtener(organizacionId, id);
    if (caja.estado !== 'cerrada') {
      throw new BadRequestException('Sólo se puede auditar una caja ya cerrada');
    }
    if (dto.estadoAuditoria !== 'aceptado' && !dto.observaciones) {
      throw new BadRequestException('Se requiere una observación para "en revisión" o "rechazado"');
    }
    const [actualizada] = await this.db
      .update(cajas)
      .set({
        estadoAuditoria: dto.estadoAuditoria,
        observacionesAuditoria: dto.observaciones,
        auditadaPorUsuarioId: usuarioId,
        auditadaEn: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(cajas.id, id))
      .returning();
    return actualizada;
  }
}

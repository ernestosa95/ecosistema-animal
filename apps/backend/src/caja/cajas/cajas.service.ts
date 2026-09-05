import { BadRequestException, Injectable, Inject, NotFoundException } from '@nestjs/common';
import { and, desc, eq, gte, isNull, lte, sum } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../database/drizzle.provider';
import { cajas, cobros, egresos } from '../../database/schema';
import { AbrirCajaDto } from './dto/abrir-caja.dto';
import { CerrarCajaDto } from './dto/cerrar-caja.dto';
import { AuditarCajaDto } from './dto/auditar-caja.dto';

/** `true` si `fecha` no cae en el mismo día calendario (UTC) que `hoy`. */
function esDeOtroDia(fecha: Date, hoy: Date): boolean {
  return (
    fecha.getUTCFullYear() !== hoy.getUTCFullYear() ||
    fecha.getUTCMonth() !== hoy.getUTCMonth() ||
    fecha.getUTCDate() !== hoy.getUTCDate()
  );
}

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

  /**
   * Si la caja abierta quedó de un día anterior (el propietario se olvidó de
   * cerrarla), la cierra sola y la deja en revisión — sin bloquear a quien
   * la disparó (vender, cargar un egreso, o simplemente entrar a Caja). No
   * hay arqueo humano en un cierre automático, así que `montoDeclarado`/
   * `diferencia` quedan sin cargar y `estadoAuditoria` es 'pendiente'
   * siempre (no sólo cuando hay diferencia, como en `cerrar()`). Deliberadamente
   * NO vive dentro de `actual()` — así un simple GET no tiene efectos
   * secundarios inesperados en contextos que también llaman a `actual()`
   * pero no deberían disparar un cierre (ninguno hoy, pero conviene que la
   * lectura pura siga siendo pura). Se llama explícitamente antes de crear
   * un cobro, un egreso, o al abrir la pantalla de Caja.
   */
  async normalizarDelDia(organizacionId: string, usuarioId?: string) {
    const abierta = await this.actual(organizacionId);
    if (!abierta || !esDeOtroDia(new Date(abierta.abiertaEn), new Date())) return;

    const [{ total: totalCobros }] = await this.db
      .select({ total: sum(cobros.monto) })
      .from(cobros)
      .where(eq(cobros.cajaId, abierta.id));
    const [{ total: totalEgresos }] = await this.db
      .select({ total: sum(egresos.monto) })
      .from(egresos)
      .where(eq(egresos.cajaId, abierta.id));
    const calculado = Number(abierta.montoInicial) + Number(totalCobros ?? 0) - Number(totalEgresos ?? 0);

    await this.db
      .update(cajas)
      .set({
        estado: 'cerrada',
        montoCalculado: calculado.toString(),
        estadoAuditoria: 'pendiente',
        observacionesCierre: 'Cerrada automáticamente: había quedado abierta de un día anterior, sin arqueo.',
        cerradaPorUsuarioId: usuarioId,
        cerradaEn: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(cajas.id, abierta.id));
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

  /**
   * Totales del período para un análisis rápido: cobros/egresos/neto, cuántas
   * cajas hubo, desglose por método de pago y por día — todo calculado en JS
   * sobre las filas del rango (volumen de una caja chica, no hace falta
   * agregación en SQL). Sin filtro de fechas, mira los últimos 30 días.
   */
  async estadisticas(organizacionId: string, desde?: string, hasta?: string) {
    const rangoDesde = desde ? new Date(desde) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const rangoHasta = hasta ? new Date(hasta) : new Date();

    const [cobrosDelRango, egresosDelRango, cajasDelRango] = await Promise.all([
      this.db
        .select({ monto: cobros.monto, metodoPago: cobros.metodoPago, createdAt: cobros.createdAt })
        .from(cobros)
        .where(and(eq(cobros.organizacionId, organizacionId), gte(cobros.createdAt, rangoDesde), lte(cobros.createdAt, rangoHasta))),
      this.db
        .select({ monto: egresos.monto, createdAt: egresos.createdAt })
        .from(egresos)
        .where(and(eq(egresos.organizacionId, organizacionId), gte(egresos.createdAt, rangoDesde), lte(egresos.createdAt, rangoHasta))),
      this.db
        .select({ id: cajas.id })
        .from(cajas)
        .where(
          and(
            eq(cajas.organizacionId, organizacionId),
            gte(cajas.abiertaEn, rangoDesde),
            lte(cajas.abiertaEn, rangoHasta),
            isNull(cajas.deletedAt),
          ),
        ),
    ]);

    const totalCobros = cobrosDelRango.reduce((acc, c) => acc + Number(c.monto), 0);
    const totalEgresos = egresosDelRango.reduce((acc, e) => acc + Number(e.monto), 0);

    const porMetodoPagoMap = new Map<string, number>();
    for (const c of cobrosDelRango) {
      const clave = c.metodoPago ?? 'sin especificar';
      porMetodoPagoMap.set(clave, (porMetodoPagoMap.get(clave) ?? 0) + Number(c.monto));
    }

    const diaDe = (d: Date) => d.toISOString().slice(0, 10);
    const porDiaMap = new Map<string, { totalCobros: number; totalEgresos: number }>();
    for (const c of cobrosDelRango) {
      const dia = diaDe(new Date(c.createdAt));
      const fila = porDiaMap.get(dia) ?? { totalCobros: 0, totalEgresos: 0 };
      fila.totalCobros += Number(c.monto);
      porDiaMap.set(dia, fila);
    }
    for (const e of egresosDelRango) {
      const dia = diaDe(new Date(e.createdAt));
      const fila = porDiaMap.get(dia) ?? { totalCobros: 0, totalEgresos: 0 };
      fila.totalEgresos += Number(e.monto);
      porDiaMap.set(dia, fila);
    }

    return {
      desde: rangoDesde.toISOString(),
      hasta: rangoHasta.toISOString(),
      totalCobros,
      totalEgresos,
      neto: totalCobros - totalEgresos,
      cantidadCobros: cobrosDelRango.length,
      cantidadCajas: cajasDelRango.length,
      porMetodoPago: [...porMetodoPagoMap.entries()]
        .map(([metodoPago, total]) => ({ metodoPago, total }))
        .sort((a, b) => b.total - a.total),
      porDia: [...porDiaMap.entries()]
        .map(([fecha, v]) => ({ fecha, ...v }))
        .sort((a, b) => a.fecha.localeCompare(b.fecha)),
    };
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

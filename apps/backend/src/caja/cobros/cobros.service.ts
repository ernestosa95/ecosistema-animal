import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { and, desc, eq, gte, isNotNull, lte } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../database/drizzle.provider';
import { cajas, cobros, productos, consultas } from '../../database/schema';
import { CreateCobroDto } from './dto/create-cobro.dto';
import { LiquidarHonorariosDto } from './dto/liquidar-honorarios.dto';
import { CajasService } from '../cajas/cajas.service';

@Injectable()
export class CobrosService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly cajasService: CajasService,
  ) {}

  /**
   * Registra un ingreso. Primero normaliza el día (si quedó una caja abierta
   * de ayer sin cerrar, la cierra sola y la deja en revisión — no bloquea
   * al que está cobrando). Si después de eso no hay ninguna caja abierta, la
   * abre sola (apertura rápida con el primer cobro/venta del día — antes
   * esto rechazaba con "abrí la caja primero" y obligaba a ir a la pestaña
   * Caja a mano). `CajasService.abrir()` es el mismo método que usa el
   * endpoint `POST /caja/cajas`, sólo que acá se llama directo, sin pasar
   * por su `RolesGuard` — quien puede cobrar (propietario/admin/recepción,
   * según el guard de este controller) ya es de por sí quien puede abrir caja.
   */
  async crear(organizacionId: string, usuarioId: string, dto: CreateCobroDto) {
    await this.cajasService.normalizarDelDia(organizacionId, usuarioId);
    const cajaExistente = await this.cajasService.actual(organizacionId);
    const caja = cajaExistente ?? (await this.cajasService.abrir(organizacionId, usuarioId, {}));

    if (dto.productoId) {
      const [producto] = await this.db
        .select({ id: productos.id })
        .from(productos)
        .where(and(eq(productos.id, dto.productoId), eq(productos.organizacionId, organizacionId)))
        .limit(1);
      if (!producto) throw new NotFoundException('El producto no existe en esta organización');
    }

    if (dto.consultaId) {
      const [consulta] = await this.db
        .select({ id: consultas.id })
        .from(consultas)
        .where(and(eq(consultas.id, dto.consultaId), eq(consultas.organizacionId, organizacionId)))
        .limit(1);
      if (!consulta) throw new NotFoundException('La consulta no existe en esta organización');
    }

    const [cobro] = await this.db
      .insert(cobros)
      .values({
        organizacionId,
        cajaId: caja.id,
        usuarioId,
        veterinarioId: dto.veterinarioId,
        concepto: dto.concepto,
        monto: dto.monto.toString(),
        metodoPago: dto.metodoPago,
        productoId: dto.productoId,
        cantidad: dto.cantidad,
        consultaId: dto.consultaId,
      })
      .returning();
    return { ...cobro, cajaAbiertaAhora: !cajaExistente };
  }

  /** Cobros de una caja puntual — para la vista en vivo del mostrador. */
  listarDeCaja(organizacionId: string, cajaId: string) {
    return this.db
      .select()
      .from(cobros)
      .where(and(eq(cobros.organizacionId, organizacionId), eq(cobros.cajaId, cajaId)))
      .orderBy(desc(cobros.createdAt));
  }

  /**
   * Liquidación de honorarios (§4.4): cobros imputados a un profesional en un
   * rango de fechas. Sin cálculo de comisión — devuelve los montos crudos,
   * el consolidado y el % se resuelven fuera del sistema; esta lista es la
   * base para exportar y para decidir qué marcar como liquidado.
   */
  honorarios(organizacionId: string, desde?: string, hasta?: string, veterinarioId?: string) {
    const condiciones = [eq(cobros.organizacionId, organizacionId), isNotNull(cobros.veterinarioId)];
    if (desde) condiciones.push(gte(cobros.createdAt, new Date(desde)));
    if (hasta) condiciones.push(lte(cobros.createdAt, new Date(hasta)));
    if (veterinarioId) condiciones.push(eq(cobros.veterinarioId, veterinarioId));
    return this.db
      .select()
      .from(cobros)
      .where(and(...condiciones))
      .orderBy(desc(cobros.createdAt));
  }

  /** Marca como liquidados los cobros no liquidados de un profesional en el rango dado — reinicia el acumulador. */
  async liquidar(organizacionId: string, dto: LiquidarHonorariosDto) {
    const actualizados = await this.db
      .update(cobros)
      .set({ liquidado: true, liquidadoEn: new Date() })
      .where(
        and(
          eq(cobros.organizacionId, organizacionId),
          eq(cobros.veterinarioId, dto.veterinarioId),
          eq(cobros.liquidado, false),
          gte(cobros.createdAt, new Date(dto.desde)),
          lte(cobros.createdAt, new Date(dto.hasta)),
        ),
      )
      .returning({ id: cobros.id });
    return { ok: true, cantidad: actualizados.length };
  }
}

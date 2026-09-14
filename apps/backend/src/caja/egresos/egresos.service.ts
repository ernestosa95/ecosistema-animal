import { Injectable, Inject } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../database/drizzle.provider';
import { egresos } from '../../database/schema';
import { CreateEgresoDto } from './dto/create-egreso.dto';
import { CajasService } from '../cajas/cajas.service';

@Injectable()
export class EgresosService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly cajasService: CajasService,
  ) {}

  /**
   * Registra un egreso — "aislado" de los ingresos (§2.6), nunca se listan
   * juntos. Primero normaliza el día (si la caja abierta quedó de ayer sin
   * cerrar, se cierra sola en revisión). Desde 2026-09-14, igual que
   * `CobrosService.crear()`: si no queda ninguna caja abierta, abre una sola
   * (apertura rápida) en vez de rechazar con "abrí la caja primero" —
   * decisión anterior revertida a pedido del usuario tras un caso real
   * (compra a proveedor con "+ Ingresos" de Farmacia, que genera un egreso
   * automático — ver `IngresoStockForm.tsx` — siendo la primera acción de
   * plata del día, antes de cualquier venta). `cajaAbiertaAhora` en la
   * respuesta le avisa al front cuándo pasó esto, para poder recordárselo
   * al usuario en vez de que quede silencioso.
   */
  async crear(organizacionId: string, usuarioId: string, dto: CreateEgresoDto) {
    await this.cajasService.normalizarDelDia(organizacionId, usuarioId);
    const cajaExistente = await this.cajasService.actual(organizacionId);
    const caja = cajaExistente ?? (await this.cajasService.abrir(organizacionId, usuarioId, {}));

    const [egreso] = await this.db
      .insert(egresos)
      .values({
        organizacionId,
        cajaId: caja.id,
        usuarioId,
        concepto: dto.concepto,
        monto: dto.monto.toString(),
      })
      .returning();
    return { ...egreso, cajaAbiertaAhora: !cajaExistente };
  }

  listarDeCaja(organizacionId: string, cajaId: string) {
    return this.db
      .select()
      .from(egresos)
      .where(and(eq(egresos.organizacionId, organizacionId), eq(egresos.cajaId, cajaId)))
      .orderBy(desc(egresos.createdAt));
  }
}

import { BadRequestException, Injectable, Inject } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../database/drizzle.provider';
import { cajas, egresos } from '../../database/schema';
import { CreateEgresoDto } from './dto/create-egreso.dto';
import { CajasService } from '../cajas/cajas.service';

@Injectable()
export class EgresosService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly cajasService: CajasService,
  ) {}

  /**
   * Registra un egreso en la caja abierta — "aislado" de los ingresos
   * (§2.6), nunca se listan juntos. Primero normaliza el día (si la caja
   * abierta quedó de ayer sin cerrar, se cierra sola en revisión) para no
   * imputarle por error un egreso de hoy a la caja de otro día — a
   * diferencia de los cobros, un egreso sigue sin abrir una caja nueva por
   * sí solo si no queda ninguna abierta.
   */
  async crear(organizacionId: string, usuarioId: string, dto: CreateEgresoDto) {
    await this.cajasService.normalizarDelDia(organizacionId, usuarioId);

    const [caja] = await this.db
      .select({ id: cajas.id })
      .from(cajas)
      .where(and(eq(cajas.organizacionId, organizacionId), eq(cajas.estado, 'abierta')))
      .limit(1);
    if (!caja) {
      throw new BadRequestException('No hay una caja abierta. Abrí la caja del día antes de registrar un egreso.');
    }

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
    return egreso;
  }

  listarDeCaja(organizacionId: string, cajaId: string) {
    return this.db
      .select()
      .from(egresos)
      .where(and(eq(egresos.organizacionId, organizacionId), eq(egresos.cajaId, cajaId)))
      .orderBy(desc(egresos.createdAt));
  }
}

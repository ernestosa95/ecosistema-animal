import { Module } from '@nestjs/common';
import { EstablecimientosModule } from './establecimientos/establecimientos.module';
import { ExistenciasModule } from './existencias/existencias.module';
import { MovimientosModule } from './movimientos/movimientos.module';
import { EventosModule } from './eventos/eventos.module';

/**
 * Módulo de Tropera (gestión ganadera). MVP: establecimientos, existencias
 * agregadas por categoría, movimientos (altas/bajas/traslados) que las
 * ajustan, y eventos sanitarios/reproductivos (sólo registro).
 */
@Module({
  imports: [EstablecimientosModule, ExistenciasModule, MovimientosModule, EventosModule],
})
export class TroperaModule {}

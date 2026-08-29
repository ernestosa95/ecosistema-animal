import { Module } from '@nestjs/common';
import { ProductosModule } from './productos/productos.module';
import { StockModule } from './stock/stock.module';
import { MovimientosModule } from './movimientos/movimientos.module';

/**
 * Módulo de Farmacia (vademécum + stock). MVP básico: catálogo de productos,
 * stock actual (corrección directa) y movimientos (compra/uso/vencimiento/
 * merma) que lo ajustan transaccionalmente. Fuera de alcance a propósito:
 * dispensa ligada a una consulta (F4.3) y la FK real desde
 * hce.vacunaciones.vademecum_id.
 */
@Module({
  imports: [ProductosModule, StockModule, MovimientosModule],
})
export class FarmaciaModule {}

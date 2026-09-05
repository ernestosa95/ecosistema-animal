import { Module } from '@nestjs/common';
import { ProductosModule } from './productos/productos.module';
import { StockModule } from './stock/stock.module';
import { MovimientosModule } from './movimientos/movimientos.module';
import { VademecumSenasaModule } from './vademecum-senasa/vademecum-senasa.module';

/**
 * Módulo de Farmacia (vademécum + stock). MVP básico: catálogo de productos,
 * stock actual (corrección directa) y movimientos (compra/uso/vencimiento/
 * merma) que lo ajustan transaccionalmente. Fuera de alcance a propósito:
 * dispensa ligada a una consulta (F4.3) y la FK real desde
 * hce.vacunaciones.vademecum_id.
 *
 * `vademecum-senasa/` (F4.1) es un catálogo de referencia GLOBAL importado
 * del registro nacional de SENASA — sólo asiste el buscador del alta de
 * producto, no es un `productos` per-organización.
 */
@Module({
  imports: [ProductosModule, StockModule, MovimientosModule, VademecumSenasaModule],
})
export class FarmaciaModule {}

import { Module } from '@nestjs/common';
import { AuthModule } from '../core/auth/auth.module';
import { CajasController } from './cajas/cajas.controller';
import { CajasService } from './cajas/cajas.service';
import { CobrosController } from './cobros/cobros.controller';
import { CobrosService } from './cobros/cobros.service';
import { EgresosController } from './egresos/egresos.controller';
import { EgresosService } from './egresos/egresos.service';

/**
 * Módulo de caja (Fase D del spec UI/UX): §2.6 caja chica y cierre, §4.1
 * auditoría de cierres, §4.4 liquidación de honorarios. Ver `database/schema/caja.ts`
 * para las decisiones de alcance acordadas antes de codear.
 */
@Module({
  imports: [AuthModule],
  controllers: [CajasController, CobrosController, EgresosController],
  providers: [CajasService, CobrosService, EgresosService],
})
export class CajaModule {}

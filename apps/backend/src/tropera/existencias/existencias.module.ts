import { Module } from '@nestjs/common';
import { ExistenciasController } from './existencias.controller';
import { ExistenciasResumenController } from './existencias-resumen.controller';
import { ExistenciasService } from './existencias.service';
import { AuthModule } from '../../core/auth/auth.module';
import { EstablecimientosModule } from '../establecimientos/establecimientos.module';

@Module({
  imports: [AuthModule, EstablecimientosModule],
  controllers: [ExistenciasController, ExistenciasResumenController],
  providers: [ExistenciasService],
  exports: [ExistenciasService],
})
export class ExistenciasModule {}

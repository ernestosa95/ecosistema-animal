import { Module } from '@nestjs/common';
import { ConsultasService } from './consultas/consultas.service';
import { ConsultasController } from './consultas/consultas.controller';
import { VacunacionesService } from './vacunaciones/vacunaciones.service';
import { VacunacionesController } from './vacunaciones/vacunaciones.controller';
import { TurnosService } from './turnos/turnos.service';
import { TurnosController } from './turnos/turnos.controller';
import { AuthModule } from '../core/auth/auth.module';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CarnetModule } from './carnet/carnet.module';
import { CarnetController } from './carnet/carnet.controller';   // ← NUEVO
import { CarnetService } from './carnet/carnet.service';         // ← NUEVO
import { PortalModule } from './portal/portal.module';

/**
 * Módulo de la Historia Clínica Electrónica. Agrupa las features de la HCE:
 * consultas, vacunaciones, turnos y el carnet PDF.
 */
@Module({
  imports: [AuthModule, CarnetModule, PortalModule],
  controllers: [ConsultasController, VacunacionesController, TurnosController, CarnetController],
  providers: [ConsultasService, VacunacionesService, TurnosService, TenantGuard, RolesGuard, CarnetService],
})
export class HceModule {}

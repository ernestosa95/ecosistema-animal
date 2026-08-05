import { Module } from '@nestjs/common';
import { AuthModule } from '../core/auth/auth.module';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { SolicitudesController } from './solicitudes.controller';
import { SolicitudesAdminController } from './solicitudes-admin.controller';
import { SolicitudesService } from './solicitudes.service';

/**
 * Auto-registro con aprobación: alta pública de solicitudes + bandeja del
 * super-admin para aprobarlas/rechazarlas.
 */
@Module({
  imports: [AuthModule],
  controllers: [SolicitudesController, SolicitudesAdminController],
  providers: [SolicitudesService, JwtAuthGuard, SuperAdminGuard],
})
export class SolicitudesModule {}

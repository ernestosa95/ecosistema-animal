import { Module } from '@nestjs/common';
import { AuthModule } from '../core/auth/auth.module';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { PortalController } from './portal.controller';
import { PortalService } from './portal.service';
import { PortalTokenService } from './portal-token.service';
import { PortalGuard } from './portal.guard';

/**
 * Portal del dueño: acceso por magic-link (token), resumen de sus mascotas y
 * solicitud de turnos. Importa AuthModule para reutilizar el JwtService.
 */
@Module({
  imports: [AuthModule],
  controllers: [PortalController],
  providers: [PortalService, PortalTokenService, PortalGuard, JwtAuthGuard, TenantGuard],
})
export class PortalModule {}

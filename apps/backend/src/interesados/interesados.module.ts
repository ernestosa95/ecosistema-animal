import { Module } from '@nestjs/common';
import { AuthModule } from '../core/auth/auth.module';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { InteresadosController } from './interesados.controller';
import { InteresadosAdminController } from './interesados-admin.controller';
import { InteresadosService } from './interesados.service';

/**
 * Captura de interés del lanzamiento (botón "Estoy interesado" de la landing,
 * cupo fijo de 10) + bandeja del super-admin para verlos. AuthModule aporta
 * el JwtService que necesita JwtAuthGuard.
 */
@Module({
  imports: [AuthModule],
  controllers: [InteresadosController, InteresadosAdminController],
  providers: [InteresadosService, JwtAuthGuard, SuperAdminGuard],
})
export class InteresadosModule {}

import { Module } from '@nestjs/common';
import { AuthModule } from '../core/auth/auth.module';
import { TenantGuard } from '../common/guards/tenant.guard';
import { MensajesController } from './mensajes.controller';
import { MensajesService } from './mensajes.service';

/** Importa AuthModule para disponer de JwtService (usado por JwtAuthGuard). */
@Module({
  imports: [AuthModule],
  controllers: [MensajesController],
  providers: [MensajesService, TenantGuard],
})
export class MensajesModule {}

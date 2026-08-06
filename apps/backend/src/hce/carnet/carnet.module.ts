import { Module } from '@nestjs/common';
import { CarnetController } from './carnet.controller';
import { CarnetService } from './carnet.service';
import { AuthModule } from '../../core/auth/auth.module';       // ← aporta JwtService (para JwtAuthGuard)
import { TenantGuard } from '../../common/guards/tenant.guard'; // ← usado por @UseGuards en el controller

/**
 * Importa AuthModule para disponer de JwtService (usado por JwtAuthGuard).
 * TenantGuard se registra como provider; se apoya en el token DRIZZLE (global).
 * El provider DRIZZLE es global (DatabaseModule), así que el service lo inyecta solo.
 */
@Module({
  imports: [AuthModule],
  controllers: [CarnetController],
  providers: [CarnetService, TenantGuard],
})
export class CarnetModule {}
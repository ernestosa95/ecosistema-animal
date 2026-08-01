import { Module } from '@nestjs/common';
import { AnimalesService } from './animales.service';
import { AnimalesController } from './animales.controller';
import { AuthModule } from '../auth/auth.module';
import { TenantGuard } from '../../common/guards/tenant.guard';

/**
 * Importa AuthModule para disponer de JwtService (usado por JwtAuthGuard).
 * TenantGuard se apoya en el token DRIZZLE, provisto globalmente.
 */
@Module({
  imports: [AuthModule],
  controllers: [AnimalesController],
  providers: [AnimalesService, TenantGuard],
})
export class AnimalesModule {}

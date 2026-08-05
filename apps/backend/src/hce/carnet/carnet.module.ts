import { Module } from '@nestjs/common';
import { AuthModule } from '../../core/auth/auth.module';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CarnetController } from './carnet.controller';
import { CarnetService } from './carnet.service';

@Module({
  imports: [AuthModule],
  controllers: [CarnetController],
  providers: [CarnetService, JwtAuthGuard, TenantGuard],
})
export class CarnetModule {}

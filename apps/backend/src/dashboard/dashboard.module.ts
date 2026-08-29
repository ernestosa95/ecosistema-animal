import { Module } from '@nestjs/common';
import { AuthModule } from '../core/auth/auth.module';
import { TenantGuard } from '../common/guards/tenant.guard';
import { HceModule } from '../hce/hce.module';
import { ExistenciasModule } from '../tropera/existencias/existencias.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [AuthModule, HceModule, ExistenciasModule],
  controllers: [DashboardController],
  providers: [DashboardService, TenantGuard],
})
export class DashboardModule {}

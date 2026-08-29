import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentOrg } from '../common/decorators/current-context.decorator';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, TenantGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('resumen')
  resumen(@CurrentOrg() organizacionId: string) {
    return this.dashboard.resumen(organizacionId);
  }
}

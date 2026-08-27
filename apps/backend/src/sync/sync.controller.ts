import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { SyncService } from './sync.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentOrg } from '../common/decorators/current-context.decorator';

@Controller('sync')
@UseGuards(JwtAuthGuard, TenantGuard)
export class SyncController {
  constructor(private readonly sync: SyncService) {}

  /** WatermelonDB pullChanges → GET /sync?lastPulledAt=<ms> */
  @Get()
  pull(@CurrentOrg() organizacionId: string, @Query('lastPulledAt') lastPulledAt?: string) {
    const ts = lastPulledAt ? parseInt(lastPulledAt, 10) : 0;
    return this.sync.pull(organizacionId, Number.isNaN(ts) ? 0 : ts);
  }

  /** WatermelonDB pushChanges → POST /sync { changes, lastPulledAt } */
  @Post()
  async push(
    @CurrentOrg() organizacionId: string,
    @Body() body: { changes?: Record<string, any>; lastPulledAt?: number },
  ) {
    await this.sync.push(organizacionId, body?.changes ?? {});
    return { ok: true };
  }
}

import { Body, Controller, Get, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CobrosService } from './cobros.service';
import { CreateCobroDto } from './dto/create-cobro.dto';
import { LiquidarHonorariosDto } from './dto/liquidar-honorarios.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrg, CurrentUser } from '../../common/decorators/current-context.decorator';

@Controller('caja/cobros')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class CobrosController {
  constructor(private readonly cobros: CobrosService) {}

  @Post()
  @Roles('propietario', 'admin', 'recepcion')
  crear(@CurrentOrg() organizacionId: string, @CurrentUser() user: { sub: string }, @Body() dto: CreateCobroDto) {
    return this.cobros.crear(organizacionId, user.sub, dto);
  }

  @Get()
  @Roles('propietario', 'admin', 'recepcion')
  listarDeCaja(@CurrentOrg() organizacionId: string, @Query('cajaId') cajaId: string) {
    return this.cobros.listarDeCaja(organizacionId, cajaId);
  }

  /** Liquidación de honorarios (§4.4) — sólo propietario/gerente. */
  @Get('honorarios')
  @Roles('propietario', 'admin')
  honorarios(
    @CurrentOrg() organizacionId: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('veterinarioId') veterinarioId?: string,
  ) {
    return this.cobros.honorarios(organizacionId, desde, hasta, veterinarioId);
  }

  @Patch('honorarios/liquidar')
  @Roles('propietario', 'admin')
  liquidar(@CurrentOrg() organizacionId: string, @Body() dto: LiquidarHonorariosDto) {
    return this.cobros.liquidar(organizacionId, dto);
  }
}

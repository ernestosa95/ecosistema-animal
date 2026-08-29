import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { EgresosService } from './egresos.service';
import { CreateEgresoDto } from './dto/create-egreso.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrg, CurrentUser } from '../../common/decorators/current-context.decorator';

@Controller('caja/egresos')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class EgresosController {
  constructor(private readonly egresos: EgresosService) {}

  @Post()
  @Roles('propietario', 'admin', 'recepcion')
  crear(@CurrentOrg() organizacionId: string, @CurrentUser() user: { sub: string }, @Body() dto: CreateEgresoDto) {
    return this.egresos.crear(organizacionId, user.sub, dto);
  }

  @Get()
  @Roles('propietario', 'admin', 'recepcion')
  listarDeCaja(@CurrentOrg() organizacionId: string, @Query('cajaId') cajaId: string) {
    return this.egresos.listarDeCaja(organizacionId, cajaId);
  }
}

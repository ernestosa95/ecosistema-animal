import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { MovimientosService } from './movimientos.service';
import { CreateMovimientoDto } from './dto/create-movimiento.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrg, CurrentUser } from '../../common/decorators/current-context.decorator';

@Controller('tropera/movimientos')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class MovimientosController {
  constructor(private readonly movimientos: MovimientosService) {}

  @Post()
  @Roles('propietario', 'admin', 'capataz')
  crear(
    @CurrentOrg() organizacionId: string,
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateMovimientoDto,
  ) {
    return this.movimientos.crear(organizacionId, user.sub, dto);
  }

  @Get()
  listar(
    @CurrentOrg() organizacionId: string,
    @Query('establecimientoId') establecimientoId?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.movimientos.listar(organizacionId, establecimientoId, desde, hasta);
  }
}

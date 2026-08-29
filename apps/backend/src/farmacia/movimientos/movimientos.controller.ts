import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { MovimientosService } from './movimientos.service';
import { CreateMovimientoStockDto } from './dto/create-movimiento-stock.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrg, CurrentUser } from '../../common/decorators/current-context.decorator';

@Controller('farmacia/movimientos')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class MovimientosController {
  constructor(private readonly movimientos: MovimientosService) {}

  @Post()
  @Roles('propietario', 'admin', 'veterinario')
  crear(
    @CurrentOrg() organizacionId: string,
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateMovimientoStockDto,
  ) {
    return this.movimientos.crear(organizacionId, user.sub, dto);
  }

  @Get()
  listar(
    @CurrentOrg() organizacionId: string,
    @Query('productoId') productoId?: string,
    @Query('consultaId') consultaId?: string,
  ) {
    return this.movimientos.listar(organizacionId, productoId, consultaId);
  }
}

import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { EstablecimientosService } from './establecimientos.service';
import { CreateEstablecimientoDto } from './dto/create-establecimiento.dto';
import { UpdateEstablecimientoDto } from './dto/update-establecimiento.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrg } from '../../common/decorators/current-context.decorator';

@Controller('tropera/establecimientos')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class EstablecimientosController {
  constructor(private readonly establecimientos: EstablecimientosService) {}

  @Post()
  @Roles('propietario', 'admin', 'capataz')
  crear(@CurrentOrg() organizacionId: string, @Body() dto: CreateEstablecimientoDto) {
    return this.establecimientos.crear(organizacionId, dto);
  }

  @Get()
  listar(@CurrentOrg() organizacionId: string) {
    return this.establecimientos.listar(organizacionId);
  }

  @Get(':id')
  obtener(@CurrentOrg() organizacionId: string, @Param('id') id: string) {
    return this.establecimientos.obtener(organizacionId, id);
  }

  @Patch(':id')
  @Roles('propietario', 'admin', 'capataz')
  actualizar(
    @CurrentOrg() organizacionId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEstablecimientoDto,
  ) {
    return this.establecimientos.actualizar(organizacionId, id, dto);
  }
}

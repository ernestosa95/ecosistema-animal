import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ExistenciasService } from './existencias.service';
import { SetExistenciaDto } from './dto/set-existencia.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrg } from '../../common/decorators/current-context.decorator';

/** Existencias (stock de hacienda por categoría) de UN establecimiento. */
@Controller('tropera/establecimientos/:id')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class ExistenciasController {
  constructor(private readonly existencias: ExistenciasService) {}

  @Get('existencias')
  listar(@CurrentOrg() organizacionId: string, @Param('id') id: string) {
    return this.existencias.listar(organizacionId, id);
  }

  @Patch('existencias')
  @Roles('propietario', 'admin', 'capataz')
  fijar(
    @CurrentOrg() organizacionId: string,
    @Param('id') id: string,
    @Body() dto: SetExistenciaDto,
  ) {
    return this.existencias.fijar(organizacionId, id, dto);
  }
}

import { Controller, Get, UseGuards } from '@nestjs/common';
import { ExistenciasService } from './existencias.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentOrg } from '../../common/decorators/current-context.decorator';

/**
 * Existencias de TODA la organización (todos los establecimientos), para el
 * panel consolidado. Ruta separada de `ExistenciasController`
 * (tropera/establecimientos/:id/existencias) para no generar ambigüedad de
 * ruteo entre "existencias" y el param :id.
 */
@Controller('tropera/existencias')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ExistenciasResumenController {
  constructor(private readonly existencias: ExistenciasService) {}

  @Get()
  listar(@CurrentOrg() organizacionId: string) {
    return this.existencias.listarTodas(organizacionId);
  }
}

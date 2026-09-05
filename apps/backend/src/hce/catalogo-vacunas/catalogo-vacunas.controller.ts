import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CatalogoVacunasService } from './catalogo-vacunas.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

/** Catálogo global — sin TenantGuard, igual criterio que `especies.controller.ts`. */
@Controller('hce/catalogo-vacunas')
@UseGuards(JwtAuthGuard)
export class CatalogoVacunasController {
  constructor(private readonly catalogo: CatalogoVacunasService) {}

  @Get()
  porEspecie(@Query('especieId') especieId?: string) {
    if (!especieId) throw new BadRequestException('Falta especieId');
    return this.catalogo.porEspecie(especieId);
  }
}

import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CatalogoDiagnosticosService } from './catalogo-diagnosticos.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

/** Catálogo global — sin TenantGuard, igual criterio que `catalogo-vacunas.controller.ts`. */
@Controller('hce/catalogo-diagnosticos')
@UseGuards(JwtAuthGuard)
export class CatalogoDiagnosticosController {
  constructor(private readonly catalogo: CatalogoDiagnosticosService) {}

  @Get()
  porEspecie(@Query('especieId') especieId?: string) {
    if (!especieId) throw new BadRequestException('Falta especieId');
    return this.catalogo.porEspecie(especieId);
  }
}

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { VademecumSenasaService } from './vademecum-senasa.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

/** Catálogo global — sin TenantGuard, igual criterio que `especies.controller.ts`. */
@Controller('farmacia/vademecum-senasa')
@UseGuards(JwtAuthGuard)
export class VademecumSenasaController {
  constructor(private readonly vademecum: VademecumSenasaService) {}

  @Get()
  buscar(@Query('buscar') termino?: string) {
    return this.vademecum.buscar(termino ?? '');
  }
}

import { Controller, Get, Param } from '@nestjs/common';
import { PortalService } from './portal.service';

/**
 * Portal público del dueño. SIN guards: el código legible (del QR/carnet)
 * es la credencial de acceso. Sólo expone lectura del resumen del animal.
 */
@Controller('portal')
export class PortalController {
  constructor(private readonly portal: PortalService) {}

  @Get('c/:codigo')
  resumen(@Param('codigo') codigo: string) {
    return this.portal.resumenPorCodigo(codigo);
  }
}

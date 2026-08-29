import { Controller, Get, Param, StreamableFile, UseGuards } from '@nestjs/common';
import { CarnetService } from './carnet.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentOrg } from '../../common/decorators/current-context.decorator';

@Controller('animales/:id')
@UseGuards(JwtAuthGuard, TenantGuard) // exige sesión válida + organización (multi-tenant)
export class CarnetController {
  constructor(private readonly carnet: CarnetService) {}

  // GET /animales/:id/carnet.pdf → tarjeta de identificación tipo DNI (inline)
  @Get('carnet.pdf')
  async carnetPdf(
    @Param('id') id: string,
    @CurrentOrg() organizacionId: string, // la org viaja en el header, resuelta por TenantGuard
  ): Promise<StreamableFile> {
    const pdf = await this.carnet.generarCarnet(id, organizacionId);
    return new StreamableFile(pdf, {
      type: 'application/pdf',
      // 'inline' abre en pestaña; usá 'attachment' para forzar descarga.
      disposition: `inline; filename="carnet-huella-${id}.pdf"`,
    });
  }

  // GET /animales/:id/ficha.pdf → hoja A4 con el registro completo (inline)
  @Get('ficha.pdf')
  async fichaPdf(
    @Param('id') id: string,
    @CurrentOrg() organizacionId: string,
  ): Promise<StreamableFile> {
    const pdf = await this.carnet.generarFicha(id, organizacionId);
    return new StreamableFile(pdf, {
      type: 'application/pdf',
      disposition: `inline; filename="ficha-huella-${id}.pdf"`,
    });
  }
}

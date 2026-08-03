import { Controller, Get, Param, StreamableFile, UseGuards } from '@nestjs/common';
import { CarnetService } from './carnet.service';

// ⚠️ Ajustá estos imports a las rutas reales de tu proyecto.
// import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
// import { TenantGuard } from '../../common/guards/tenant.guard';
// import { CurrentOrg } from '../../common/decorators/current-context.decorator';

@Controller('animales/:id')
// @UseGuards(JwtAuthGuard, TenantGuard)   // ← descomentá para exigir sesión + tenant
export class CarnetController {
  constructor(private readonly carnet: CarnetService) {}

  // GET /animales/:id/carnet.pdf  → devuelve el PDF inline (se abre en el navegador)
  @Get('carnet.pdf')
  async carnetPdf(
    @Param('id') id: string,
    // @CurrentOrg() organizacionId: string,   // ← con TenantGuard, la org viaja en el header
  ): Promise<StreamableFile> {
    const organizacionId = 'MOCK-ORG'; // ← quitar cuando actives @CurrentOrg
    const pdf = await this.carnet.generarCarnet(id, organizacionId);
    return new StreamableFile(pdf, {
      type: 'application/pdf',
      // 'inline' abre en pestaña; usá 'attachment' si querés forzar descarga.
      disposition: `inline; filename="carnet-huella-${id}.pdf"`,
    });
  }
}

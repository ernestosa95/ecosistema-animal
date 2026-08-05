import { Controller, Get, Param, StreamableFile, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentOrg } from '../../common/decorators/current-context.decorator';
import { CarnetService } from './carnet.service';

@Controller('animales/:id')
@UseGuards(JwtAuthGuard, TenantGuard)
export class CarnetController {
  constructor(private readonly carnet: CarnetService) {}

  // GET /animales/:id/carnet.pdf → PDF del carnet (requiere sesión + organización)
  @Get('carnet.pdf')
  async carnetPdf(
    @Param('id') id: string,
    @CurrentOrg() organizacionId: string,
  ): Promise<StreamableFile> {
    const pdf = await this.carnet.generarCarnet(id, organizacionId);
    return new StreamableFile(pdf, {
      type: 'application/pdf',
      disposition: `inline; filename="carnet-huella-${id}.pdf"`,
    });
  }
}

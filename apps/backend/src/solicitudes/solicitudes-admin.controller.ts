import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { CurrentUser } from '../common/decorators/current-context.decorator';
import { SolicitudesService } from './solicitudes.service';
import { AprobarSolicitudDto, RechazarSolicitudDto } from './dto/aprobar-solicitud.dto';

/** Bandeja del super-admin: ver, aprobar y rechazar solicitudes. */
@Controller('admin/solicitudes')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class SolicitudesAdminController {
  constructor(private readonly solicitudes: SolicitudesService) {}

  @Get()
  listar(@Query('estado') estado?: string) {
    return this.solicitudes.listar(estado ?? 'pendiente');
  }

  @Post(':id/aprobar')
  aprobar(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string; email: string },
    @Body() dto: AprobarSolicitudDto,
  ) {
    return this.solicitudes.aprobar(id, user.sub, dto);
  }

  @Post(':id/rechazar')
  rechazar(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string; email: string },
    @Body() dto: RechazarSolicitudDto,
  ) {
    return this.solicitudes.rechazar(id, user.sub, dto);
  }
}

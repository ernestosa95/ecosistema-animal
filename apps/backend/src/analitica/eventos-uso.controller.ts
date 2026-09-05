import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { EventosUsoService } from './eventos-uso.service';
import { RegistrarEventoDto } from './dto/registrar-evento.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentOrg, CurrentUser } from '../common/decorators/current-context.decorator';

/**
 * Alta de eventos de analítica de uso — cualquier miembro autenticado de la
 * organización puede emitirlos (sin @Roles), el frontend los dispara
 * fire-and-forget en cada pantalla/acción instrumentada. La lectura
 * agregada es sólo para el super-admin (ver AdminController.analitica()).
 */
@Controller('analitica')
@UseGuards(JwtAuthGuard, TenantGuard)
export class EventosUsoController {
  constructor(private readonly eventos: EventosUsoService) {}

  @Post('eventos')
  registrar(
    @CurrentOrg() organizacionId: string,
    @CurrentUser() usuario: { sub: string },
    @Body() dto: RegistrarEventoDto,
  ) {
    return this.eventos.registrar(organizacionId, usuario.sub, dto);
  }
}

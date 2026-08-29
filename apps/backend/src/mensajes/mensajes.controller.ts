import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentOrg, CurrentUser } from '../common/decorators/current-context.decorator';
import { MensajesService } from './mensajes.service';

@Controller('mensajes')
@UseGuards(JwtAuthGuard, TenantGuard)
export class MensajesController {
  constructor(private readonly mensajes: MensajesService) {}

  @Get('pendientes')
  pendientes(@CurrentOrg() organizacionId: string, @CurrentUser() user: { sub: string }) {
    return this.mensajes.pendientes(organizacionId, user.sub);
  }

  @Post(':id/leido')
  marcarLeido(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.mensajes.marcarLeido(id, user.sub);
  }
}

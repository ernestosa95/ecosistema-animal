import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { EventosService } from './eventos.service';
import { CreateEventoDto } from './dto/create-evento.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrg, CurrentUser } from '../../common/decorators/current-context.decorator';

@Controller('tropera/eventos')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class EventosController {
  constructor(private readonly eventos: EventosService) {}

  @Post()
  @Roles('propietario', 'admin', 'capataz', 'veterinario')
  crear(
    @CurrentOrg() organizacionId: string,
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateEventoDto,
  ) {
    return this.eventos.crear(organizacionId, user.sub, dto);
  }

  @Get()
  listar(
    @CurrentOrg() organizacionId: string,
    @Query('establecimientoId') establecimientoId?: string,
    @Query('animalCampoId') animalCampoId?: string,
  ) {
    return this.eventos.listar(organizacionId, establecimientoId, animalCampoId);
  }
}

import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TurnosService } from './turnos.service';
import { CreateTurnoDto } from './dto/create-turno.dto';
import { UpdateEstadoTurnoDto } from './dto/update-estado-turno.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrg } from '../../common/decorators/current-context.decorator';

@Controller('turnos')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class TurnosController {
  constructor(private readonly turnos: TurnosService) {}

  @Post()
  @Roles('propietario', 'admin', 'veterinario', 'recepcion')
  solicitar(@CurrentOrg() organizacionId: string, @Body() dto: CreateTurnoDto) {
    return this.turnos.solicitar(organizacionId, dto);
  }

  @Get()
  agenda(
    @CurrentOrg() organizacionId: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.turnos.agenda(organizacionId, desde, hasta);
  }

  @Get('animal/:animalId')
  porAnimal(
    @CurrentOrg() organizacionId: string,
    @Param('animalId') animalId: string,
  ) {
    return this.turnos.porAnimal(organizacionId, animalId);
  }

  @Get(':id')
  obtener(@CurrentOrg() organizacionId: string, @Param('id') id: string) {
    return this.turnos.obtener(organizacionId, id);
  }

  @Patch(':id/estado')
  @Roles('propietario', 'admin', 'veterinario', 'recepcion')
  cambiarEstado(
    @CurrentOrg() organizacionId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEstadoTurnoDto,
  ) {
    return this.turnos.cambiarEstado(organizacionId, id, dto);
  }
}

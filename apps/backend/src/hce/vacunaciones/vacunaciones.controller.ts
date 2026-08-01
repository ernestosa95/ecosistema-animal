import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { VacunacionesService } from './vacunaciones.service';
import { CreateVacunacionDto } from './dto/create-vacunacion.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import {
  CurrentOrg,
  CurrentUser,
} from '../../common/decorators/current-context.decorator';

@Controller('vacunaciones')
@UseGuards(JwtAuthGuard, TenantGuard)
export class VacunacionesController {
  constructor(private readonly vacunaciones: VacunacionesService) {}

  @Post()
  registrar(
    @CurrentOrg() organizacionId: string,
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateVacunacionDto,
  ) {
    return this.vacunaciones.registrar(organizacionId, user.sub, dto);
  }

  /** Próximas dosis a vencer dentro de `dias` (por defecto 30). */
  @Get('recordatorios')
  recordatorios(
    @CurrentOrg() organizacionId: string,
    @Query('dias') dias?: string,
  ) {
    const d = dias ? parseInt(dias, 10) : 30;
    return this.vacunaciones.recordatorios(organizacionId, Number.isNaN(d) ? 30 : d);
  }

  @Get('animal/:animalId')
  historia(
    @CurrentOrg() organizacionId: string,
    @Param('animalId') animalId: string,
  ) {
    return this.vacunaciones.historiaPorAnimal(organizacionId, animalId);
  }
}

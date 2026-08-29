import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ConsultasService } from './consultas.service';
import { CreateConsultaDto } from './dto/create-consulta.dto';
import { UpdateConsultaDto } from './dto/update-consulta.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CurrentOrg,
  CurrentUser,
} from '../../common/decorators/current-context.decorator';

@Controller('consultas')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class ConsultasController {
  constructor(private readonly consultas: ConsultasService) {}

  @Post()
  @Roles('propietario', 'admin', 'veterinario')
  crear(
    @CurrentOrg() organizacionId: string,
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateConsultaDto,
  ) {
    return this.consultas.crear(organizacionId, user.sub, dto);
  }

  /** Drill-down del dashboard (§4.2): consultas de toda la organización en un rango de fechas. */
  @Get()
  porRango(
    @CurrentOrg() organizacionId: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.consultas.porRango(organizacionId, desde, hasta);
  }

  @Get('animal/:animalId')
  historia(
    @CurrentOrg() organizacionId: string,
    @Param('animalId') animalId: string,
  ) {
    return this.consultas.historiaPorAnimal(organizacionId, animalId);
  }

  @Get(':id')
  obtener(@CurrentOrg() organizacionId: string, @Param('id') id: string) {
    return this.consultas.obtener(organizacionId, id);
  }

  @Patch(':id')
  @Roles('propietario', 'admin', 'veterinario')
  actualizar(
    @CurrentOrg() organizacionId: string,
    @Param('id') id: string,
    @Body() dto: UpdateConsultaDto,
  ) {
    return this.consultas.actualizar(organizacionId, id, dto);
  }

  @Delete(':id')
  @Roles('propietario', 'admin', 'veterinario')
  eliminar(@CurrentOrg() organizacionId: string, @Param('id') id: string) {
    return this.consultas.eliminar(organizacionId, id);
  }
}

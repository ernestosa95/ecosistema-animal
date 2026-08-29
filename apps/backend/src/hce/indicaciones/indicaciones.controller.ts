import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { IndicacionesService } from './indicaciones.service';
import { CreateIndicacionDto } from './dto/create-indicacion.dto';
import { UpdateIndicacionDto } from './dto/update-indicacion.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrg } from '../../common/decorators/current-context.decorator';

@Controller('hce/indicaciones')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class IndicacionesController {
  constructor(private readonly indicaciones: IndicacionesService) {}

  @Post()
  @Roles('propietario', 'admin', 'veterinario')
  crear(@CurrentOrg() organizacionId: string, @Body() dto: CreateIndicacionDto) {
    return this.indicaciones.crear(organizacionId, dto);
  }

  @Get()
  listar(
    @CurrentOrg() organizacionId: string,
    @Query('animalId') animalId?: string,
    @Query('consultaId') consultaId?: string,
  ) {
    if (consultaId) return this.indicaciones.listarPorConsulta(organizacionId, consultaId);
    if (animalId) return this.indicaciones.listarPorAnimal(organizacionId, animalId);
    throw new BadRequestException('Se requiere animalId o consultaId');
  }

  @Patch(':id')
  @Roles('propietario', 'admin', 'veterinario')
  actualizar(@CurrentOrg() organizacionId: string, @Param('id') id: string, @Body() dto: UpdateIndicacionDto) {
    return this.indicaciones.actualizar(organizacionId, id, dto);
  }

  @Delete(':id')
  @Roles('propietario', 'admin', 'veterinario')
  eliminar(@CurrentOrg() organizacionId: string, @Param('id') id: string) {
    return this.indicaciones.eliminar(organizacionId, id);
  }
}

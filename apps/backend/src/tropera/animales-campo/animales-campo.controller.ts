import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AnimalesCampoService } from './animales-campo.service';
import { CreateAnimalCampoDto } from './dto/create-animal-campo.dto';
import { UpdateAnimalCampoDto } from './dto/update-animal-campo.dto';
import { ConciliarAnimalCampoDto } from './dto/conciliar-animal-campo.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrg } from '../../common/decorators/current-context.decorator';

@Controller('tropera/animales-campo')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class AnimalesCampoController {
  constructor(private readonly animales: AnimalesCampoService) {}

  @Post()
  @Roles('propietario', 'admin', 'capataz')
  crear(@CurrentOrg() organizacionId: string, @Body() dto: CreateAnimalCampoDto) {
    return this.animales.crear(organizacionId, dto);
  }

  @Get()
  listar(
    @CurrentOrg() organizacionId: string,
    @Query('establecimientoId') establecimientoId?: string,
    @Query('transitorios') transitorios?: string,
    @Query('potreroId') potreroId?: string,
  ) {
    return this.animales.listar(organizacionId, establecimientoId, transitorios === 'true', potreroId);
  }

  @Get(':id')
  obtener(@CurrentOrg() organizacionId: string, @Param('id') id: string) {
    return this.animales.obtener(organizacionId, id);
  }

  @Get(':id/eventos')
  historialEventos(@CurrentOrg() organizacionId: string, @Param('id') id: string) {
    return this.animales.historialEventos(organizacionId, id);
  }

  @Patch(':id')
  @Roles('propietario', 'admin', 'capataz')
  actualizar(
    @CurrentOrg() organizacionId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAnimalCampoDto,
  ) {
    return this.animales.actualizar(organizacionId, id, dto);
  }

  @Patch(':id/conciliar')
  @Roles('propietario', 'admin', 'capataz')
  conciliar(
    @CurrentOrg() organizacionId: string,
    @Param('id') id: string,
    @Body() dto: ConciliarAnimalCampoDto,
  ) {
    return this.animales.conciliar(organizacionId, id, dto);
  }
}

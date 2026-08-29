import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { PotrerosService } from './potreros.service';
import { CreatePotreroDto } from './dto/create-potrero.dto';
import { UpdatePotreroDto } from './dto/update-potrero.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrg } from '../../common/decorators/current-context.decorator';

@Controller('tropera/potreros')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class PotrerosController {
  constructor(private readonly potreros: PotrerosService) {}

  @Post()
  @Roles('propietario', 'admin', 'capataz')
  crear(@CurrentOrg() organizacionId: string, @Body() dto: CreatePotreroDto) {
    return this.potreros.crear(organizacionId, dto);
  }

  @Get()
  listar(@CurrentOrg() organizacionId: string, @Query('establecimientoId') establecimientoId?: string) {
    return this.potreros.listar(organizacionId, establecimientoId);
  }

  @Patch(':id')
  @Roles('propietario', 'admin', 'capataz')
  actualizar(@CurrentOrg() organizacionId: string, @Param('id') id: string, @Body() dto: UpdatePotreroDto) {
    return this.potreros.actualizar(organizacionId, id, dto);
  }

  @Delete(':id')
  @Roles('propietario', 'admin', 'capataz')
  eliminar(@CurrentOrg() organizacionId: string, @Param('id') id: string) {
    return this.potreros.eliminar(organizacionId, id);
  }
}

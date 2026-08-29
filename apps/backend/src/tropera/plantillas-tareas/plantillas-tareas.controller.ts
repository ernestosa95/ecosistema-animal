import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { PlantillasTareasService } from './plantillas-tareas.service';
import { CreatePlantillaDto } from './dto/create-plantilla.dto';
import { AplicarPlantillaDto } from './dto/aplicar-plantilla.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrg, CurrentUser } from '../../common/decorators/current-context.decorator';

@Controller('tropera/plantillas-tareas')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class PlantillasTareasController {
  constructor(private readonly plantillas: PlantillasTareasService) {}

  @Post()
  @Roles('propietario', 'admin', 'capataz')
  crear(@CurrentOrg() organizacionId: string, @Body() dto: CreatePlantillaDto) {
    return this.plantillas.crear(organizacionId, dto);
  }

  @Get()
  listar(@CurrentOrg() organizacionId: string) {
    return this.plantillas.listar(organizacionId);
  }

  @Delete(':id')
  @Roles('propietario', 'admin', 'capataz')
  eliminar(@CurrentOrg() organizacionId: string, @Param('id') id: string) {
    return this.plantillas.eliminar(organizacionId, id);
  }

  @Post(':id/aplicar')
  @Roles('propietario', 'admin', 'capataz')
  aplicar(
    @CurrentOrg() organizacionId: string,
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() dto: AplicarPlantillaDto,
  ) {
    return this.plantillas.aplicar(organizacionId, user.sub, id, dto);
  }
}

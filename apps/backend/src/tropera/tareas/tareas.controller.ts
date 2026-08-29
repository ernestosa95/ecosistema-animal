import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { TareasService } from './tareas.service';
import { UpdateTareaDto } from './dto/update-tarea.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrg } from '../../common/decorators/current-context.decorator';

@Controller('tropera/tareas')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class TareasController {
  constructor(private readonly tareas: TareasService) {}

  @Get()
  listar(
    @CurrentOrg() organizacionId: string,
    @Query('establecimientoId') establecimientoId?: string,
    @Query('animalCampoId') animalCampoId?: string,
    @Query('estado') estado?: string,
  ) {
    return this.tareas.listar(organizacionId, establecimientoId, animalCampoId, estado);
  }

  @Patch(':id')
  @Roles('propietario', 'admin', 'capataz', 'veterinario')
  actualizar(@CurrentOrg() organizacionId: string, @Param('id') id: string, @Body() dto: UpdateTareaDto) {
    return this.tareas.actualizar(organizacionId, id, dto);
  }
}

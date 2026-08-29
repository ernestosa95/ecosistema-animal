import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { PlanesService } from './planes.service';
import { CrearPlanDto } from './dto/crear-plan.dto';
import { ActualizarPlanDto } from './dto/actualizar-plan.dto';

@Controller('admin/planes')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class PlanesController {
  constructor(private readonly planes: PlanesService) {}

  @Get()
  listar() {
    return this.planes.listar();
  }

  @Post()
  crear(@Body() dto: CrearPlanDto) {
    return this.planes.crear(dto);
  }

  @Patch(':id')
  actualizar(@Param('id') id: string, @Body() dto: ActualizarPlanDto) {
    return this.planes.actualizar(id, dto);
  }

  @Delete(':id')
  eliminar(@Param('id') id: string) {
    return this.planes.eliminar(id);
  }
}

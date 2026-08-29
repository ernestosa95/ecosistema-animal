import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { GruposService } from './grupos.service';
import { CrearGrupoDto } from './dto/crear-grupo.dto';
import { ActualizarGrupoDto } from './dto/actualizar-grupo.dto';

@Controller('admin/grupos-organizaciones')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class GruposController {
  constructor(private readonly grupos: GruposService) {}

  @Get()
  listar() {
    return this.grupos.listar();
  }

  @Post()
  crear(@Body() dto: CrearGrupoDto) {
    return this.grupos.crear(dto);
  }

  @Patch(':id')
  actualizar(@Param('id') id: string, @Body() dto: ActualizarGrupoDto) {
    return this.grupos.actualizar(id, dto);
  }

  @Delete(':id')
  eliminar(@Param('id') id: string) {
    return this.grupos.eliminar(id);
  }
}

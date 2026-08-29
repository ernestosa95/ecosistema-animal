import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { MacrosService } from './macros.service';
import { CreateMacroDto } from './dto/create-macro.dto';
import { UpdateMacroDto } from './dto/update-macro.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrg } from '../../common/decorators/current-context.decorator';

@Controller('hce/macros')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class MacrosController {
  constructor(private readonly macros: MacrosService) {}

  @Get()
  listar(@CurrentOrg() organizacionId: string, @Query('categoria') categoria?: string) {
    return this.macros.listar(organizacionId, categoria);
  }

  @Post()
  @Roles('propietario', 'admin', 'veterinario')
  crear(@CurrentOrg() organizacionId: string, @Body() dto: CreateMacroDto) {
    return this.macros.crear(organizacionId, dto);
  }

  @Patch(':id')
  @Roles('propietario', 'admin', 'veterinario')
  actualizar(@CurrentOrg() organizacionId: string, @Param('id') id: string, @Body() dto: UpdateMacroDto) {
    return this.macros.actualizar(organizacionId, id, dto);
  }

  @Delete(':id')
  @Roles('propietario', 'admin', 'veterinario')
  eliminar(@CurrentOrg() organizacionId: string, @Param('id') id: string) {
    return this.macros.eliminar(organizacionId, id);
  }
}

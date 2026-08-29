import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { HallazgosService } from './hallazgos.service';
import { CreateHallazgoDto } from './dto/create-hallazgo.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrg } from '../../common/decorators/current-context.decorator';

@Controller('tropera/hallazgos')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class HallazgosController {
  constructor(private readonly hallazgos: HallazgosService) {}

  @Get()
  listar(@CurrentOrg() organizacionId: string) {
    return this.hallazgos.listar(organizacionId);
  }

  @Post()
  @Roles('propietario', 'admin', 'capataz', 'veterinario')
  crear(@CurrentOrg() organizacionId: string, @Body() dto: CreateHallazgoDto) {
    return this.hallazgos.crear(organizacionId, dto);
  }

  @Delete(':id')
  @Roles('propietario', 'admin', 'capataz', 'veterinario')
  eliminar(@CurrentOrg() organizacionId: string, @Param('id') id: string) {
    return this.hallazgos.eliminar(organizacionId, id);
  }
}

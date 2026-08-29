import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { TorosVirtualesService } from './toros-virtuales.service';
import { CreateToroVirtualDto } from './dto/create-toro-virtual.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrg } from '../../common/decorators/current-context.decorator';

@Controller('tropera/toros-virtuales')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class TorosVirtualesController {
  constructor(private readonly toros: TorosVirtualesService) {}

  @Get()
  listar(@CurrentOrg() organizacionId: string) {
    return this.toros.listar(organizacionId);
  }

  @Post()
  @Roles('propietario', 'admin', 'capataz', 'veterinario')
  crear(@CurrentOrg() organizacionId: string, @Body() dto: CreateToroVirtualDto) {
    return this.toros.crear(organizacionId, dto);
  }

  @Delete(':id')
  @Roles('propietario', 'admin', 'capataz', 'veterinario')
  eliminar(@CurrentOrg() organizacionId: string, @Param('id') id: string) {
    return this.toros.eliminar(organizacionId, id);
  }
}

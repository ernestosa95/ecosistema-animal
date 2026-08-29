import { Body, Controller, Get, Post, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { MuestrasService } from './muestras.service';
import { CreateMuestraDto } from './dto/create-muestra.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrg, CurrentUser } from '../../common/decorators/current-context.decorator';

@Controller('tropera/muestras')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class MuestrasController {
  constructor(private readonly muestras: MuestrasService) {}

  @Post()
  @Roles('propietario', 'admin', 'capataz', 'veterinario')
  crear(@CurrentOrg() organizacionId: string, @CurrentUser() user: { sub: string }, @Body() dto: CreateMuestraDto) {
    return this.muestras.crear(organizacionId, user.sub, dto);
  }

  @Get()
  listar(@CurrentOrg() organizacionId: string, @Query('establecimientoId') establecimientoId?: string) {
    return this.muestras.listar(organizacionId, establecimientoId);
  }

  @Get('ultimo-tubo')
  ultimoTubo(@CurrentOrg() organizacionId: string, @Query('establecimientoId') establecimientoId?: string) {
    if (!establecimientoId) throw new BadRequestException('Se requiere establecimientoId');
    return this.muestras.ultimoTubo(organizacionId, establecimientoId);
  }
}

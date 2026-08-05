import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AnimalesService } from './animales.service';
import { CreateAnimalDto } from './dto/create-animal.dto';
import { UpdateAnimalDto } from './dto/update-animal.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrg } from '../../common/decorators/current-context.decorator';

/**
 * Todas las rutas requieren: token válido (JwtAuthGuard) + pertenencia a la
 * organización activa (TenantGuard). El id de organización se toma del header
 * X-Organizacion-Id y nunca del body, para evitar fugas entre tenants.
 */
@Controller('animales')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class AnimalesController {
  constructor(private readonly animales: AnimalesService) {}

  @Post()
  @Roles('propietario', 'admin', 'veterinario', 'recepcion')
  crear(@CurrentOrg() organizacionId: string, @Body() dto: CreateAnimalDto) {
    return this.animales.crear(organizacionId, dto);
  }

  @Get()
  listar(@CurrentOrg() organizacionId: string) {
    return this.animales.listar(organizacionId);
  }

  @Get(':id')
  obtener(@CurrentOrg() organizacionId: string, @Param('id') id: string) {
    return this.animales.obtener(organizacionId, id);
  }

  @Patch(':id')
  @Roles('propietario', 'admin', 'veterinario', 'recepcion')
  actualizar(
    @CurrentOrg() organizacionId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAnimalDto,
  ) {
    return this.animales.actualizar(organizacionId, id, dto);
  }
}

import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AnimalesService } from './animales.service';
import { CreateAnimalDto } from './dto/create-animal.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentOrg } from '../../common/decorators/current-context.decorator';

/**
 * Todas las rutas requieren: token válido (JwtAuthGuard) + pertenencia a la
 * organización activa (TenantGuard). El id de organización se toma del header
 * X-Organizacion-Id y nunca del body, para evitar fugas entre tenants.
 */
@Controller('animales')
@UseGuards(JwtAuthGuard, TenantGuard)
export class AnimalesController {
  constructor(private readonly animales: AnimalesService) {}

  @Post()
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
}

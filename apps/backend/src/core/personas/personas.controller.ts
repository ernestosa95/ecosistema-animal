import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PersonasService } from './personas.service';
import { CreatePersonaDto } from './dto/create-persona.dto';
import { UpdatePersonaDto } from './dto/update-persona.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrg } from '../../common/decorators/current-context.decorator';

@Controller('personas')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class PersonasController {
  constructor(private readonly personas: PersonasService) {}

  @Post()
  @Roles('propietario', 'admin', 'veterinario', 'recepcion')
  crear(@CurrentOrg() organizacionId: string, @Body() dto: CreatePersonaDto) {
    return this.personas.crear(organizacionId, dto);
  }

  @Get()
  listar(@CurrentOrg() organizacionId: string) {
    return this.personas.listar(organizacionId);
  }

  @Get(':id')
  obtener(@CurrentOrg() organizacionId: string, @Param('id') id: string) {
    return this.personas.obtener(organizacionId, id);
  }

  @Patch(':id')
  @Roles('propietario', 'admin', 'veterinario', 'recepcion')
  actualizar(
    @CurrentOrg() organizacionId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePersonaDto,
  ) {
    return this.personas.actualizar(organizacionId, id, dto);
  }

  @Get(':id/animales')
  animales(@CurrentOrg() organizacionId: string, @Param('id') id: string) {
    return this.personas.listarAnimales(organizacionId, id);
  }

  @Get('veterinarios')
  @Roles('propietario', 'admin', 'veterinario', 'recepcion')
  veterinarios(@CurrentOrg() organizacionId: string) {
    return this.personas.listarVeterinarios(organizacionId);
  }
}

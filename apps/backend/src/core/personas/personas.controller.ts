import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PersonasService } from './personas.service';
import { CreatePersonaDto } from './dto/create-persona.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentOrg } from '../../common/decorators/current-context.decorator';

@Controller('personas')
@UseGuards(JwtAuthGuard, TenantGuard)
export class PersonasController {
  constructor(private readonly personas: PersonasService) {}

  @Post()
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

  @Get(':id/animales')
  animales(@CurrentOrg() organizacionId: string, @Param('id') id: string) {
    return this.personas.listarAnimales(organizacionId, id);
  }
}

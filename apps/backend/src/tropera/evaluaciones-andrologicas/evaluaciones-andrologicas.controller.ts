import { Body, Controller, Get, Post, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { EvaluacionesAndrologicasService } from './evaluaciones-andrologicas.service';
import { CreateEvaluacionAndrologicaDto } from './dto/create-evaluacion-andrologica.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrg, CurrentUser } from '../../common/decorators/current-context.decorator';

@Controller('tropera/evaluaciones-andrologicas')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class EvaluacionesAndrologicasController {
  constructor(private readonly evaluaciones: EvaluacionesAndrologicasService) {}

  @Post()
  @Roles('propietario', 'admin', 'veterinario')
  crear(
    @CurrentOrg() organizacionId: string,
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateEvaluacionAndrologicaDto,
  ) {
    return this.evaluaciones.crear(organizacionId, user.sub, dto);
  }

  @Get()
  listar(@CurrentOrg() organizacionId: string, @Query('animalCampoId') animalCampoId?: string) {
    if (!animalCampoId) throw new BadRequestException('Se requiere animalCampoId');
    return this.evaluaciones.listarPorAnimal(organizacionId, animalCampoId);
  }
}

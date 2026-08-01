import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ConsultasService } from './consultas.service';
import { CreateConsultaDto } from './dto/create-consulta.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import {
  CurrentOrg,
  CurrentUser,
} from '../../common/decorators/current-context.decorator';

@Controller('consultas')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ConsultasController {
  constructor(private readonly consultas: ConsultasService) {}

  @Post()
  crear(
    @CurrentOrg() organizacionId: string,
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateConsultaDto,
  ) {
    return this.consultas.crear(organizacionId, user.sub, dto);
  }

  @Get('animal/:animalId')
  historia(
    @CurrentOrg() organizacionId: string,
    @Param('animalId') animalId: string,
  ) {
    return this.consultas.historiaPorAnimal(organizacionId, animalId);
  }

  @Get(':id')
  obtener(@CurrentOrg() organizacionId: string, @Param('id') id: string) {
    return this.consultas.obtener(organizacionId, id);
  }
}

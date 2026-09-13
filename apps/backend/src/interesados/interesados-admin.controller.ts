import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { InteresadosService } from './interesados.service';

/** Bandeja del super-admin: ver los interesados registrados para el seguimiento manual. */
@Controller('admin/interesados')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class InteresadosAdminController {
  constructor(private readonly interesados: InteresadosService) {}

  @Get()
  listar() {
    return this.interesados.listar();
  }
}

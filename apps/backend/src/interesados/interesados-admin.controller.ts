import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { InteresadosService } from './interesados.service';
import { EditarInteresadoDto } from './dto/editar-interesado.dto';

/** Bandeja del super-admin: ver, corregir y dar de baja interesados para el seguimiento manual. */
@Controller('admin/interesados')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class InteresadosAdminController {
  constructor(private readonly interesados: InteresadosService) {}

  @Get()
  listar() {
    return this.interesados.listar();
  }

  @Patch(':id')
  editar(@Param('id') id: string, @Body() dto: EditarInteresadoDto) {
    return this.interesados.editar(id, dto);
  }

  @Delete(':id')
  eliminar(@Param('id') id: string) {
    return this.interesados.eliminar(id);
  }

  @Post(':id/reenviar')
  reenviar(@Param('id') id: string) {
    return this.interesados.reenviarConfirmacion(id);
  }

  /** Dispara el link de "terminá tu alta" a todos los que tengan email cargado — ver InteresadosService.invitarTodos(). */
  @Post('invitar-todos')
  invitarTodos() {
    return this.interesados.invitarTodos();
  }
}

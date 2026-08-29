import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { CurrentUser } from '../../common/decorators/current-context.decorator';
import { MensajesAdminService } from './mensajes-admin.service';
import { CrearMensajeDto } from './dto/crear-mensaje.dto';

@Controller('admin/mensajes')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class MensajesAdminController {
  constructor(private readonly mensajes: MensajesAdminService) {}

  @Get()
  listar() {
    return this.mensajes.listar();
  }

  @Post()
  crear(@CurrentUser() user: { sub: string }, @Body() dto: CrearMensajeDto) {
    return this.mensajes.crear(user.sub, dto);
  }

  @Delete(':id')
  eliminar(@Param('id') id: string) {
    return this.mensajes.eliminar(id);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { AdminService } from './admin.service';
import { CrearOrganizacionDto } from './dto/crear-organizacion.dto';
import { AgregarMiembroDto } from './dto/agregar-miembro.dto';
import { SetRolesDto } from './dto/set-roles.dto';
import { SetAccesoDto } from './dto/set-acceso.dto';

/** Todas las rutas requieren usuario autenticado + super-admin de plataforma. */
@Controller('admin')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('organizaciones')
  listarOrganizaciones() {
    return this.admin.listarOrganizaciones();
  }

  @Post('organizaciones')
  crearOrganizacion(@Body() dto: CrearOrganizacionDto) {
    return this.admin.crearOrganizacion(dto);
  }

  @Patch('organizaciones/:id/activo')
  setActivo(@Param('id') id: string, @Body('activo') activo: boolean) {
    return this.admin.setActivo(id, activo);
  }

  @Patch('organizaciones/:id/acceso')
  setAcceso(@Param('id') id: string, @Body() dto: SetAccesoDto) {
    return this.admin.setAcceso(id, dto);
  }

  @Delete('organizaciones/:id')
  eliminar(@Param('id') id: string) {
    return this.admin.eliminar(id);
  }

  @Get('organizaciones/:id/export')
  exportar(@Param('id') id: string) {
    return this.admin.exportar(id);
  }

  @Get('organizaciones/:id/miembros')
  miembros(@Param('id') id: string) {
    return this.admin.miembros(id);
  }

  @Post('organizaciones/:id/miembros')
  agregarMiembro(@Param('id') id: string, @Body() dto: AgregarMiembroDto) {
    return this.admin.agregarMiembro(id, dto);
  }

  @Delete('organizaciones/:id/miembros/:membresiaId')
  quitarMiembro(@Param('id') id: string, @Param('membresiaId') membresiaId: string) {
    return this.admin.quitarMiembro(id, membresiaId);
  }

  @Patch('organizaciones/:id/miembros/:membresiaId/activo')
  setMiembroActivo(
    @Param('id') id: string,
    @Param('membresiaId') membresiaId: string,
    @Body('activo') activo: boolean,
  ) {
    return this.admin.setMiembroActivo(id, membresiaId, activo);
  }

  @Patch('organizaciones/:id/miembros/:membresiaId/roles')
  setRoles(
    @Param('id') id: string,
    @Param('membresiaId') membresiaId: string,
    @Body() dto: SetRolesDto,
  ) {
    return this.admin.setRoles(id, membresiaId, dto.roles as any);
  }
}

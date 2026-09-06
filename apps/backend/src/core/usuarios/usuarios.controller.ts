import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AgregarMiembroDto } from './dto/agregar-miembro.dto';
import { ActualizarRolesDto } from './dto/actualizar-roles.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrg, CurrentRol } from '../../common/decorators/current-context.decorator';

@Controller('usuarios')
@UseGuards(JwtAuthGuard, TenantGuard)
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  /**
   * Lista los miembros activos de la organización.
   * Filtro opcional por rol: /usuarios?rol=veterinario
   */
  @Get()
  listar(@CurrentOrg() organizacionId: string, @Query('rol') rol?: string) {
    return this.usuarios.listarMiembros(organizacionId, rol);
  }

  /** Cupo por rol del plan + cuántos hay usados hoy (para el wizard de configuración rápida). */
  @Get('limites-plan')
  limitesPlan(@CurrentOrg() organizacionId: string) {
    return this.usuarios.limitesPlan(organizacionId);
  }

  /**
   * Alta de un miembro de la propia organización. Solo propietario/admin.
   * RolesGuard corre después de TenantGuard (usa req.roles).
   */
  @Post()
  @Roles('propietario', 'admin')
  @UseGuards(RolesGuard)
  agregarMiembro(@CurrentOrg() organizacionId: string, @Body() dto: AgregarMiembroDto) {
    return this.usuarios.agregarMiembro(organizacionId, dto);
  }

  /**
   * Reemplaza el conjunto de roles de un miembro activo de la organización.
   * Solo propietario/admin. RolesGuard corre después de TenantGuard (usa req.roles).
   */
  @Patch(':id/roles')
  @Roles('propietario', 'admin')
  @UseGuards(RolesGuard)
  actualizarRoles(
    @CurrentOrg() organizacionId: string,
    @CurrentRol() actorRoles: string[],
    @Param('id') id: string,
    @Body() dto: ActualizarRolesDto,
  ) {
    return this.usuarios.actualizarRoles(organizacionId, actorRoles, id, dto);
  }

  /**
   * Resetea la contraseña de un miembro de la organización.
   * Solo propietario/admin. RolesGuard corre después de TenantGuard (usa req.roles).
   */
  @Patch(':id/password')
  @Roles('propietario', 'admin')
  @UseGuards(RolesGuard)
  resetPassword(
    @CurrentOrg() organizacionId: string,
    @CurrentRol() actorRoles: string[],
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.usuarios.resetearPassword(organizacionId, actorRoles, id, dto.nuevaPassword);
  }
}

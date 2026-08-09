import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentOrg } from '../../common/decorators/current-context.decorator';

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
}

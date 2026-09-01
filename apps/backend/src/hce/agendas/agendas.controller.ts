import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AgendasService } from './agendas.service';
import { CrearAgendaDto } from './dto/crear-agenda.dto';
import { ActualizarAgendaDto } from './dto/actualizar-agenda.dto';
import { CrearBloqueDto } from './dto/crear-bloque.dto';
import { CrearExcepcionDto } from './dto/crear-excepcion.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrg } from '../../common/decorators/current-context.decorator';

/**
 * Lectura (listar/slots): mismos roles que ya pueden operar turnos — hace
 * falta para armar un turno desde el mostrador. Escritura (crear/editar/
 * eliminar agenda, bloque, excepción): sólo propietario/admin — es
 * configuración administrativa de la clínica, no operación de mostrador.
 */
@Controller('agendas')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class AgendasController {
  constructor(private readonly agendas: AgendasService) {}

  @Get()
  @Roles('propietario', 'admin', 'veterinario', 'recepcion')
  listar(@CurrentOrg() organizacionId: string) {
    return this.agendas.listar(organizacionId);
  }

  @Post()
  @Roles('propietario', 'admin')
  crear(@CurrentOrg() organizacionId: string, @Body() dto: CrearAgendaDto) {
    return this.agendas.crear(organizacionId, dto);
  }

  @Patch(':id')
  @Roles('propietario', 'admin')
  actualizar(
    @CurrentOrg() organizacionId: string,
    @Param('id') id: string,
    @Body() dto: ActualizarAgendaDto,
  ) {
    return this.agendas.actualizar(organizacionId, id, dto);
  }

  @Delete(':id')
  @Roles('propietario', 'admin')
  eliminar(@CurrentOrg() organizacionId: string, @Param('id') id: string) {
    return this.agendas.eliminar(organizacionId, id);
  }

  @Get(':id/bloques')
  @Roles('propietario', 'admin', 'veterinario', 'recepcion')
  listarBloques(@CurrentOrg() organizacionId: string, @Param('id') id: string) {
    return this.agendas.listarBloques(organizacionId, id);
  }

  @Post(':id/bloques')
  @Roles('propietario', 'admin')
  crearBloque(
    @CurrentOrg() organizacionId: string,
    @Param('id') id: string,
    @Body() dto: CrearBloqueDto,
  ) {
    return this.agendas.crearBloque(organizacionId, id, dto);
  }

  @Delete(':id/bloques/:bloqueId')
  @Roles('propietario', 'admin')
  eliminarBloque(
    @CurrentOrg() organizacionId: string,
    @Param('id') id: string,
    @Param('bloqueId') bloqueId: string,
  ) {
    return this.agendas.eliminarBloque(organizacionId, id, bloqueId);
  }

  @Get(':id/excepciones')
  @Roles('propietario', 'admin', 'veterinario', 'recepcion')
  listarExcepciones(@CurrentOrg() organizacionId: string, @Param('id') id: string) {
    return this.agendas.listarExcepciones(organizacionId, id);
  }

  @Post(':id/excepciones')
  @Roles('propietario', 'admin')
  crearExcepcion(
    @CurrentOrg() organizacionId: string,
    @Param('id') id: string,
    @Body() dto: CrearExcepcionDto,
  ) {
    return this.agendas.crearExcepcion(organizacionId, id, dto);
  }

  @Delete(':id/excepciones/:excepcionId')
  @Roles('propietario', 'admin')
  eliminarExcepcion(
    @CurrentOrg() organizacionId: string,
    @Param('id') id: string,
    @Param('excepcionId') excepcionId: string,
  ) {
    return this.agendas.eliminarExcepcion(organizacionId, id, excepcionId);
  }

  @Get(':id/slots')
  @Roles('propietario', 'admin', 'veterinario', 'recepcion')
  slots(
    @CurrentOrg() organizacionId: string,
    @Param('id') id: string,
    @Query('fecha') fecha: string,
    /** Al reprogramar, el propio turno no debe verse a sí mismo como "ocupado". */
    @Query('excluirTurnoId') excluirTurnoId?: string,
  ) {
    return this.agendas.slotsDisponibles(organizacionId, id, fecha, excluirTurnoId);
  }
}

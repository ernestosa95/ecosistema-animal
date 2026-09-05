import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CajasService } from './cajas.service';
import { AbrirCajaDto } from './dto/abrir-caja.dto';
import { CerrarCajaDto } from './dto/cerrar-caja.dto';
import { AuditarCajaDto } from './dto/auditar-caja.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrg, CurrentUser } from '../../common/decorators/current-context.decorator';

@Controller('caja/cajas')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class CajasController {
  constructor(private readonly cajas: CajasService) {}

  /** Antes de devolver la caja del día, normaliza (cierra sola una caja abierta que quedó de un día anterior — ver CajasService.normalizarDelDia()). */
  @Get('actual')
  @Roles('propietario', 'admin', 'recepcion')
  async actual(@CurrentOrg() organizacionId: string, @CurrentUser() user: { sub: string }) {
    await this.cajas.normalizarDelDia(organizacionId, user.sub);
    return this.cajas.actual(organizacionId);
  }

  @Post()
  @Roles('propietario', 'admin', 'recepcion')
  abrir(@CurrentOrg() organizacionId: string, @CurrentUser() user: { sub: string }, @Body() dto: AbrirCajaDto) {
    return this.cajas.abrir(organizacionId, user.sub, dto);
  }

  @Patch(':id/cerrar')
  @Roles('propietario', 'admin', 'recepcion')
  cerrar(
    @CurrentOrg() organizacionId: string,
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() dto: CerrarCajaDto,
  ) {
    return this.cajas.cerrar(organizacionId, user.sub, id, dto);
  }

  /** Bandeja de auditoría (§4.1) — sólo propietario/gerente. */
  @Get()
  @Roles('propietario', 'admin')
  listar(@CurrentOrg() organizacionId: string, @Query('estadoAuditoria') estadoAuditoria?: string) {
    return this.cajas.listar(organizacionId, estadoAuditoria);
  }

  /** Totales del período (cobros/egresos/neto, por método de pago, por día) — sólo propietario/gerente. */
  @Get('estadisticas')
  @Roles('propietario', 'admin')
  estadisticas(
    @CurrentOrg() organizacionId: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.cajas.estadisticas(organizacionId, desde, hasta);
  }

  @Patch(':id/auditoria')
  @Roles('propietario', 'admin')
  auditar(
    @CurrentOrg() organizacionId: string,
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() dto: AuditarCajaDto,
  ) {
    return this.cajas.auditar(organizacionId, user.sub, id, dto);
  }
}

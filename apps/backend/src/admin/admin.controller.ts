import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { CurrentUser } from '../common/decorators/current-context.decorator';
import { AdminService } from './admin.service';
import { CrearOrganizacionDto } from './dto/crear-organizacion.dto';
import { AgregarMiembroDto } from './dto/agregar-miembro.dto';
import { SetRolesDto } from './dto/set-roles.dto';
import { SetAccesoDto } from './dto/set-acceso.dto';
import { SetSolucionesDto } from './dto/set-soluciones.dto';
import { RegistrarPagoDto } from './dto/registrar-pago.dto';
import { RevisarPagoDto } from './dto/revisar-pago.dto';

/** Todas las rutas requieren usuario autenticado + super-admin de plataforma. */
@Controller('admin')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  // Endpoint liviano para que el login del panel /admin (web) confirme que
  // quien acaba de loguearse es super-admin antes de entrar al panel — sin
  // esto, cualquier usuario con cuenta válida podía "iniciar sesión" en
  // /admin (POST /auth/login no distingue super-admin) y recién se enteraba
  // de que no tenía permiso al ver un 403 en la primera lista que cargaba.
  @Get('whoami')
  whoami() {
    return { ok: true };
  }

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

  @Get('resumen-pagos')
  resumenPagos() {
    return this.admin.resumenPagos();
  }

  /** Manda por email un recordatorio de pago a los propietarios/admins activos de la organización. */
  @Post('organizaciones/:id/recordatorio-pago')
  enviarRecordatorioPago(@Param('id') id: string) {
    return this.admin.enviarRecordatorioPago(id);
  }

  @Get('pagos/ganancias')
  gananciasPorPeriodo() {
    return this.admin.gananciasPorPeriodo();
  }

  @Get('analitica')
  resumenAnalitica(@Query('desde') desde?: string, @Query('hasta') hasta?: string) {
    return this.admin.resumenAnalitica(desde, hasta);
  }

  @Get('organizaciones/:id/pagos')
  listarPagos(@Param('id') id: string) {
    return this.admin.listarPagos(id);
  }

  @Post('organizaciones/:id/pagos')
  registrarPago(@Param('id') id: string, @Body() dto: RegistrarPagoDto, @CurrentUser() user: { sub: string }) {
    return this.admin.registrarPago(id, dto, user?.sub);
  }

  /** Cola de pagos cargados por las propias organizaciones (comprobante de transferencia) a la espera de revisión. */
  @Get('pagos/pendientes')
  listarPagosPendientes() {
    return this.admin.listarPagosPendientes();
  }

  /** Aprueba o rechaza un pago pendiente. */
  @Post('pagos/:id/revisar')
  revisarPago(@Param('id') id: string, @Body() dto: RevisarPagoDto, @CurrentUser() user: { sub: string }) {
    return this.admin.revisarPago(id, dto.aprobar, user.sub, dto.motivoRechazo);
  }

  @Patch('organizaciones/:id/soluciones')
  setSoluciones(@Param('id') id: string, @Body() dto: SetSolucionesDto) {
    return this.admin.setSoluciones(id, dto);
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

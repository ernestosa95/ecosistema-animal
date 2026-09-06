import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrg, CurrentUser } from '../../common/decorators/current-context.decorator';
import { OrganizacionService } from './organizacion.service';
import { RegistrarPagoOrgDto } from './dto/registrar-pago-org.dto';
import { OPCIONES_COMPROBANTE_PAGO, comprobanteUrlDeArchivo } from '../../common/comprobante-pago-upload';
import { OPCIONES_LOGO_ORGANIZACION, logoUrlDeArchivo } from '../../common/logo-organizacion-upload';

/**
 * Self-service para el propietario/admin de la propia organización: plan
 * actual, próximo vencimiento y carga de pagos por transferencia (quedan
 * pendientes de revisión del super-admin) — distinto de `admin/`, que es
 * la gestión de plataforma para el super-admin sobre CUALQUIER organización.
 */
@Controller('organizacion')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class OrganizacionController {
  constructor(private readonly organizacion: OrganizacionService) {}

  @Get('plan')
  @Roles('propietario', 'admin')
  miPlan(@CurrentOrg() organizacionId: string) {
    return this.organizacion.miPlan(organizacionId);
  }

  @Get('pagos')
  @Roles('propietario', 'admin')
  listarPagos(@CurrentOrg() organizacionId: string) {
    return this.organizacion.listarPagos(organizacionId);
  }

  @Post('pagos')
  @Roles('propietario', 'admin')
  @UseInterceptors(FileInterceptor('comprobante', OPCIONES_COMPROBANTE_PAGO))
  registrarPago(
    @CurrentOrg() organizacionId: string,
    @CurrentUser() user: { sub: string },
    @Body() dto: RegistrarPagoOrgDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Falta el comprobante de la transferencia');
    return this.organizacion.registrarPagoPendiente(organizacionId, dto, user.sub, comprobanteUrlDeArchivo(file));
  }

  /** Sube/reemplaza el logo de la organización — se muestra en carnet, ficha y el portal del dueño. */
  @Post('logo')
  @Roles('propietario', 'admin')
  @UseInterceptors(FileInterceptor('logo', OPCIONES_LOGO_ORGANIZACION))
  actualizarLogo(
    @CurrentOrg() organizacionId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Falta el archivo del logo');
    return this.organizacion.actualizarLogo(organizacionId, logoUrlDeArchivo(file));
  }
}

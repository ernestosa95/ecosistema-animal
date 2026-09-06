import { Body, Controller, Get, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SolicitudesService } from './solicitudes.service';
import { CrearSolicitudDto } from './dto/crear-solicitud.dto';
import { EnviarCodigoVerificacionDto } from './dto/enviar-codigo-verificacion.dto';
import { ConfirmarCodigoVerificacionDto } from './dto/confirmar-codigo-verificacion.dto';

// Mismo criterio que LIMITE_AUTH_SENSIBLE de auth.controller.ts: público, sin
// sesión previa, y hace que el backend mande mail a costa nuestra en Resend
// — blanco fácil de spam si no se limita.
const LIMITE_VERIFICACION_EMAIL = { default: { limit: 5, ttl: 900_000 } }; // 5 cada 15 min por IP

/** Endpoints PÚBLICOS: cualquiera puede enviar una solicitud de registro o ver los planes disponibles. */
@Controller('solicitudes')
export class SolicitudesController {
  constructor(private readonly solicitudes: SolicitudesService) {}

  @Get('planes')
  planesDisponibles() {
    return this.solicitudes.planesDisponibles();
  }

  /** Paso 1 de la verificación de email previa al alta: manda el código de 6 dígitos. */
  @Throttle(LIMITE_VERIFICACION_EMAIL)
  @Post('verificar-email')
  enviarCodigoVerificacion(@Body() dto: EnviarCodigoVerificacionDto) {
    return this.solicitudes.enviarCodigoVerificacion(dto.email);
  }

  /** Paso 2: confirma el código y devuelve el token que hay que adjuntar al crear la solicitud. */
  @Throttle(LIMITE_VERIFICACION_EMAIL)
  @Post('verificar-email/confirmar')
  confirmarCodigoVerificacion(@Body() dto: ConfirmarCodigoVerificacionDto) {
    return this.solicitudes.confirmarCodigoVerificacion(dto.token, dto.codigo);
  }

  @Post()
  crear(@Body() dto: CrearSolicitudDto) {
    return this.solicitudes.crear(dto);
  }
}

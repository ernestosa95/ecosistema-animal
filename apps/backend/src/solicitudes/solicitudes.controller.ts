import { Body, Controller, Get, Post } from '@nestjs/common';
import { SolicitudesService } from './solicitudes.service';
import { CrearSolicitudDto } from './dto/crear-solicitud.dto';

/** Endpoints PÚBLICOS: cualquiera puede enviar una solicitud de registro o ver los planes disponibles. */
@Controller('solicitudes')
export class SolicitudesController {
  constructor(private readonly solicitudes: SolicitudesService) {}

  @Get('planes')
  planesDisponibles() {
    return this.solicitudes.planesDisponibles();
  }

  @Post()
  crear(@Body() dto: CrearSolicitudDto) {
    return this.solicitudes.crear(dto);
  }
}

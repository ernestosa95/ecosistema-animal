import { Body, Controller, Post } from '@nestjs/common';
import { SolicitudesService } from './solicitudes.service';
import { CrearSolicitudDto } from './dto/crear-solicitud.dto';

/** Endpoint PÚBLICO: cualquiera puede enviar una solicitud de registro. */
@Controller('solicitudes')
export class SolicitudesController {
  constructor(private readonly solicitudes: SolicitudesService) {}

  @Post()
  crear(@Body() dto: CrearSolicitudDto) {
    return this.solicitudes.crear(dto);
  }
}

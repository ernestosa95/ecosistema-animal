import { Body, Controller, Get, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { InteresadosService } from './interesados.service';
import { CrearInteresadoDto } from './dto/crear-interesado.dto';

// Mismo criterio que LIMITE_AUTH_SENSIBLE de auth.controller.ts: público, sin
// sesión, blanco fácil de spam si no se limita — más estricto que el límite
// global de la API (100/min, ver app.module.ts).
const LIMITE_INTERESADOS = { default: { limit: 5, ttl: 900_000 } }; // 5 cada 15 min por IP

/** Endpoints PÚBLICOS de la landing — captura de interés para el lanzamiento (cupo fijo, ver InteresadosService). */
@Controller('interesados')
export class InteresadosController {
  constructor(private readonly interesados: InteresadosService) {}

  @Get('cupo')
  cupo() {
    return this.interesados.cupo();
  }

  @Throttle(LIMITE_INTERESADOS)
  @Post()
  crear(@Body() dto: CrearInteresadoDto) {
    return this.interesados.crear(dto);
  }
}

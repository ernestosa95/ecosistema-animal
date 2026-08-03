import {
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentOrg } from '../common/decorators/current-context.decorator';
import { DRIZZLE, DrizzleDB } from '../database/drizzle.provider';
import { personas } from '../database/schema';
import { PortalGuard } from './portal.guard';
import { PortalService } from './portal.service';
import { PortalTokenService } from './portal-token.service';
import { SolicitarTurnoDto } from './dto/solicitar-turno.dto';

@Controller('portal')
export class PortalController {
  constructor(
    private readonly portal: PortalService,
    private readonly tokens: PortalTokenService,
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
  ) {}

  /**
   * STAFF — genera el enlace de acceso (magic-link) de un dueño.
   * POST /portal/acceso/:personaId   (requiere sesión de staff + organización)
   */
  @Post('acceso/:personaId')
  @UseGuards(JwtAuthGuard, TenantGuard)
  async generarAcceso(
    @Param('personaId') personaId: string,
    @CurrentOrg() organizacionId: string,
  ) {
    const [persona] = await this.db
      .select({ id: personas.id, organizacionId: personas.organizacionId })
      .from(personas)
      .where(
        and(
          eq(personas.id, personaId),
          eq(personas.organizacionId, organizacionId),
          isNull(personas.deletedAt),
        ),
      )
      .limit(1);

    if (!persona) {
      throw new NotFoundException('Dueño no encontrado en esta organización');
    }

    const token = this.tokens.emitir(persona);
    const base = process.env.PORTAL_BASE_URL ?? 'http://localhost:5173';
    return { token, portalUrl: `${base}/?token=${token}` };
  }

  /** DUEÑO — su resumen (mascotas, vacunas, turnos, consultas). */
  @Get('resumen')
  @UseGuards(PortalGuard)
  resumen(@Req() req: any) {
    return this.portal.resumen(req.persona);
  }

  /** DUEÑO — solicita un turno para una de sus mascotas. */
  @Post('turnos')
  @UseGuards(PortalGuard)
  solicitar(@Req() req: any, @Body() dto: SolicitarTurnoDto) {
    return this.portal.solicitarTurno(req.persona, dto);
  }
}

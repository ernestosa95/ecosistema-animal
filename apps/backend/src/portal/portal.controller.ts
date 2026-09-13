import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { and, eq, isNull } from 'drizzle-orm';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentOrg } from '../common/decorators/current-context.decorator';
import { OPCIONES_FOTO_ANIMAL, fotoUrlDeArchivo } from '../common/foto-animal-upload';
import { DRIZZLE, DrizzleDB } from '../database/drizzle.provider';
import { personas } from '../database/schema';
import { PortalGuard } from './portal.guard';
import { PortalService } from './portal.service';
import { PortalTokenService } from './portal-token.service';
import { PortalCodigoService } from './portal-codigo.service';
import { SolicitarTurnoDto } from './dto/solicitar-turno.dto';
import { CanjearCodigoDto } from './dto/canjear-codigo.dto';

@Controller('portal')
export class PortalController {
  constructor(
    private readonly portal: PortalService,
    private readonly tokens: PortalTokenService,
    private readonly codigos: PortalCodigoService,
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
  ) {}

  /**
   * STAFF — genera el enlace de acceso (magic-link) de un dueño.
   * POST /portal/acceso/:personaId   (requiere sesión de staff + organización)
   */
  @Post('acceso/:personaId')
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles('propietario', 'admin', 'veterinario', 'recepcion')
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

  /**
   * DUEÑO — canjea DNI + código por el mismo token que emite el magic-link.
   * POST /portal/codigo/canjear   (público, sin guards — el código+DNI es la credencial)
   * Declarada ANTES de 'codigo/:personaId': si no, esa ruta con parámetro
   * matchea primero y "canjear" se interpretaría como un personaId.
   */
  @Post('codigo/canjear')
  async canjearCodigo(@Body() dto: CanjearCodigoDto) {
    const persona = await this.codigos.canjear(dto.dni, dto.codigo);
    return { token: this.tokens.emitir(persona) };
  }

  /**
   * STAFF — genera un código corto de acceso (DNI + código, 15 min, un solo
   * uso) para cuando el dueño no tiene a mano el link/QR anterior.
   * POST /portal/codigo/:personaId   (requiere sesión de staff + organización)
   */
  @Post('codigo/:personaId')
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles('propietario', 'admin', 'veterinario', 'recepcion')
  generarCodigo(@Param('personaId') personaId: string, @CurrentOrg() organizacionId: string) {
    return this.codigos.generar(personaId, organizacionId);
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

  /**
   * DUEÑO — sube/reemplaza la foto de perfil de una de sus mascotas.
   * Opciones de multer compartidas con el alta desde la ficha (staff) — ver
   * common/foto-animal-upload.ts.
   */
  @Post('animales/:animalId/foto')
  @UseGuards(PortalGuard)
  @UseInterceptors(FileInterceptor('foto', OPCIONES_FOTO_ANIMAL))
  async subirFoto(@Req() req: any, @Param('animalId') animalId: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Falta el archivo de la foto');
    return this.portal.actualizarFoto(req.persona, animalId, fotoUrlDeArchivo(file));
  }
}

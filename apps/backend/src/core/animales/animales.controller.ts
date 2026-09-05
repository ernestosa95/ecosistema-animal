import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AnimalesService } from './animales.service';
import { CreateAnimalDto } from './dto/create-animal.dto';
import { UpdateAnimalDto } from './dto/update-animal.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrg } from '../../common/decorators/current-context.decorator';
import { OPCIONES_FOTO_ANIMAL, fotoUrlDeArchivo } from '../../common/foto-animal-upload';

/**
 * Todas las rutas requieren: token válido (JwtAuthGuard) + pertenencia a la
 * organización activa (TenantGuard). El id de organización se toma del header
 * X-Organizacion-Id y nunca del body, para evitar fugas entre tenants.
 */
@Controller('animales')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class AnimalesController {
  constructor(private readonly animales: AnimalesService) {}

  @Post()
  @Roles('propietario', 'admin', 'veterinario', 'recepcion')
  crear(@CurrentOrg() organizacionId: string, @Body() dto: CreateAnimalDto) {
    return this.animales.crear(organizacionId, dto);
  }

  @Get()
  listar(@CurrentOrg() organizacionId: string) {
    return this.animales.listar(organizacionId);
  }

  @Get(':id')
  obtener(@CurrentOrg() organizacionId: string, @Param('id') id: string) {
    return this.animales.obtener(organizacionId, id);
  }

  @Patch(':id')
  @Roles('propietario', 'admin', 'veterinario', 'recepcion')
  actualizar(
    @CurrentOrg() organizacionId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAnimalDto,
  ) {
    return this.animales.actualizar(organizacionId, id, dto);
  }

  /**
   * STAFF — sube/reemplaza la foto de perfil del paciente desde la ficha
   * (a diferencia de `portal/portal.controller.ts`, que es el mismo flujo
   * pero para el dueño vía magic-link). Mismas opciones de multer
   * compartidas (common/foto-animal-upload.ts).
   */
  @Post(':id/foto')
  @Roles('propietario', 'admin', 'veterinario', 'recepcion')
  @UseInterceptors(FileInterceptor('foto', OPCIONES_FOTO_ANIMAL))
  subirFoto(
    @CurrentOrg() organizacionId: string,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Falta el archivo de la foto');
    return this.animales.actualizar(organizacionId, id, { fotoUrl: fotoUrlDeArchivo(file) });
  }
}

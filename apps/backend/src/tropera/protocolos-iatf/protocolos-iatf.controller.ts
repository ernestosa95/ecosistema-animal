import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ProtocolosIatfService } from './protocolos-iatf.service';
import { CreateProtocoloIatfDto } from './dto/create-protocolo-iatf.dto';
import { AplicarProtocoloIatfDto } from './dto/aplicar-protocolo-iatf.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrg } from '../../common/decorators/current-context.decorator';

@Controller('tropera/protocolos-iatf')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class ProtocolosIatfController {
  constructor(private readonly protocolos: ProtocolosIatfService) {}

  @Post()
  @Roles('propietario', 'admin', 'veterinario')
  crear(@CurrentOrg() organizacionId: string, @Body() dto: CreateProtocoloIatfDto) {
    return this.protocolos.crear(organizacionId, dto);
  }

  @Get()
  listar(@CurrentOrg() organizacionId: string) {
    return this.protocolos.listar(organizacionId);
  }

  @Delete(':id')
  @Roles('propietario', 'admin', 'veterinario')
  eliminar(@CurrentOrg() organizacionId: string, @Param('id') id: string) {
    return this.protocolos.eliminar(organizacionId, id);
  }

  @Post(':id/aplicar')
  @Roles('propietario', 'admin', 'veterinario')
  aplicar(@CurrentOrg() organizacionId: string, @Param('id') id: string, @Body() dto: AplicarProtocoloIatfDto) {
    return this.protocolos.aplicar(organizacionId, id, dto);
  }
}

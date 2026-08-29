import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ProductosService } from './productos.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrg } from '../../common/decorators/current-context.decorator';

@Controller('farmacia/productos')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class ProductosController {
  constructor(private readonly productos: ProductosService) {}

  @Post()
  @Roles('propietario', 'admin', 'veterinario')
  crear(@CurrentOrg() organizacionId: string, @Body() dto: CreateProductoDto) {
    return this.productos.crear(organizacionId, dto);
  }

  @Get()
  listar(@CurrentOrg() organizacionId: string) {
    return this.productos.listar(organizacionId);
  }

  @Get(':id')
  obtener(@CurrentOrg() organizacionId: string, @Param('id') id: string) {
    return this.productos.obtener(organizacionId, id);
  }

  @Patch(':id')
  @Roles('propietario', 'admin', 'veterinario')
  actualizar(
    @CurrentOrg() organizacionId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProductoDto,
  ) {
    return this.productos.actualizar(organizacionId, id, dto);
  }
}

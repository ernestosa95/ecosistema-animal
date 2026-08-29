import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { StockService } from './stock.service';
import { SetStockDto } from './dto/set-stock.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrg } from '../../common/decorators/current-context.decorator';

@Controller('farmacia/stock')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class StockController {
  constructor(private readonly stock: StockService) {}

  @Get()
  listar(@CurrentOrg() organizacionId: string) {
    return this.stock.listar(organizacionId);
  }

  @Patch(':productoId')
  @Roles('propietario', 'admin', 'veterinario')
  fijar(
    @CurrentOrg() organizacionId: string,
    @Param('productoId') productoId: string,
    @Body() dto: SetStockDto,
  ) {
    return this.stock.fijar(organizacionId, productoId, dto);
  }
}

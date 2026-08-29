import { Module } from '@nestjs/common';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';
import { AuthModule } from '../../core/auth/auth.module';
import { ProductosModule } from '../productos/productos.module';

@Module({
  imports: [AuthModule, ProductosModule],
  controllers: [StockController],
  providers: [StockService],
})
export class StockModule {}

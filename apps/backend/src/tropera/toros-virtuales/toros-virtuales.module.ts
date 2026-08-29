import { Module } from '@nestjs/common';
import { TorosVirtualesController } from './toros-virtuales.controller';
import { TorosVirtualesService } from './toros-virtuales.service';
import { AuthModule } from '../../core/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [TorosVirtualesController],
  providers: [TorosVirtualesService],
})
export class TorosVirtualesModule {}

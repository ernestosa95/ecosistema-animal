import { Module } from '@nestjs/common';
import { MuestrasController } from './muestras.controller';
import { MuestrasService } from './muestras.service';
import { AuthModule } from '../../core/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [MuestrasController],
  providers: [MuestrasService],
})
export class MuestrasModule {}

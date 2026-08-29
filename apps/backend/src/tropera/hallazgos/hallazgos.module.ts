import { Module } from '@nestjs/common';
import { HallazgosController } from './hallazgos.controller';
import { HallazgosService } from './hallazgos.service';
import { AuthModule } from '../../core/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [HallazgosController],
  providers: [HallazgosService],
  exports: [HallazgosService],
})
export class HallazgosModule {}

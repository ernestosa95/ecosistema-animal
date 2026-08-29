import { Module } from '@nestjs/common';
import { EvaluacionesAndrologicasController } from './evaluaciones-andrologicas.controller';
import { EvaluacionesAndrologicasService } from './evaluaciones-andrologicas.service';
import { AuthModule } from '../../core/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [EvaluacionesAndrologicasController],
  providers: [EvaluacionesAndrologicasService],
})
export class EvaluacionesAndrologicasModule {}

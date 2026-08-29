import { Module } from '@nestjs/common';
import { AnimalesCampoController } from './animales-campo.controller';
import { AnimalesCampoService } from './animales-campo.service';
import { AuthModule } from '../../core/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AnimalesCampoController],
  providers: [AnimalesCampoService],
})
export class AnimalesCampoModule {}

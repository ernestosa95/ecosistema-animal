import { Module } from '@nestjs/common';
import { EventosUsoController } from './eventos-uso.controller';
import { EventosUsoService } from './eventos-uso.service';
import { AuthModule } from '../core/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [EventosUsoController],
  providers: [EventosUsoService],
})
export class AnaliticaModule {}

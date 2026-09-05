import { Module } from '@nestjs/common';
import { VademecumSenasaController } from './vademecum-senasa.controller';
import { VademecumSenasaService } from './vademecum-senasa.service';
import { AuthModule } from '../../core/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [VademecumSenasaController],
  providers: [VademecumSenasaService],
})
export class VademecumSenasaModule {}

import { Module } from '@nestjs/common';
import { ProtocolosIatfController } from './protocolos-iatf.controller';
import { ProtocolosIatfService } from './protocolos-iatf.service';
import { AuthModule } from '../../core/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ProtocolosIatfController],
  providers: [ProtocolosIatfService],
})
export class ProtocolosIatfModule {}

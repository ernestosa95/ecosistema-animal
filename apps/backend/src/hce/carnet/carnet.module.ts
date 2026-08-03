import { Module } from '@nestjs/common';
import { CarnetController } from './carnet.controller';
import { CarnetService } from './carnet.service';

@Module({
  controllers: [CarnetController],
  providers: [CarnetService],
})
export class CarnetModule {}

// Registrá este módulo dentro de tu HceModule (o AppModule):
//
//   import { CarnetModule } from './carnet/carnet.module';
//   @Module({ imports: [/* ... */ CarnetModule] })
//   export class HceModule {}

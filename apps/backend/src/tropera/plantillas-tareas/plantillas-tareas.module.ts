import { Module } from '@nestjs/common';
import { PlantillasTareasController } from './plantillas-tareas.controller';
import { PlantillasTareasService } from './plantillas-tareas.service';
import { AuthModule } from '../../core/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [PlantillasTareasController],
  providers: [PlantillasTareasService],
})
export class PlantillasTareasModule {}

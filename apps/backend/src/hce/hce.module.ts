import { Module } from '@nestjs/common';
import { ConsultasService } from './consultas/consultas.service';
import { ConsultasController } from './consultas/consultas.controller';
import { VacunacionesService } from './vacunaciones/vacunaciones.service';
import { VacunacionesController } from './vacunaciones/vacunaciones.controller';
import { TurnosService } from './turnos/turnos.service';
import { TurnosController } from './turnos/turnos.controller';
import { AuthModule } from '../core/auth/auth.module';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CarnetModule } from './carnet/carnet.module';
import { CarnetController } from './carnet/carnet.controller';   // ← NUEVO
import { CarnetService } from './carnet/carnet.service';         // ← NUEVO
import { PortalModule } from './portal/portal.module';
import { MacrosService } from './macros/macros.service';
import { MacrosController } from './macros/macros.controller';
import { IndicacionesService } from './indicaciones/indicaciones.service';
import { IndicacionesController } from './indicaciones/indicaciones.controller';
import { AgendasService } from './agendas/agendas.service';
import { AgendasController } from './agendas/agendas.controller';
import { CatalogoVacunasService } from './catalogo-vacunas/catalogo-vacunas.service';
import { CatalogoVacunasController } from './catalogo-vacunas/catalogo-vacunas.controller';
import { CatalogoDiagnosticosService } from './catalogo-diagnosticos/catalogo-diagnosticos.service';
import { CatalogoDiagnosticosController } from './catalogo-diagnosticos/catalogo-diagnosticos.controller';

/**
 * Módulo de la Historia Clínica Electrónica. Agrupa las features de la HCE:
 * consultas, vacunaciones, turnos, agendas y el carnet PDF.
 *
 * `catalogo-vacunas/` y `catalogo-diagnosticos/` son catálogos de referencia
 * GLOBALES (por especie, importados de un JSON) — sólo asisten los campos
 * `producto`/`diagnostico` (texto libre), no son entidades reales.
 */
@Module({
  imports: [AuthModule, CarnetModule, PortalModule],
  controllers: [ConsultasController, VacunacionesController, TurnosController, CarnetController, MacrosController, IndicacionesController, AgendasController, CatalogoVacunasController, CatalogoDiagnosticosController],
  providers: [ConsultasService, VacunacionesService, TurnosService, TenantGuard, RolesGuard, CarnetService, MacrosService, IndicacionesService, AgendasService, CatalogoVacunasService, CatalogoDiagnosticosService],
  exports: [VacunacionesService],
})
export class HceModule {}

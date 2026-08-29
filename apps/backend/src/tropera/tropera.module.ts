import { Module } from '@nestjs/common';
import { EstablecimientosModule } from './establecimientos/establecimientos.module';
import { ExistenciasModule } from './existencias/existencias.module';
import { MovimientosModule } from './movimientos/movimientos.module';
import { EventosModule } from './eventos/eventos.module';
import { AnimalesCampoModule } from './animales-campo/animales-campo.module';
import { HallazgosModule } from './hallazgos/hallazgos.module';
import { TorosVirtualesModule } from './toros-virtuales/toros-virtuales.module';
import { MuestrasModule } from './muestras/muestras.module';
import { EvaluacionesAndrologicasModule } from './evaluaciones-andrologicas/evaluaciones-andrologicas.module';
import { PotrerosModule } from './potreros/potreros.module';
import { PlantillasTareasModule } from './plantillas-tareas/plantillas-tareas.module';
import { ProtocolosIatfModule } from './protocolos-iatf/protocolos-iatf.module';
import { TareasModule } from './tareas/tareas.module';

/**
 * Módulo de Tropera (gestión ganadera). MVP: establecimientos, existencias
 * agregadas por categoría, movimientos (altas/bajas/traslados) que las
 * ajustan, y eventos sanitarios/reproductivos (sólo registro). Fase E suma
 * seguimiento individual (`animales-campo`, E.1), diagnóstico
 * reproductivo/muestreos/genética (`hallazgos`/`toros-virtuales`/`muestras`/
 * `evaluaciones-andrologicas`, E.2/E.3), potreros + apartados (`potreros`,
 * E.4), modo plantilla 1-tap (`plantillas-tareas`, E.5) y protocolos IATF
 * con tareas programadas (`protocolos-iatf`/`tareas`, E.6) — todo en
 * paralelo, sin tocar el agregado.
 */
@Module({
  imports: [
    EstablecimientosModule,
    ExistenciasModule,
    MovimientosModule,
    EventosModule,
    AnimalesCampoModule,
    HallazgosModule,
    TorosVirtualesModule,
    MuestrasModule,
    EvaluacionesAndrologicasModule,
    PotrerosModule,
    PlantillasTareasModule,
    ProtocolosIatfModule,
    TareasModule,
  ],
})
export class TroperaModule {}

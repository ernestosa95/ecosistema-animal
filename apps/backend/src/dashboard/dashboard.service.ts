import { Inject, Injectable } from '@nestjs/common';
import { and, count, eq, gte, isNull } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../database/drizzle.provider';
import { animales, consultas, turnos, organizaciones, movimientos } from '../database/schema';
import { VacunacionesService } from '../hce/vacunaciones/vacunaciones.service';
import { ExistenciasService } from '../tropera/existencias/existencias.service';

function inicioDeMes(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

@Injectable()
export class DashboardService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly vacunaciones: VacunacionesService,
    private readonly existencias: ExistenciasService,
  ) {}

  async resumen(organizacionId: string) {
    const [org] = await this.db
      .select({ huellaActiva: organizaciones.huellaActiva, troperaActiva: organizaciones.troperaActiva })
      .from(organizaciones)
      .where(eq(organizaciones.id, organizacionId))
      .limit(1);

    const resultado: Record<string, unknown> = {};

    if (org?.huellaActiva) {
      resultado.clinica = await this.resumenClinica(organizacionId);
    }
    if (org?.troperaActiva) {
      resultado.tropera = await this.resumenTropera(organizacionId);
    }
    return resultado;
  }

  private async resumenClinica(organizacionId: string) {
    const desde = inicioDeMes();

    const [{ value: pacientesActivos }] = await this.db
      .select({ value: count() })
      .from(animales)
      .where(
        and(eq(animales.organizacionId, organizacionId), eq(animales.estado, 'activo'), isNull(animales.deletedAt)),
      );

    const [{ value: consultasEsteMes }] = await this.db
      .select({ value: count() })
      .from(consultas)
      .where(
        and(eq(consultas.organizacionId, organizacionId), gte(consultas.fecha, desde), isNull(consultas.deletedAt)),
      );

    const turnosDelMes = await this.db
      .select({ estado: turnos.estado, value: count() })
      .from(turnos)
      .where(
        and(eq(turnos.organizacionId, organizacionId), gte(turnos.fechaHora, desde), isNull(turnos.deletedAt)),
      )
      .groupBy(turnos.estado);

    const vacunasPorVencer = await this.vacunaciones.recordatorios(organizacionId, 30);

    return {
      pacientesActivos,
      consultasEsteMes,
      turnosPorEstado: Object.fromEntries(turnosDelMes.map((t) => [t.estado, t.value])),
      vacunasPorVencer: vacunasPorVencer.length,
    };
  }

  private async resumenTropera(organizacionId: string) {
    const desde = inicioDeMes();

    const existenciasPorCategoria = await this.existencias.listarTodas(organizacionId);

    const movimientosDelMes = await this.db
      .select({ tipo: movimientos.tipo, value: count() })
      .from(movimientos)
      .where(
        and(
          eq(movimientos.organizacionId, organizacionId),
          gte(movimientos.createdAt, desde),
          isNull(movimientos.deletedAt),
        ),
      )
      .groupBy(movimientos.tipo);

    return {
      existenciasPorCategoria,
      movimientosPorTipo: Object.fromEntries(movimientosDelMes.map((m) => [m.tipo, m.value])),
    };
  }
}

import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type {
  Sesion, ResumenDashboard, Especie, Establecimiento, ConsultaResumen, Animal, Turno, Movimiento,
} from '../api/types';
import { DrawerTabla } from '../components/DrawerTabla';
import type { ColumnaExport } from '../utils/exportar';

const ESTADO_LABEL: Record<string, string> = {
  solicitado: 'Solicitados',
  confirmado: 'Confirmados',
  reprogramado: 'Reprogramados',
  cancelado: 'Cancelados',
  atendido: 'Atendidos',
  ausente: 'Ausentes',
};

const TIPO_MOVIMIENTO_LABEL: Record<string, string> = {
  nacimiento: 'Nacimientos',
  compra: 'Compras',
  muerte: 'Muertes',
  venta: 'Ventas',
  traslado: 'Traslados',
};

function inicioDeMesISO(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

interface Drill<T> {
  titulo: string;
  nombreArchivo: string;
  columnas: ColumnaExport<T>[];
  filas: T[];
}

/**
 * Fase C (§4.2 del spec UI/UX): drill-down desde cada tarjeta KPI hacia su
 * tabla desglosada + centro de exportación. No incluye indicadores de
 * facturación/ticket promedio — no hay ningún dato de cobros en el sistema
 * todavía (eso es Fase 5/ARCA, pausada a propósito); el drill-down se aplica
 * a los KPIs no monetarios que el dashboard ya tenía desde F5b.1.
 */
export function DashboardPage({ sesion }: { sesion: Sesion }) {
  const [resumen, setResumen] = useState<ResumenDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [especies, setEspecies] = useState<Especie[]>([]);
  const [establecimientos, setEstablecimientos] = useState<Establecimiento[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [drill, setDrill] = useState<Drill<any> | null>(null);
  const [cargandoDrill, setCargandoDrill] = useState(false);

  useEffect(() => {
    api
      .resumenDashboard(sesion)
      .then(setResumen)
      .catch((e) => setError(e instanceof Error ? e.message : 'Error al cargar el resumen'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesion]);

  useEffect(() => {
    if (resumen?.clinica) api.especies(sesion).then(setEspecies).catch(() => {});
    if (resumen?.tropera) api.establecimientos(sesion).then(setEstablecimientos).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumen]);

  const nombreEspecie = (id: string) => especies.find((e) => e.id === id)?.nombre ?? '—';
  const nombreEstablecimiento = (id?: string | null) => establecimientos.find((e) => e.id === id)?.nombre ?? '—';

  async function abrirPacientesActivos() {
    setCargandoDrill(true);
    setDrill({ titulo: 'Pacientes activos', nombreArchivo: 'pacientes-activos', columnas: [], filas: [] });
    try {
      const animales = await api.animales(sesion);
      setDrill({
        titulo: 'Pacientes activos',
        nombreArchivo: 'pacientes-activos',
        columnas: [
          { clave: 'nombre', etiqueta: 'Nombre' },
          { clave: 'especie', etiqueta: 'Especie', valor: (a: Animal) => nombreEspecie(a.especieId) },
          { clave: 'sexo', etiqueta: 'Sexo', valor: (a: Animal) => a.sexo ?? '—' },
          { clave: 'codigoLegible', etiqueta: 'Código' },
        ],
        filas: animales.filter((a) => a.estado === 'activo'),
      });
    } finally {
      setCargandoDrill(false);
    }
  }

  async function abrirConsultasDelMes() {
    setCargandoDrill(true);
    setDrill({ titulo: 'Consultas este mes', nombreArchivo: 'consultas-mes', columnas: [], filas: [] });
    try {
      const filas = await api.consultasPorRango(sesion, inicioDeMesISO());
      setDrill({
        titulo: 'Consultas este mes',
        nombreArchivo: 'consultas-mes',
        columnas: [
          { clave: 'fecha', etiqueta: 'Fecha', valor: (c: ConsultaResumen) => new Date(c.fecha).toLocaleDateString() },
          { clave: 'pacienteNombre', etiqueta: 'Paciente', valor: (c: ConsultaResumen) => c.pacienteNombre ?? '—' },
          { clave: 'motivo', etiqueta: 'Motivo', valor: (c: ConsultaResumen) => c.motivo ?? '—' },
          { clave: 'diagnostico', etiqueta: 'Diagnóstico', valor: (c: ConsultaResumen) => c.diagnostico ?? '—' },
        ],
        filas,
      });
    } finally {
      setCargandoDrill(false);
    }
  }

  async function abrirVacunasPorVencer() {
    setCargandoDrill(true);
    setDrill({ titulo: 'Vacunas por vencer', nombreArchivo: 'vacunas-por-vencer', columnas: [], filas: [] });
    try {
      const filas = await api.recordatoriosVacunas(sesion, 30);
      setDrill({
        titulo: 'Vacunas por vencer (30 días)',
        nombreArchivo: 'vacunas-por-vencer',
        columnas: [
          { clave: 'animalNombre', etiqueta: 'Paciente' },
          { clave: 'producto', etiqueta: 'Producto' },
          { clave: 'proximaDosis', etiqueta: 'Próxima dosis' },
        ],
        filas,
      });
    } finally {
      setCargandoDrill(false);
    }
  }

  async function abrirTurnosPorEstado(estado: string) {
    const titulo = `Turnos ${ESTADO_LABEL[estado] ?? estado} (este mes)`;
    setCargandoDrill(true);
    setDrill({ titulo, nombreArchivo: `turnos-${estado}`, columnas: [], filas: [] });
    try {
      const todos = await api.turnos(sesion, inicioDeMesISO());
      setDrill({
        titulo,
        nombreArchivo: `turnos-${estado}`,
        columnas: [
          { clave: 'fechaHora', etiqueta: 'Fecha/hora', valor: (t: Turno) => new Date(t.fechaHora).toLocaleString() },
          { clave: 'pacienteNombre', etiqueta: 'Paciente', valor: (t: Turno) => t.pacienteNombre ?? '—' },
          { clave: 'motivo', etiqueta: 'Motivo', valor: (t: Turno) => t.motivo ?? '—' },
        ],
        filas: todos.filter((t) => t.estado === estado),
      });
    } finally {
      setCargandoDrill(false);
    }
  }

  async function abrirMovimientosPorTipo(tipo: string) {
    const titulo = `Movimientos ${TIPO_MOVIMIENTO_LABEL[tipo] ?? tipo} (este mes)`;
    setCargandoDrill(true);
    setDrill({ titulo, nombreArchivo: `movimientos-${tipo}`, columnas: [], filas: [] });
    try {
      const todos = await api.movimientos(sesion, undefined, inicioDeMesISO());
      setDrill({
        titulo,
        nombreArchivo: `movimientos-${tipo}`,
        columnas: [
          { clave: 'fecha', etiqueta: 'Fecha' },
          { clave: 'categoria', etiqueta: 'Categoría' },
          { clave: 'cantidad', etiqueta: 'Cantidad' },
          {
            clave: 'origen',
            etiqueta: 'Origen',
            valor: (m: Movimiento) => nombreEstablecimiento(m.establecimientoOrigenId),
          },
          {
            clave: 'destino',
            etiqueta: 'Destino',
            valor: (m: Movimiento) => nombreEstablecimiento(m.establecimientoDestinoId),
          },
        ],
        filas: todos.filter((m) => m.tipo === tipo),
      });
    } finally {
      setCargandoDrill(false);
    }
  }

  function abrirExistenciasDetalle() {
    if (!resumen?.tropera) return;
    setDrill({
      titulo: 'Existencias por establecimiento',
      nombreArchivo: 'existencias-detalle',
      columnas: [
        {
          clave: 'establecimiento',
          etiqueta: 'Establecimiento',
          valor: (e: { establecimientoId: string }) => nombreEstablecimiento(e.establecimientoId),
        },
        { clave: 'categoria', etiqueta: 'Categoría' },
        { clave: 'cantidad', etiqueta: 'Cantidad' },
      ],
      filas: resumen.tropera.existenciasPorCategoria,
    });
  }

  if (error) return <div className="alerta">{error}</div>;
  if (!resumen) return <p className="muted">Cargando…</p>;

  return (
    <div>
      <div className="page-head">
        <h2>Resumen</h2>
      </div>

      {resumen.clinica && (
        <section style={{ marginBottom: '1.5rem' }}>
          <h3>Historia clínica</h3>
          <div className="ficha-datos" style={{ marginBottom: '1rem' }}>
            <button className="card dato kpi-clickable" onClick={abrirPacientesActivos}>
              <span className="dato-label">Pacientes activos</span>
              <strong style={{ fontSize: '1.6rem' }}>{resumen.clinica.pacientesActivos}</strong>
            </button>
            <button className="card dato kpi-clickable" onClick={abrirConsultasDelMes}>
              <span className="dato-label">Consultas este mes</span>
              <strong style={{ fontSize: '1.6rem' }}>{resumen.clinica.consultasEsteMes}</strong>
            </button>
            <button className="card dato kpi-clickable" onClick={abrirVacunasPorVencer}>
              <span className="dato-label">Vacunas por vencer (30 días)</span>
              <strong style={{ fontSize: '1.6rem' }}>{resumen.clinica.vacunasPorVencer}</strong>
            </button>
          </div>
          <div className="card">
            <span className="dato-label">Turnos este mes por estado</span>
            {Object.keys(resumen.clinica.turnosPorEstado).length === 0 ? (
              <p className="muted">Sin turnos este mes todavía.</p>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                {Object.entries(resumen.clinica.turnosPorEstado).map(([estado, cantidad]) => (
                  <button
                    key={estado}
                    className="chip chip-clickable"
                    onClick={() => abrirTurnosPorEstado(estado)}
                  >
                    {ESTADO_LABEL[estado] ?? estado}: {cantidad}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {resumen.tropera && (
        <section>
          <h3>Tropera</h3>
          <div className="card" style={{ marginBottom: '1rem' }}>
            <span className="dato-label">Movimientos este mes por tipo</span>
            {Object.keys(resumen.tropera.movimientosPorTipo).length === 0 ? (
              <p className="muted">Sin movimientos este mes todavía.</p>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                {Object.entries(resumen.tropera.movimientosPorTipo).map(([tipo, cantidad]) => (
                  <button
                    key={tipo}
                    className="chip chip-clickable"
                    onClick={() => abrirMovimientosPorTipo(tipo)}
                  >
                    {TIPO_MOVIMIENTO_LABEL[tipo] ?? tipo}: {cantidad}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="card">
            <span className="dato-label">Existencias actuales (todos los establecimientos)</span>
            {(() => {
              const totales = new Map<string, number>();
              for (const e of resumen.tropera.existenciasPorCategoria) {
                totales.set(e.categoria, (totales.get(e.categoria) ?? 0) + e.cantidad);
              }
              const filas = [...totales.entries()];
              if (filas.length === 0) return <p className="muted">Sin existencias cargadas todavía.</p>;
              return (
                <>
                  <table className="tabla" style={{ marginTop: '0.5rem' }}>
                    <thead>
                      <tr>
                        <th>Categoría</th>
                        <th>Cantidad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filas.map(([categoria, cantidad]) => (
                        <tr key={categoria}>
                          <td className="chip">{categoria}</td>
                          <td>{cantidad}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button className="link" style={{ marginTop: '0.5rem' }} onClick={abrirExistenciasDetalle}>
                    Ver desglose por establecimiento →
                  </button>
                </>
              );
            })()}
          </div>
        </section>
      )}

      {!resumen.clinica && !resumen.tropera && (
        <p className="muted">Sin indicadores para mostrar todavía.</p>
      )}

      {drill && (
        <DrawerTabla
          titulo={drill.titulo}
          columnas={drill.columnas}
          filas={drill.filas}
          nombreArchivo={drill.nombreArchivo}
          cargando={cargandoDrill}
          onCerrar={() => setDrill(null)}
        />
      )}
    </div>
  );
}

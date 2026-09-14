import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type {
  Sesion, ResumenDashboard, Especie, ConsultaResumen, Animal, Turno,
} from '../api/types';
import { DrawerTabla } from '../components/DrawerTabla';
import { SeleccionarAnimalModal } from '../components/SeleccionarAnimalModal';
import { VentaRapidaModal } from '../components/VentaRapidaModal';
import { NuevoTurnoRapidoModal } from '../components/NuevoTurnoRapidoModal';
import { IngresoStockModal } from '../components/IngresoStockModal';
import { AccesoPortalModal } from '../components/AccesoPortalModal';
import { tieneAlguno, ROLES_CLINICO, ROLES_CAJA, ROLES_TURNERO, ROLES_ATIENDEN, ROLES_FARMACIA } from '../nav/config';
import type { ColumnaExport } from '../utils/columnasTabla';

function inicioDeMesISO(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

function rangoHoyISO(): { desde: string; hasta: string } {
  const hoy = new Date();
  const desde = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0);
  const hasta = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59);
  return { desde: desde.toISOString(), hasta: hasta.toISOString() };
}

const ESTADO_TURNO_LABEL: Record<string, string> = {
  solicitado: 'Solicitado',
  confirmado: 'Confirmado',
  reprogramado: 'Reprogramado',
  cancelado: 'Cancelado',
  atendido: 'Atendido',
  ausente: 'Ausente',
};

function fmtHora(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

interface Drill<T> {
  titulo: string;
  columnas: ColumnaExport<T>[];
  filas: T[];
}

type AccesoRapido = 'consulta' | 'vacuna' | 'venta' | 'turno' | 'ingreso-stock' | 'portal' | null;

/**
 * Home de Huella: ¾ izquierda = centro de operaciones (accesos rápidos a
 * flujos comunes de mostrador), ¼ derecha = los indicadores KPI apilados
 * verticalmente, cada uno con drill-down (Fase C, §4.2 del spec UI/UX) hacia
 * su tabla desglosada. No incluye indicadores de facturación/ticket
 * promedio ni el desglose de turnos por estado — ese detalle ya vive en
 * Turnos/Recordatorios, acá el foco es "qué tengo que hacer ahora".
 */
export function HuellaHomeSection({
  sesion,
  onAbrirPaciente,
  onIrATurnos,
}: {
  sesion: Sesion;
  onAbrirPaciente: (animal: Animal, opts?: { abrirConsulta?: boolean; abrirVacuna?: boolean }) => void;
  onIrATurnos: () => void;
}) {
  const [resumen, setResumen] = useState<ResumenDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [especies, setEspecies] = useState<Especie[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [drill, setDrill] = useState<Drill<any> | null>(null);
  const [cargandoDrill, setCargandoDrill] = useState(false);
  const [accesoAbierto, setAccesoAbierto] = useState<AccesoRapido>(null);

  /** Registra la analítica de uso del acceso rápido y abre el modal correspondiente. */
  function abrirAcceso(acceso: Exclude<AccesoRapido, null>) {
    api.registrarEvento(sesion, 'accion', `home-${acceso}`);
    setAccesoAbierto(acceso);
  }
  const [turnosHoy, setTurnosHoy] = useState<Turno[]>([]);
  const [cargandoTurnos, setCargandoTurnos] = useState(true);

  const puedeAgendar = tieneAlguno(sesion.roles, ROLES_TURNERO);

  async function cargarTurnosHoy() {
    if (!puedeAgendar) {
      setCargandoTurnos(false);
      return;
    }
    setCargandoTurnos(true);
    try {
      const { desde, hasta } = rangoHoyISO();
      const todos = await api.turnos(sesion, desde, hasta);
      setTurnosHoy(
        todos
          .filter((t) => t.estado !== 'cancelado' && t.estado !== 'atendido')
          .sort((a, b) => a.fechaHora.localeCompare(b.fechaHora)),
      );
    } catch {
      setTurnosHoy([]);
    } finally {
      setCargandoTurnos(false);
    }
  }

  useEffect(() => {
    api
      .resumenDashboard(sesion)
      .then(setResumen)
      .catch((e) => setError(e instanceof Error ? e.message : 'Error al cargar el resumen'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesion]);

  useEffect(() => {
    cargarTurnosHoy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesion]);

  useEffect(() => {
    if (resumen?.clinica) api.especies(sesion).then(setEspecies).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumen]);

  const nombreEspecie = (id: string) => especies.find((e) => e.id === id)?.nombre ?? '—';

  async function abrirPacientesActivos() {
    setCargandoDrill(true);
    setDrill({ titulo: 'Pacientes activos', columnas: [], filas: [] });
    try {
      const animales = await api.animales(sesion);
      setDrill({
        titulo: 'Pacientes activos',
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
    setDrill({ titulo: 'Consultas este mes', columnas: [], filas: [] });
    try {
      const filas = await api.consultasPorRango(sesion, inicioDeMesISO());
      setDrill({
        titulo: 'Consultas este mes',
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
    setDrill({ titulo: 'Vacunas por vencer', columnas: [], filas: [] });
    try {
      const filas = await api.recordatoriosVacunas(sesion, 30);
      setDrill({
        titulo: 'Vacunas por vencer (30 días)',
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

  function seleccionoPaciente(animal: Animal) {
    const opts = accesoAbierto === 'consulta' ? { abrirConsulta: true } : { abrirVacuna: true };
    setAccesoAbierto(null);
    onAbrirPaciente(animal, opts);
  }

  async function abrirTurno(t: Turno) {
    try {
      const animal = await api.obtenerAnimal(sesion, t.animalId);
      onAbrirPaciente(animal);
    } catch (e) {
      alert('No se pudo abrir la ficha del paciente: ' + (e instanceof Error ? e.message : 'error'));
    }
  }

  /**
   * Marca el turno como atendido. Abre además la ficha del paciente con
   * "Nueva consulta", salvo que el turno tenga una agenda asignada SIN
   * profesional (agenda "no médica", ej. peluquería) — ahí no tiene sentido
   * una consulta clínica. Un turno sin ninguna agenda (el caso más común
   * históricamente) sigue abriendo la consulta como siempre: la ausencia de
   * agenda no implica "no médica", sólo que nunca se le asignó una puntual.
   */
  async function atenderTurno(t: Turno, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      api.registrarEvento(sesion, 'accion', 'home-atender-turno');
      await api.cambiarEstadoTurno(sesion, t.id, { estado: 'atendido' });
      cargarTurnosHoy();
      const esAgendaNoMedica = !!t.agendaId && !t.agendaUsuarioId;
      if (!esAgendaNoMedica) {
        const animal = await api.obtenerAnimal(sesion, t.animalId);
        onAbrirPaciente(animal, { abrirConsulta: true });
      }
    } catch (e2) {
      alert('No se pudo marcar el turno como atendido: ' + (e2 instanceof Error ? e2.message : 'error'));
    }
  }

  const puedeClinico = tieneAlguno(sesion.roles, ROLES_CLINICO);
  const puedeVender = tieneAlguno(sesion.roles, ROLES_CAJA);
  const puedeAtender = tieneAlguno(sesion.roles, ROLES_ATIENDEN);
  const puedeFarmacia = tieneAlguno(sesion.roles, ROLES_FARMACIA);

  if (error) return <div className="alerta">{error}</div>;
  if (!resumen) return <p className="muted">Cargando…</p>;

  return (
    <div>
      <div className="page-head">
        <h1>Home</h1>
      </div>

      {resumen.clinica ? (
        <div className="layout-2col">
          <div className="layout-main">
            <h2 className="form-titulo">Centro de operaciones</h2>
            <div className="centro-operaciones">
              {puedeClinico && (
                <button className="operacion-btn" onClick={() => abrirAcceso('consulta')}>
                  <span className="operacion-btn-icono">🩺</span>
                  <span className="operacion-btn-titulo">Nueva consulta</span>
                  <span className="operacion-btn-sub">Elegí (o creá) el paciente y cargá la consulta.</span>
                </button>
              )}
              {puedeClinico && (
                <button className="operacion-btn" onClick={() => abrirAcceso('vacuna')}>
                  <span className="operacion-btn-icono">💉</span>
                  <span className="operacion-btn-titulo">Registro de vacuna</span>
                  <span className="operacion-btn-sub">Elegí (o creá) el paciente y registrá la aplicación.</span>
                </button>
              )}
              {puedeVender && (
                <button className="operacion-btn" onClick={() => abrirAcceso('venta')}>
                  <span className="operacion-btn-icono">🛒</span>
                  <span className="operacion-btn-titulo">Venta común</span>
                  <span className="operacion-btn-sub">Vendé un producto del stock de Farmacia.</span>
                </button>
              )}
              {puedeAgendar && (
                <button className="operacion-btn" onClick={() => abrirAcceso('turno')}>
                  <span className="operacion-btn-icono">📅</span>
                  <span className="operacion-btn-titulo">Nuevo turno</span>
                  <span className="operacion-btn-sub">Elegí (o creá) el paciente y sacá el turno.</span>
                </button>
              )}
              {!puedeClinico && !puedeVender && !puedeAgendar && (
                <p className="muted">No tenés accesos rápidos disponibles para tu rol.</p>
              )}
            </div>

            {puedeAgendar && (
              <>
                <div className="page-head">
                  <h2 className="form-titulo" style={{ marginBottom: 0 }}>Turnos de hoy</h2>
                  <button type="button" className="btn-ghost" onClick={onIrATurnos}>
                    Ver todos los turnos →
                  </button>
                </div>
                {cargandoTurnos ? (
                  <p className="muted">Cargando…</p>
                ) : turnosHoy.length === 0 ? (
                  <p className="muted">No hay turnos para hoy.</p>
                ) : (
                  <div className="card">
                    <table className="tabla">
                      <thead>
                        <tr>
                          <th>Hora</th>
                          <th>Paciente</th>
                          <th>Dueño</th>
                          <th>Motivo</th>
                          <th>Estado</th>
                          {puedeAtender && <th />}
                        </tr>
                      </thead>
                      <tbody>
                        {turnosHoy.map((t) => (
                          <tr key={t.id} className="fila-clickable" onClick={() => abrirTurno(t)}>
                            <td>{fmtHora(t.fechaHora)}</td>
                            <td>{t.pacienteNombre ?? '—'}</td>
                            <td>{t.duenoNombre ? `${t.duenoNombre} ${t.duenoApellido ?? ''}`.trim() : '—'}</td>
                            <td>{t.motivo ?? '—'}</td>
                            <td>
                              <span className="chip">{ESTADO_TURNO_LABEL[t.estado] ?? t.estado}</span>
                            </td>
                            {puedeAtender && (
                              <td>
                                {(t.estado === 'confirmado' || t.estado === 'reprogramado') && (
                                  <button type="button" className="btn-ghost" onClick={(e) => atenderTurno(t, e)}>
                                    Atender
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="layout-side">
            <button className="card dato kpi-clickable home-kpi" onClick={abrirPacientesActivos}>
              <span className="dato-label">Pacientes activos</span>
              <strong style={{ fontSize: '1.6rem' }}>{resumen.clinica.pacientesActivos}</strong>
            </button>
            <button className="card dato kpi-clickable home-kpi" onClick={abrirConsultasDelMes}>
              <span className="dato-label">Consultas este mes</span>
              <strong style={{ fontSize: '1.6rem' }}>{resumen.clinica.consultasEsteMes}</strong>
            </button>
            <button className="card dato kpi-clickable home-kpi" onClick={abrirVacunasPorVencer}>
              <span className="dato-label">Vacunas por vencer (30 días)</span>
              <strong style={{ fontSize: '1.6rem' }}>{resumen.clinica.vacunasPorVencer}</strong>
            </button>
            {puedeFarmacia && (
              <button className="operacion-btn" onClick={() => abrirAcceso('ingreso-stock')}>
                <span className="operacion-btn-icono">📦</span>
                <span className="operacion-btn-titulo">Ingreso de stock</span>
                <span className="operacion-btn-sub">Registrá una compra a proveedor.</span>
              </button>
            )}
            {puedeAgendar && (
              <button className="operacion-btn" onClick={() => abrirAcceso('portal')}>
                <span className="operacion-btn-icono">🔑</span>
                <span className="operacion-btn-titulo">Acceso al portal</span>
                <span className="operacion-btn-sub">Generá el link o el código para un dueño.</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <p className="muted">Sin indicadores para mostrar todavía.</p>
      )}

      {(accesoAbierto === 'consulta' || accesoAbierto === 'vacuna') && (
        <SeleccionarAnimalModal
          sesion={sesion}
          titulo={accesoAbierto === 'consulta' ? 'Nueva consulta — elegir paciente' : 'Registro de vacuna — elegir paciente'}
          subtitulo="Al elegir o crear el paciente, te lleva directo a su ficha con el formulario listo para completar."
          onCancelar={() => setAccesoAbierto(null)}
          onSeleccionar={seleccionoPaciente}
        />
      )}

      {accesoAbierto === 'venta' && (
        <VentaRapidaModal
          sesion={sesion}
          onCancelar={() => setAccesoAbierto(null)}
          onCompletada={() => setAccesoAbierto(null)}
        />
      )}

      {accesoAbierto === 'turno' && (
        <NuevoTurnoRapidoModal
          sesion={sesion}
          onCancelar={() => setAccesoAbierto(null)}
          onCreado={() => {
            setAccesoAbierto(null);
            cargarTurnosHoy();
          }}
        />
      )}

      {accesoAbierto === 'ingreso-stock' && (
        <IngresoStockModal
          sesion={sesion}
          onCancelar={() => setAccesoAbierto(null)}
          onCompletado={() => setAccesoAbierto(null)}
        />
      )}

      {accesoAbierto === 'portal' && (
        <AccesoPortalModal sesion={sesion} onCerrar={() => setAccesoAbierto(null)} />
      )}

      {drill && (
        <DrawerTabla
          titulo={drill.titulo}
          columnas={drill.columnas}
          filas={drill.filas}
          cargando={cargandoDrill}
          onCerrar={() => setDrill(null)}
        />
      )}
    </div>
  );
}

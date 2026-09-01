import { useEffect, useState } from 'react';
import { crearTurno, listarAgendas, slotsDisponibles, type Agenda, type Slot } from '../api/turnos';
import { SeleccionarAnimalModal } from './SeleccionarAnimalModal';
import type { Sesion, Animal } from '../api/types';

function hoyISO(): string {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/**
 * Acceso rápido "Nuevo turno" del centro de operaciones (Home): mismo picker
 * de paciente que Nueva consulta/Registro de vacuna (`SeleccionarAnimalModal`
 * — buscar o crear ahí mismo) + la misma lógica de agenda/disponibilidad de
 * `TurnosPage.tsx` (`listarAgendas`/`slotsDisponibles`, ya expuestas desde
 * `api/turnos.ts`) — reimplementada con las clases del sistema de diseño
 * general en vez de las `hu-*` propias de esa página, porque este modal
 * vive en el Home, no ahí. El turno se crea directo en el modal en vez de
 * navegar a otra pantalla, porque no hay nada más que completar después.
 */
export function NuevoTurnoRapidoModal({
  sesion,
  onCancelar,
  onCreado,
}: {
  sesion: Sesion;
  onCancelar: () => void;
  onCreado: () => void;
}) {
  const [paciente, setPaciente] = useState<Animal | null>(null);
  const [motivo, setMotivo] = useState('');
  const [fecha, setFecha] = useState(hoyISO());
  const [hora, setHora] = useState('10:00');
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [agendaId, setAgendaId] = useState('');
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [cargandoSlots, setCargandoSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    listarAgendas().then(setAgendas).catch(() => setAgendas([]));
  }, []);

  useEffect(() => {
    if (!agendaId || !fecha) {
      setSlots(null);
      return;
    }
    let vivo = true;
    setCargandoSlots(true);
    slotsDisponibles(agendaId, fecha)
      .then((s) => {
        if (vivo) setSlots(s);
      })
      .catch(() => {
        if (vivo) setSlots([]);
      })
      .finally(() => {
        if (vivo) setCargandoSlots(false);
      });
    return () => {
      vivo = false;
    };
  }, [agendaId, fecha]);

  if (!paciente) {
    return (
      <SeleccionarAnimalModal
        sesion={sesion}
        titulo="Nuevo turno — elegir paciente"
        subtitulo="Elegí o creá el paciente y después completás agenda, fecha y hora."
        onCancelar={onCancelar}
        onSeleccionar={setPaciente}
      />
    );
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!fecha || !hora) {
      setError('Completá fecha y hora');
      return;
    }
    setError(null);
    setGuardando(true);
    try {
      await crearTurno({
        animalId: paciente!.id,
        motivo: motivo || 'Consulta',
        fecha,
        hora,
        agendaId: agendaId || undefined,
      });
      setOk(true);
      setTimeout(onCreado, 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el turno');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onCancelar}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <span>Nuevo turno</span>
          <button className="link" onClick={onCancelar}>
            Cerrar ✕
          </button>
        </div>
        {ok ? (
          <p className="muted">Turno creado ✓</p>
        ) : (
          <>
            <p className="muted">
              Paciente: <b>{paciente.nombre}</b>{' '}
              <button type="button" className="link" onClick={() => setPaciente(null)}>
                cambiar
              </button>
            </p>

            <form className="form-grid" onSubmit={guardar} style={{ marginTop: '0.5rem' }}>
              <label className="span-2">
                Motivo
                <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej: Control" />
              </label>
              <label className="span-2">
                Agenda
                <select
                  value={agendaId}
                  onChange={(e) => {
                    setAgendaId(e.target.value);
                    setHora('');
                  }}
                >
                  <option value="">Sin agenda (horario libre)</option>
                  {agendas
                    .filter((a) => a.activa)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nombre}
                        {a.usuarioNombre ? ` · ${a.usuarioNombre}` : ''}
                      </option>
                    ))}
                </select>
                {agendas.length === 0 && (
                  <span className="muted hint-previo">
                    Todavía no hay agendas configuradas — el turno queda con horario libre.
                  </span>
                )}
              </label>

              <label>
                Fecha
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => {
                    setFecha(e.target.value);
                    setHora('');
                  }}
                  required
                />
              </label>

              {agendaId ? (
                <div>
                  <span className="dato-label">Horario</span>
                  {cargandoSlots ? (
                    <p className="muted">Cargando horarios…</p>
                  ) : !slots || slots.length === 0 ? (
                    <p className="muted">Esta agenda no tiene horarios configurados para ese día.</p>
                  ) : (
                    <div className="slots-horario">
                      {slots.map((s) => (
                        <button
                          type="button"
                          key={s.hora}
                          className={`slot-horario${hora === s.hora ? ' seleccionado' : ''}`}
                          disabled={!s.disponible}
                          onClick={() => setHora(s.hora)}
                        >
                          {s.hora}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <label>
                  Hora
                  <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} required />
                </label>
              )}

              {error && <div className="alerta span-2">{error}</div>}
              <div className="span-2">
                <button className="btn" type="submit" disabled={guardando || !hora}>
                  {guardando ? 'Guardando…' : 'Crear turno'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

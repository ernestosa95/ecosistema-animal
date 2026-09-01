// Gestión de agendas: alta/edición, horarios recurrentes (bloques) y
// excepciones puntuales (feriados/licencias o aperturas extra). Vive dentro
// del turnero (no es un ítem nuevo del nav rail) — se abre desde el botón
// "⚙ Agendas" de TurnosPage.tsx.
import { useEffect, useState } from 'react';
import {
  listarAgendas, crearAgenda, actualizarAgenda, eliminarAgenda, listarMiembros,
  listarBloques, crearBloque, eliminarBloque,
  listarExcepciones, crearExcepcion, eliminarExcepcion,
  type Agenda, type AgendaBloque, type AgendaExcepcion, type MiembroOpcion,
} from '../../api/turnos';
import { Overlay, Field } from './ui';

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function GestionAgendas({ onClose }: { onClose: () => void }) {
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [miembros, setMiembros] = useState<MiembroOpcion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandidaId, setExpandidaId] = useState<string | null>(null);
  const [mostrarNueva, setMostrarNueva] = useState(false);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      setAgendas(await listarAgendas());
    } catch (e: any) {
      setError(e.message ?? 'No se pudieron cargar las agendas');
    } finally {
      setCargando(false);
    }
  }
  useEffect(() => {
    cargar();
    listarMiembros().then(setMiembros).catch(() => setMiembros([]));
  }, []);

  return (
    <Overlay onClose={onClose} ancho>
      <h2>Agendas</h2>
      <p className="hu-sub">
        Una agenda por profesional, o sin profesional (ej. Peluquería canina), con su horario de atención.
      </p>

      {error && <div className="hu-err">{error}</div>}

      {cargando ? (
        <p className="hu-sub">Cargando…</p>
      ) : agendas.length === 0 ? (
        <p className="hu-sub">Todavía no hay agendas.</p>
      ) : (
        <div className="hu-list" style={{ marginBottom: 12 }}>
          {agendas.map((a) => (
            <FilaAgenda
              key={a.id}
              agenda={a}
              miembros={miembros}
              expandida={expandidaId === a.id}
              onToggle={() => setExpandidaId(expandidaId === a.id ? null : a.id)}
              onCambio={cargar}
            />
          ))}
        </div>
      )}

      {mostrarNueva ? (
        <FormAgenda
          miembros={miembros}
          onCancelar={() => setMostrarNueva(false)}
          onGuardar={async (datos) => {
            await crearAgenda(datos);
            setMostrarNueva(false);
            cargar();
          }}
        />
      ) : (
        <button className="hu-btn" onClick={() => setMostrarNueva(true)}>
          ＋ Nueva agenda
        </button>
      )}

      <div className="hu-mactions">
        <button className="hu-btn ghost" onClick={onClose}>Cerrar</button>
      </div>
    </Overlay>
  );
}

// ── Fila de agenda (resumen + expandible con bloques/excepciones) ─────────
function FilaAgenda({ agenda, miembros, expandida, onToggle, onCambio }: {
  agenda: Agenda;
  miembros: MiembroOpcion[];
  expandida: boolean;
  onToggle: () => void;
  onCambio: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleActiva() {
    setError(null);
    try {
      await actualizarAgenda(agenda.id, { activa: !agenda.activa });
      onCambio();
    } catch (e: any) {
      setError(e.message ?? 'No se pudo actualizar');
    }
  }

  async function eliminar() {
    if (!confirm(`¿Eliminar la agenda "${agenda.nombre}"? Los turnos ya cargados no se borran.`)) return;
    setError(null);
    try {
      await eliminarAgenda(agenda.id);
      onCambio();
    } catch (e: any) {
      setError(e.message ?? 'No se pudo eliminar');
    }
  }

  return (
    <div className="hu-card" style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <b>{agenda.nombre}</b>{!agenda.activa && <span className="hu-err" style={{ marginLeft: 6 }}>inactiva</span>}
          <div className="hu-sub" style={{ margin: '2px 0 0' }}>
            {agenda.usuarioNombre || 'Sin profesional asignado'} · turnos de {agenda.duracionTurnoMinutos} min
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button className="hu-btn ghost" onClick={() => setEditando((v) => !v)}>{editando ? 'Cerrar' : 'Editar'}</button>
          <button className="hu-btn ghost" onClick={toggleActiva}>{agenda.activa ? 'Desactivar' : 'Activar'}</button>
          <button className="hu-btn ghost" onClick={onToggle}>{expandida ? 'Ocultar horarios' : 'Horarios'}</button>
          <button className="hu-btn ghost" onClick={eliminar}>Eliminar</button>
        </div>
      </div>

      {error && <div className="hu-err">{error}</div>}

      {editando && (
        <FormAgenda
          agenda={agenda}
          miembros={miembros}
          onCancelar={() => setEditando(false)}
          onGuardar={async (datos) => {
            await actualizarAgenda(agenda.id, datos);
            setEditando(false);
            onCambio();
          }}
        />
      )}

      {expandida && <DetalleHorarios agenda={agenda} />}
    </div>
  );
}

// ── Alta / edición de una agenda ───────────────────────────────────────────
function FormAgenda({ agenda, miembros, onCancelar, onGuardar }: {
  agenda?: Agenda;
  miembros: MiembroOpcion[];
  onCancelar: () => void;
  onGuardar: (datos: { nombre: string; usuarioId?: string | null; duracionTurnoMinutos: number }) => Promise<void>;
}) {
  const [nombre, setNombre] = useState(agenda?.nombre ?? '');
  const [usuarioId, setUsuarioId] = useState(agenda?.usuarioId ?? '');
  const [duracion, setDuracion] = useState(String(agenda?.duracionTurnoMinutos ?? 30));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    if (nombre.trim().length < 2) { setError('Poné un nombre'); return; }
    setError(null);
    setGuardando(true);
    try {
      await onGuardar({
        nombre: nombre.trim(),
        usuarioId: usuarioId || null,
        duracionTurnoMinutos: Number(duracion) || 30,
      });
    } catch (e: any) {
      setError(e.message ?? 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="hu-card" style={{ marginTop: 8 }}>
      <Field label="Nombre">
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej: Dra. García, Peluquería canina"
        />
      </Field>
      <div className="hu-row2">
        <Field label="Profesional (opcional)">
          <select value={usuarioId ?? ''} onChange={(e) => setUsuarioId(e.target.value)}>
            <option value="">Sin profesional</option>
            {miembros.map((m) => <option key={m.id} value={m.id}>{m.nombre} · {m.rol}</option>)}
          </select>
        </Field>
        <Field label="Duración de cada turno (min)">
          <input type="number" min={5} max={240} value={duracion} onChange={(e) => setDuracion(e.target.value)} />
        </Field>
      </div>
      {error && <div className="hu-err">{error}</div>}
      <div className="hu-mactions">
        <button className="hu-btn ghost" onClick={onCancelar} disabled={guardando}>Cancelar</button>
        <button className="hu-btn primary" onClick={guardar} disabled={guardando}>
          {guardando ? 'Guardando…' : agenda ? 'Guardar cambios' : 'Crear agenda'}
        </button>
      </div>
    </div>
  );
}

// ── Bloques recurrentes + excepciones puntuales de una agenda ─────────────
function DetalleHorarios({ agenda }: { agenda: Agenda }) {
  const [bloques, setBloques] = useState<AgendaBloque[]>([]);
  const [excepciones, setExcepciones] = useState<AgendaExcepcion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mostrarBloque, setMostrarBloque] = useState(false);
  const [mostrarExcepcion, setMostrarExcepcion] = useState(false);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const [b, e] = await Promise.all([listarBloques(agenda.id), listarExcepciones(agenda.id)]);
      setBloques(b);
      setExcepciones(e);
    } catch (err: any) {
      setError(err.message ?? 'No se pudo cargar');
    } finally {
      setCargando(false);
    }
  }
  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [agenda.id]);

  async function borrarBloque(id: string) {
    try { await eliminarBloque(agenda.id, id); cargar(); }
    catch (e: any) { setError(e.message ?? 'No se pudo eliminar'); }
  }
  async function borrarExcepcion(id: string) {
    try { await eliminarExcepcion(agenda.id, id); cargar(); }
    catch (e: any) { setError(e.message ?? 'No se pudo eliminar'); }
  }

  if (cargando) return <p className="hu-sub">Cargando horarios…</p>;

  return (
    <div style={{ marginTop: 10, borderTop: '1px solid var(--hu-border)', paddingTop: 10 }}>
      {error && <div className="hu-err">{error}</div>}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <b style={{ fontSize: '.85rem' }}>Horario recurrente</b>
        <button className="hu-btn ghost" onClick={() => setMostrarBloque((v) => !v)}>
          {mostrarBloque ? 'Cerrar' : '＋ Agregar'}
        </button>
      </div>
      {bloques.length === 0 ? (
        <p className="hu-sub">Sin horario configurado — esta agenda no tiene slots disponibles todavía.</p>
      ) : (
        <div className="hu-slots" style={{ margin: '6px 0' }}>
          {bloques.map((b) => (
            <span key={b.id} className="hu-slot" style={{ cursor: 'default', display: 'inline-flex', gap: 6, alignItems: 'center' }}>
              {DIAS[b.diaSemana]} {b.horaInicio}–{b.horaFin}
              <button
                type="button"
                onClick={() => borrarBloque(b.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700 }}
                aria-label="Eliminar bloque"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
      {mostrarBloque && (
        <FormBloque
          onCancelar={() => setMostrarBloque(false)}
          onGuardar={async (dto) => { await crearBloque(agenda.id, dto); setMostrarBloque(false); cargar(); }}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
        <b style={{ fontSize: '.85rem' }}>Excepciones puntuales</b>
        <button className="hu-btn ghost" onClick={() => setMostrarExcepcion((v) => !v)}>
          {mostrarExcepcion ? 'Cerrar' : '＋ Agregar'}
        </button>
      </div>
      {excepciones.length === 0 ? (
        <p className="hu-sub">Sin feriados, licencias ni aperturas extra cargadas.</p>
      ) : (
        <div className="hu-list" style={{ margin: '6px 0' }}>
          {excepciones.map((e) => (
            <div key={e.id} className="hu-turno" style={{ padding: '6px 10px' }}>
              <div className="hu-tmain">
                <div className="hu-tpac">
                  {e.fecha} · {e.tipo === 'cierre' ? 'Cierre' : 'Apertura extra'}
                  {e.horaInicio && e.horaFin ? ` (${e.horaInicio}–${e.horaFin})` : e.tipo === 'cierre' ? ' (día completo)' : ''}
                </div>
                {e.motivo && <div className="hu-tmeta">{e.motivo}</div>}
              </div>
              <button className="hu-btn ghost" onClick={() => borrarExcepcion(e.id)}>Eliminar</button>
            </div>
          ))}
        </div>
      )}
      {mostrarExcepcion && (
        <FormExcepcion
          onCancelar={() => setMostrarExcepcion(false)}
          onGuardar={async (dto) => { await crearExcepcion(agenda.id, dto); setMostrarExcepcion(false); cargar(); }}
        />
      )}
    </div>
  );
}

function FormBloque({ onCancelar, onGuardar }: {
  onCancelar: () => void;
  onGuardar: (dto: { diaSemana: number; horaInicio: string; horaFin: string }) => Promise<void>;
}) {
  const [diaSemana, setDiaSemana] = useState('1');
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [horaFin, setHoraFin] = useState('13:00');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    setError(null);
    setGuardando(true);
    try {
      await onGuardar({ diaSemana: Number(diaSemana), horaInicio, horaFin });
    } catch (e: any) {
      setError(e.message ?? 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="hu-card" style={{ margin: '8px 0' }}>
      <div className="hu-row2">
        <Field label="Día">
          <select value={diaSemana} onChange={(e) => setDiaSemana(e.target.value)}>
            {DIAS.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
        </Field>
        <Field label="De — a">
          <div style={{ display: 'flex', gap: 6 }}>
            <input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} />
            <input type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} />
          </div>
        </Field>
      </div>
      {error && <div className="hu-err">{error}</div>}
      <div className="hu-mactions">
        <button className="hu-btn ghost" onClick={onCancelar} disabled={guardando}>Cancelar</button>
        <button className="hu-btn primary" onClick={guardar} disabled={guardando}>
          {guardando ? 'Guardando…' : 'Agregar horario'}
        </button>
      </div>
    </div>
  );
}

function FormExcepcion({ onCancelar, onGuardar }: {
  onCancelar: () => void;
  onGuardar: (dto: { fecha: string; tipo: 'cierre' | 'apertura_extra'; horaInicio?: string; horaFin?: string; motivo?: string }) => Promise<void>;
}) {
  const [fecha, setFecha] = useState('');
  const [tipo, setTipo] = useState<'cierre' | 'apertura_extra'>('cierre');
  const [diaCompleto, setDiaCompleto] = useState(true);
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [horaFin, setHoraFin] = useState('13:00');
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    if (!fecha) { setError('Elegí una fecha'); return; }
    setError(null);
    setGuardando(true);
    try {
      const conHorario = tipo === 'apertura_extra' || !diaCompleto;
      await onGuardar({
        fecha,
        tipo,
        ...(conHorario ? { horaInicio, horaFin } : {}),
        motivo: motivo.trim() || undefined,
      });
    } catch (e: any) {
      setError(e.message ?? 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="hu-card" style={{ margin: '8px 0' }}>
      <div className="hu-row2">
        <Field label="Fecha"><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></Field>
        <Field label="Tipo">
          <select value={tipo} onChange={(e) => setTipo(e.target.value as 'cierre' | 'apertura_extra')}>
            <option value="cierre">Cierre (feriado, licencia)</option>
            <option value="apertura_extra">Apertura extra</option>
          </select>
        </Field>
      </div>
      {tipo === 'cierre' && (
        <label className="hu-check" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <input type="checkbox" checked={diaCompleto} onChange={(e) => setDiaCompleto(e.target.checked)} />
          Día completo
        </label>
      )}
      {(tipo === 'apertura_extra' || !diaCompleto) && (
        <Field label="De — a">
          <div style={{ display: 'flex', gap: 6 }}>
            <input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} />
            <input type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} />
          </div>
        </Field>
      )}
      <Field label="Motivo (opcional)">
        <input type="text" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej: Feriado nacional" />
      </Field>
      {error && <div className="hu-err">{error}</div>}
      <div className="hu-mactions">
        <button className="hu-btn ghost" onClick={onCancelar} disabled={guardando}>Cancelar</button>
        <button className="hu-btn primary" onClick={guardar} disabled={guardando}>
          {guardando ? 'Guardando…' : 'Agregar excepción'}
        </button>
      </div>
    </div>
  );
}

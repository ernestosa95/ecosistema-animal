// apps/web/src/components/WizardConfiguracionRapida.tsx
// Se muestra una única vez, al primer login del propietario que quedó
// dueño de una organización recién aprobada (ver App.tsx, mismo criterio de
// "una sola vez por usuario, localStorage" que TutorialGuiado). A diferencia
// del tutorial (overlay no bloqueante), esto reemplaza toda la app mientras
// está activo — es guiar un setup, no explicar la UI ya armada.
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { crearAgenda, crearBloque } from '../api/turnos';
import type { Sesion } from '../api/types';
import type { Miembro } from '../api/client';
import { FormAltaMiembro, type LimitesPlan } from './FormAltaMiembro';
import { ROLES_ATIENDEN } from '../nav/config';

const DIAS = [
  { v: 1, label: 'Lun' }, { v: 2, label: 'Mar' }, { v: 3, label: 'Mié' },
  { v: 4, label: 'Jue' }, { v: 5, label: 'Vie' }, { v: 6, label: 'Sáb' }, { v: 0, label: 'Dom' },
];

type Paso = 'bienvenida' | 'usuarios' | 'agendaVet' | 'agendaPeluqueria' | 'fin';

export function WizardConfiguracionRapida({ sesion, onFinalizar }: { sesion: Sesion; onFinalizar: () => void }) {
  const [paso, setPaso] = useState<Paso>('bienvenida');
  const [limites, setLimites] = useState<LimitesPlan | null>(null);
  const [agregados, setAgregados] = useState<string[]>([]);

  useEffect(() => { api.limitesPlan(sesion).then(setLimites).catch(() => {}); }, [sesion]);

  const siguienteTrasUsuarios: Paso = sesion.huellaActiva ? 'agendaVet' : 'fin';

  return (
    <div className="login-wrap">
      <div className="card login-card wizard-card">
        <div className="brand brand-lg">
          <span className="brand-dot" />
          Configuración rápida
        </div>

        {paso === 'bienvenida' && (
          <>
            <h1>¡Bienvenido/a!</h1>
            <p>
              Antes de arrancar, te ayudamos a dar de alta a tu equipo y armar la agenda en un par de pasos.
              Podés saltar cualquier paso y completarlo después desde "Usuarios" o "Turnos".
            </p>
            <div className="acciones">
              <button className="btn" onClick={() => setPaso('usuarios')}>Empezar</button>
              <button className="btn-ghost" onClick={onFinalizar}>Saltar por ahora</button>
            </div>
          </>
        )}

        {paso === 'usuarios' && (
          <>
            <h1>Tu equipo</h1>
            <p className="muted">Dá de alta a los usuarios que tu plan tiene disponibles. Cada uno recibe su propio email y contraseña.</p>
            <FormAltaMiembro
              sesion={sesion}
              limites={limites}
              onCreado={(u, roles) => {
                setAgregados((prev) => [...prev, `${u.nombre ?? u.email} (${roles.join(' + ')})`]);
                api.limitesPlan(sesion).then(setLimites).catch(() => {});
              }}
            />
            {agregados.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', margin: '0.75rem 0' }}>
                {agregados.map((a, i) => <span key={i} className="chip">{a}</span>)}
              </div>
            )}
            <div className="acciones" style={{ marginTop: '0.75rem' }}>
              <button className="btn" onClick={() => setPaso(siguienteTrasUsuarios)}>Continuar</button>
              <button className="btn-ghost" onClick={onFinalizar}>Saltar por ahora</button>
            </div>
          </>
        )}

        {paso === 'agendaVet' && (
          <PasoAgenda
            titulo="Agenda de tus veterinarios"
            descripcion="Elegí un veterinario y los días/horarios en que atiende. Podés repetir esto para cada uno."
            sesion={sesion}
            conProfesional
            onSiguiente={() => setPaso('agendaPeluqueria')}
            onSaltar={onFinalizar}
          />
        )}

        {paso === 'agendaPeluqueria' && (
          <PasoAgenda
            titulo="Peluquería canina (opcional)"
            descripcion="Si ofrecés peluquería, armá acá su agenda. Si no, saltá este paso."
            sesion={sesion}
            conProfesional={false}
            nombreFijo="Peluquería canina"
            onSiguiente={() => setPaso('fin')}
            onSaltar={onFinalizar}
          />
        )}

        {paso === 'fin' && (
          <>
            <h1>¡Listo!</h1>
            <p>Ya podés usar el sistema. Lo que no hayas cargado ahora lo podés completar cuando quieras desde "Usuarios" y "Turnos → ⚙ Agendas".</p>
            <button className="btn" onClick={onFinalizar}>Empezar a usar el sistema</button>
          </>
        )}
      </div>
    </div>
  );
}

/** Sub-paso reutilizado para "agenda de veterinario" y "agenda de peluquería" — mismo modelo simplificado: un solo horario para todos los días elegidos. */
function PasoAgenda({ titulo, descripcion, sesion, conProfesional, nombreFijo, onSiguiente, onSaltar }: {
  titulo: string; descripcion: string; sesion: Sesion; conProfesional: boolean; nombreFijo?: string;
  onSiguiente: () => void; onSaltar: () => void;
}) {
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [usuarioId, setUsuarioId] = useState('');
  const [dias, setDias] = useState<number[]>([1, 2, 3, 4, 5]);
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [horaFin, setHoraFin] = useState('13:00');
  const [duracionTurnoMinutos, setDuracionTurnoMinutos] = useState(30);
  const [creadas, setCreadas] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!conProfesional) return;
    api.miembros(sesion)
      .then((todos) => setMiembros(todos.filter((m) => m.roles.some((r) => ROLES_ATIENDEN.has(r)))))
      .catch(() => {});
  }, [sesion, conProfesional]);

  function toggleDia(v: number) {
    setDias((prev) => (prev.includes(v) ? prev.filter((d) => d !== v) : [...prev, v]));
  }

  async function crear() {
    setError(null);
    if (conProfesional && !usuarioId) { setError('Elegí un veterinario'); return; }
    if (dias.length === 0) { setError('Elegí al menos un día'); return; }
    if (horaFin <= horaInicio) { setError('El horario de fin tiene que ser posterior al de inicio'); return; }
    setGuardando(true);
    try {
      const miembro = miembros.find((m) => m.usuarioId === usuarioId);
      const nombre = nombreFijo ?? `Agenda de ${miembro?.nombre ?? 'profesional'} ${miembro?.apellido ?? ''}`.trim();
      const agenda = await crearAgenda({
        nombre, usuarioId: conProfesional ? usuarioId : undefined, duracionTurnoMinutos,
      });
      for (const diaSemana of dias) {
        await crearBloque(agenda.id, { diaSemana, horaInicio, horaFin });
      }
      setCreadas((prev) => [...prev, nombre]);
      setUsuarioId(''); setDias([1, 2, 3, 4, 5]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la agenda');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <h1>{titulo}</h1>
      <p className="muted">{descripcion}</p>
      {conProfesional && (
        <label>
          Veterinario
          <select value={usuarioId} onChange={(e) => setUsuarioId(e.target.value)}>
            <option value="">Elegí…</option>
            {miembros.map((m) => (
              <option key={m.usuarioId} value={m.usuarioId}>{m.nombre} {m.apellido}</option>
            ))}
          </select>
        </label>
      )}
      <label>Días</label>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        {DIAS.map((d) => (
          <label key={d.v} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <input type="checkbox" style={{ width: 'auto', margin: 0 }} checked={dias.includes(d.v)} onChange={() => toggleDia(d.v)} />
            {d.label}
          </label>
        ))}
      </div>
      <div className="form-grid">
        <label>
          Desde
          <input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} />
        </label>
        <label>
          Hasta
          <input type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} />
        </label>
        <label>
          Duración de cada turno (minutos)
          <input type="number" min={5} max={240} value={duracionTurnoMinutos} onChange={(e) => setDuracionTurnoMinutos(Number(e.target.value) || 30)} />
        </label>
      </div>
      {error && <div className="alerta">{error}</div>}
      <button className="btn-ghost" disabled={guardando} onClick={crear}>
        {guardando ? 'Creando…' : '+ Crear esta agenda'}
      </button>
      {creadas.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', margin: '0.75rem 0' }}>
          {creadas.map((c, i) => <span key={i} className="chip">✓ {c}</span>)}
        </div>
      )}
      <div className="acciones" style={{ marginTop: '0.75rem' }}>
        <button className="btn" onClick={onSiguiente}>Continuar</button>
        <button className="btn-ghost" onClick={onSaltar}>Saltar por ahora</button>
      </div>
    </>
  );
}

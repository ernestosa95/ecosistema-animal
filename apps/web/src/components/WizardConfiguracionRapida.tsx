// apps/web/src/components/WizardConfiguracionRapida.tsx
// Se muestra una única vez, al primer login del propietario que quedó
// dueño de una organización recién aprobada (ver App.tsx, mismo criterio de
// "una sola vez por usuario, localStorage" que TutorialGuiado). A diferencia
// del tutorial (overlay no bloqueante), esto reemplaza toda la app mientras
// está activo — es guiar un setup, no explicar la UI ya armada. Es
// obligatorio completarlo paso a paso hasta "fin": no hay forma de saltarlo
// entero (a pedido del negocio — antes cada paso tenía un botón "Saltar por
// ahora" que terminaba el wizard de golpe, y usuarios nuevos lo usaban sin
// llegar a configurar nada).
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { crearAgenda, crearBloque } from '../api/turnos';
import type { Sesion } from '../api/types';
import type { Miembro } from '../api/client';
import { FormAltaMiembro, type LimitesPlan } from './FormAltaMiembro';
import { ROLES_ATIENDEN } from '../nav/config';
import { ROLES_INFO } from '../config/rolesInfo';

const DIAS = [
  { v: 1, label: 'Lun' }, { v: 2, label: 'Mar' }, { v: 3, label: 'Mié' },
  { v: 4, label: 'Jue' }, { v: 5, label: 'Vie' }, { v: 6, label: 'Sáb' }, { v: 0, label: 'Dom' },
];

type Paso = 'bienvenida' | 'usuarios' | 'agendaVet' | 'agendaNoMedica' | 'fin';

export function WizardConfiguracionRapida({ sesion, miUsuarioId, onFinalizar, onCerrarSesion, onRolesPropiosActualizados }: {
  sesion: Sesion; miUsuarioId: string | undefined; onFinalizar: () => void; onCerrarSesion: () => void;
  onRolesPropiosActualizados: (roles: string[]) => void;
}) {
  const [paso, setPaso] = useState<Paso>('bienvenida');

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
            </p>
            <div className="acciones">
              <button className="btn" onClick={() => setPaso('usuarios')}>Empezar</button>
            </div>
          </>
        )}

        {paso === 'usuarios' && (
          <PasoEquipo
            sesion={sesion}
            miUsuarioId={miUsuarioId}
            onRolesPropiosActualizados={onRolesPropiosActualizados}
            onSiguiente={() => setPaso(siguienteTrasUsuarios)}
          />
        )}

        {paso === 'agendaVet' && (
          <PasoAgenda
            titulo="Agenda de tus veterinarios"
            descripcion="Elegí un veterinario y los días/horarios en que atiende. Podés repetir esto para cada uno."
            sesion={sesion}
            conProfesional
            onSiguiente={() => setPaso('agendaNoMedica')}
          />
        )}

        {paso === 'agendaNoMedica' && (
          <PasoAgenda
            titulo="Agenda no médica"
            descripcion="Si ofrecés algún servicio sin veterinario de por medio (por ejemplo, peluquería canina), armá acá su agenda. Si no ofrecés ninguno, continuá sin cargar nada."
            sesion={sesion}
            conProfesional={false}
            placeholderNombre="Ej: Peluquería canina"
            onSiguiente={() => setPaso('fin')}
          />
        )}

        {paso === 'fin' && (
          <>
            <h1>¡Listo!</h1>
            <p>Ya podés usar el sistema. Lo que no hayas cargado ahora lo podés completar cuando quieras desde "Usuarios" y "Turnos → ⚙ Agendas".</p>
            <button className="btn" onClick={onFinalizar}>Empezar a usar el sistema</button>
          </>
        )}

        {paso !== 'fin' && (
          <p className="switch" style={{ marginTop: '1rem' }}>
            <button type="button" className="link" onClick={onCerrarSesion}>
              Cerrar sesión
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Paso "Tu equipo": en vez de arrancar directo con un form de alta (poco
 * claro sobre qué hacer cuando en principio el único miembro es uno
 * mismo), primero muestra los miembros que ya existen — al menos el
 * propietario — para asignarles roles adicionales in place (ej. el
 * propietario también atiende como veterinario). "+ Agregar usuario" queda
 * al final, para cuando el rol que hace falta todavía no lo cubre nadie.
 */
function PasoEquipo({ sesion, miUsuarioId, onRolesPropiosActualizados, onSiguiente }: {
  sesion: Sesion; miUsuarioId: string | undefined; onRolesPropiosActualizados: (roles: string[]) => void;
  onSiguiente: () => void;
}) {
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [limites, setLimites] = useState<LimitesPlan | null>(null);
  const [mostrarAlta, setMostrarAlta] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Miembro cuyo cambio de rol está en vuelo — sus checkboxes se deshabilitan
  // mientras tanto, para no calcular `nuevosRoles` dos veces a partir del
  // mismo `m.roles` desactualizado si se tildan dos roles rápido seguido.
  const [guardandoId, setGuardandoId] = useState<string | null>(null);

  function cargar() {
    api.miembros(sesion).then(setMiembros).catch(() => {});
    api.limitesPlan(sesion).then(setLimites).catch(() => {});
  }
  useEffect(cargar, [sesion]); // eslint-disable-line react-hooks/exhaustive-deps

  async function cambiarRol(m: Miembro, rolId: string, marcado: boolean) {
    const nuevosRoles = marcado ? [...m.roles, rolId] : m.roles.filter((r) => r !== rolId);
    if (nuevosRoles.length === 0) { setError('Un usuario necesita al menos un rol asignado'); return; }
    setError(null);
    setGuardandoId(m.usuarioId);
    try {
      await api.actualizarRolesMiembro(sesion, m.usuarioId, nuevosRoles);
      if (m.usuarioId === miUsuarioId) onRolesPropiosActualizados(nuevosRoles);
      cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el rol');
    } finally {
      setGuardandoId(null);
    }
  }

  return (
    <>
      <h1>Tu equipo</h1>
      <p className="muted">
        Asignale roles a quienes ya forman parte de la organización — por ejemplo, el propietario
        también puede atender como veterinario. Si necesitás sumar a alguien que todavía no está,
        usá "+ Agregar usuario" al final de la lista.
      </p>
      {error && <div className="alerta">{error}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
        {miembros.map((m) => (
          <div key={m.usuarioId} className="card" style={{ padding: '0.75rem 0.9rem' }}>
            <b>{m.nombre} {m.apellido}</b>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.5rem' }}>
              {ROLES_INFO.map((r) => {
                const tiene = m.roles.includes(r.id);
                const lim = limites?.[r.id];
                const sinCupo = !tiene && !!lim && lim.limite != null && lim.usados >= lim.limite;
                const guardando = guardandoId === m.usuarioId;
                return (
                  <label
                    key={r.id}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', opacity: sinCupo ? 0.5 : 1 }}
                  >
                    <input
                      type="checkbox"
                      style={{ width: 'auto', margin: 0 }}
                      checked={tiene}
                      disabled={sinCupo || guardando}
                      onChange={(e) => cambiarRol(m, r.id, e.target.checked)}
                    />
                    {r.label}
                    {lim && lim.limite != null && (
                      <span className="muted" style={{ fontSize: '0.78rem' }}>({lim.usados}/{lim.limite})</span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {mostrarAlta ? (
        <div className="card" style={{ padding: '0.9rem', marginBottom: '0.75rem' }}>
          <p className="muted" style={{ marginTop: 0, fontSize: '0.85rem' }}>
            Para cuando el rol que necesitás todavía no lo tiene nadie en la organización (ej. no
            contás con un administrativo).
          </p>
          <FormAltaMiembro
            sesion={sesion}
            limites={limites}
            onCreado={() => { setMostrarAlta(false); cargar(); }}
          />
        </div>
      ) : (
        <button className="btn-ghost" onClick={() => setMostrarAlta(true)}>+ Agregar usuario</button>
      )}

      <div className="acciones" style={{ marginTop: '0.75rem' }}>
        <button className="btn" onClick={onSiguiente}>Continuar</button>
      </div>
    </>
  );
}

/**
 * Sub-paso reutilizado para "agenda de veterinario" y "agenda no médica"
 * (ej. peluquería canina, sólo un ejemplo — el nombre real de la agenda es
 * texto libre) — mismo modelo simplificado: un solo horario para todos los
 * días elegidos.
 */
function PasoAgenda({ titulo, descripcion, sesion, conProfesional, placeholderNombre, onSiguiente }: {
  titulo: string; descripcion: string; sesion: Sesion; conProfesional: boolean; placeholderNombre?: string;
  onSiguiente: () => void;
}) {
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [usuarioId, setUsuarioId] = useState('');
  const [nombreAgenda, setNombreAgenda] = useState('');
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
    if (!conProfesional && !nombreAgenda.trim()) { setError('Ponele un nombre a la agenda'); return; }
    if (dias.length === 0) { setError('Elegí al menos un día'); return; }
    if (horaFin <= horaInicio) { setError('El horario de fin tiene que ser posterior al de inicio'); return; }
    setGuardando(true);
    try {
      const miembro = miembros.find((m) => m.usuarioId === usuarioId);
      const nombre = conProfesional
        ? `Agenda de ${miembro?.nombre ?? 'profesional'} ${miembro?.apellido ?? ''}`.trim()
        : nombreAgenda.trim();
      const agenda = await crearAgenda({
        nombre, usuarioId: conProfesional ? usuarioId : undefined, duracionTurnoMinutos,
      });
      for (const diaSemana of dias) {
        await crearBloque(agenda.id, { diaSemana, horaInicio, horaFin });
      }
      setCreadas((prev) => [...prev, nombre]);
      setUsuarioId(''); setNombreAgenda(''); setDias([1, 2, 3, 4, 5]);
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
      {conProfesional ? (
        <label>
          Veterinario
          <select value={usuarioId} onChange={(e) => setUsuarioId(e.target.value)}>
            <option value="">Elegí…</option>
            {miembros.map((m) => (
              <option key={m.usuarioId} value={m.usuarioId}>{m.nombre} {m.apellido}</option>
            ))}
          </select>
        </label>
      ) : (
        <label>
          Nombre de la agenda
          <input value={nombreAgenda} onChange={(e) => setNombreAgenda(e.target.value)} placeholder={placeholderNombre} />
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
      </div>
    </>
  );
}

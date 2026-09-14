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
          <PasoAgendaVeterinarios
            sesion={sesion}
            onSiguiente={() => setPaso('agendaNoMedica')}
          />
        )}

        {paso === 'agendaNoMedica' && (
          <PasoAgenda sesion={sesion} onSiguiente={() => setPaso('fin')} />
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
 * mismo), primero pregunta por el propio propietario (logueado en este
 * mismo momento) — deja explícito que esa fila sos vos, no un tercero — y
 * después ofrece sumar a quien más haga falta. "Administrador" no se
 * ofrece acá (alta rápida, no el lugar para repartir ese nivel de acceso) y
 * "Capataz" sólo si la organización tiene Tropera activo — ambos, para
 * cualquier miembro de la lista, no sólo para uno mismo.
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

  const rolesExcluidos = ['admin', ...(sesion.troperaActiva ? [] : ['capataz'])];
  const rolesOfrecidos = ROLES_INFO.filter((r) => !rolesExcluidos.includes(r.id));

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
      <p className="muted">Empecemos por vos, y después vemos si hay alguien más en el equipo.</p>
      {error && <div className="alerta">{error}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
        {miembros.map((m) => {
          const esVos = m.usuarioId === miUsuarioId;
          // Para vos: "Propietario" ya está dado, no se vuelve a preguntar —
          // sólo interesa qué rol extra ocupás además de eso.
          const rolesFila = esVos ? rolesOfrecidos.filter((r) => r.id !== 'propietario') : rolesOfrecidos;
          return (
            <div key={m.usuarioId} className="card" style={{ padding: '0.75rem 0.9rem' }}>
              {esVos ? (
                <>
                  <b>Vos — {m.nombre} {m.apellido}</b>
                  <p className="muted" style={{ margin: '0.2rem 0 0', fontSize: '0.85rem' }}>
                    Ya sos Propietario. ¿Ocupás algún rol más en la institución (por ejemplo, también atendés como veterinario)?
                  </p>
                </>
              ) : (
                <b>{m.nombre} {m.apellido}</b>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.5rem' }}>
                {rolesFila.map((r) => {
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
          );
        })}
      </div>

      <p style={{ fontWeight: 600, marginBottom: '0.2rem' }}>¿Tu equipo tiene más miembros?</p>
      {mostrarAlta ? (
        <div className="card" style={{ padding: '0.9rem', marginBottom: '0.75rem' }}>
          <p className="muted" style={{ marginTop: 0, fontSize: '0.85rem' }}>
            Cargalos ahora — vas a poder sumar más adelante desde "Usuarios" también.
          </p>
          <FormAltaMiembro
            sesion={sesion}
            limites={limites}
            rolesExcluidos={rolesExcluidos}
            onCreado={() => { setMostrarAlta(false); cargar(); }}
          />
        </div>
      ) : (
        <button className="btn-ghost" onClick={() => setMostrarAlta(true)}>+ Agregalos</button>
      )}

      <div className="acciones" style={{ marginTop: '0.75rem' }}>
        <button className="btn" onClick={onSiguiente}>Continuar</button>
      </div>
    </>
  );
}

/**
 * Paso "Agenda de tus veterinarios" — a diferencia del resto del wizard,
 * no es un form suelto: pregunta uno por uno, por nombre, a cada persona
 * que puede atender (rol veterinario o propietario, ver ROLES_ATIENDEN),
 * "¿configuramos la agenda de X?" — sólo revela el form de días/horario si
 * contesta que sí, y pasa sola al siguiente candidato al terminar (creada o
 * salteada). Se armó así después de que un usuario probándolo señaló que el
 * dropdown genérico de "Agenda de tus veterinarios" no guiaba nada a
 * alguien que recién arranca — quedaba como un formulario más, no como una
 * pregunta.
 */
function PasoAgendaVeterinarios({ sesion, onSiguiente }: { sesion: Sesion; onSiguiente: () => void }) {
  const [candidatos, setCandidatos] = useState<Miembro[] | null>(null); // null = todavía cargando
  const [indice, setIndice] = useState(0);
  const [configurandoActual, setConfigurandoActual] = useState(false);
  const [dias, setDias] = useState<number[]>([1, 2, 3, 4, 5]);
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [horaFin, setHoraFin] = useState('13:00');
  const [duracionTurnoMinutos, setDuracionTurnoMinutos] = useState(30);
  const [creadas, setCreadas] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    api.miembros(sesion)
      .then((todos) => setCandidatos(todos.filter((m) => m.roles.some((r) => ROLES_ATIENDEN.has(r)))))
      .catch(() => setCandidatos([]));
  }, [sesion]);

  function toggleDia(v: number) {
    setDias((prev) => (prev.includes(v) ? prev.filter((d) => d !== v) : [...prev, v]));
  }

  function siguienteCandidato() {
    setConfigurandoActual(false);
    setError(null);
    setDias([1, 2, 3, 4, 5]); setHoraInicio('09:00'); setHoraFin('13:00'); setDuracionTurnoMinutos(30);
    setIndice((i) => i + 1);
  }

  async function crear(actual: Miembro) {
    setError(null);
    if (dias.length === 0) { setError('Elegí al menos un día'); return; }
    if (horaFin <= horaInicio) { setError('El horario de fin tiene que ser posterior al de inicio'); return; }
    setGuardando(true);
    try {
      const nombre = `Agenda de ${actual.nombre} ${actual.apellido}`.trim();
      const agenda = await crearAgenda({ nombre, usuarioId: actual.usuarioId, duracionTurnoMinutos });
      for (const diaSemana of dias) {
        await crearBloque(agenda.id, { diaSemana, horaInicio, horaFin });
      }
      setCreadas((prev) => [...prev, nombre]);
      siguienteCandidato();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la agenda');
    } finally {
      setGuardando(false);
    }
  }

  if (candidatos === null) return null; // evita el parpadeo "no hay nadie" mientras carga

  if (candidatos.length === 0) {
    return (
      <>
        <h1>Agenda de tus veterinarios</h1>
        <p className="muted">
          Todavía no tenés a nadie con rol de veterinario cargado — podés armar esto más adelante
          desde "Turnos → ⚙ Agendas".
        </p>
        <div className="acciones" style={{ marginTop: '0.75rem' }}>
          <button className="btn" onClick={onSiguiente}>Continuar</button>
        </div>
      </>
    );
  }

  if (indice >= candidatos.length) {
    return (
      <>
        <h1>Agenda de tus veterinarios</h1>
        {creadas.length > 0 ? (
          <>
            <p className="muted">Listo, quedaron armadas:</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', margin: '0.5rem 0 1rem' }}>
              {creadas.map((c, i) => <span key={i} className="chip">✓ {c}</span>)}
            </div>
          </>
        ) : (
          <p className="muted">Sin agendas por ahora — las podés armar cuando quieras desde "Turnos → ⚙ Agendas".</p>
        )}
        <div className="acciones" style={{ marginTop: '0.75rem' }}>
          <button className="btn" onClick={onSiguiente}>Continuar</button>
        </div>
      </>
    );
  }

  const actual = candidatos[indice]!;

  return (
    <>
      <h1>Agenda de tus veterinarios</h1>
      {!configurandoActual ? (
        <>
          <p className="muted">
            ¿Configuramos la agenda de <b>{actual.nombre} {actual.apellido}</b>?
          </p>
          <div className="acciones">
            <button className="btn" onClick={() => setConfigurandoActual(true)}>Sí, configurar</button>
            <button className="btn-ghost" onClick={siguienteCandidato}>Ahora no</button>
          </div>
        </>
      ) : (
        <>
          <p className="muted">Días y horario en que atiende {actual.nombre}:</p>
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
          <div className="acciones">
            <button className="btn-ghost" disabled={guardando} onClick={() => crear(actual)}>
              {guardando ? 'Creando…' : '+ Crear esta agenda'}
            </button>
            <button type="button" className="link" disabled={guardando} onClick={() => setConfigurandoActual(false)}>
              ‹ Cancelar
            </button>
          </div>
        </>
      )}
    </>
  );
}

/**
 * Sub-paso "agenda no médica" (ej. peluquería canina, sólo un ejemplo — el
 * nombre real de la agenda es texto libre). Mismo criterio que
 * PasoAgendaVeterinarios: arranca con una pregunta de sí/no en vez de tirar
 * el form de una — acá no hay una lista fija de candidatos (el servicio es
 * lo que cada organización quiera), así que en vez de recorrer un array se
 * vuelve a preguntar "¿otro más?" después de cada alta, hasta que contesten que no.
 */
function PasoAgenda({ sesion, onSiguiente }: { sesion: Sesion; onSiguiente: () => void }) {
  const [etapa, setEtapa] = useState<'pregunta' | 'form'>('pregunta');
  const [nombreAgenda, setNombreAgenda] = useState('');
  const [dias, setDias] = useState<number[]>([1, 2, 3, 4, 5]);
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [horaFin, setHoraFin] = useState('13:00');
  const [duracionTurnoMinutos, setDuracionTurnoMinutos] = useState(30);
  const [creadas, setCreadas] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  function toggleDia(v: number) {
    setDias((prev) => (prev.includes(v) ? prev.filter((d) => d !== v) : [...prev, v]));
  }

  async function crear() {
    setError(null);
    if (!nombreAgenda.trim()) { setError('Ponele un nombre a la agenda'); return; }
    if (dias.length === 0) { setError('Elegí al menos un día'); return; }
    if (horaFin <= horaInicio) { setError('El horario de fin tiene que ser posterior al de inicio'); return; }
    setGuardando(true);
    try {
      const nombre = nombreAgenda.trim();
      const agenda = await crearAgenda({ nombre, duracionTurnoMinutos });
      for (const diaSemana of dias) {
        await crearBloque(agenda.id, { diaSemana, horaInicio, horaFin });
      }
      setCreadas((prev) => [...prev, nombre]);
      setNombreAgenda(''); setDias([1, 2, 3, 4, 5]); setHoraInicio('09:00'); setHoraFin('13:00'); setDuracionTurnoMinutos(30);
      setEtapa('pregunta');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la agenda');
    } finally {
      setGuardando(false);
    }
  }

  if (etapa === 'pregunta') {
    return (
      <>
        <h1>Agenda no médica</h1>
        {creadas.length === 0 ? (
          <p className="muted">
            ¿Contás con algún servicio no médico que requiera agenda? Por ejemplo, peluquería
            canina. ¿Creamos una agenda para ese servicio?
          </p>
        ) : (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
              {creadas.map((c, i) => <span key={i} className="chip">✓ {c}</span>)}
            </div>
            <p className="muted">¿Tenés otro servicio no médico para agendar?</p>
          </>
        )}
        <div className="acciones">
          <button className="btn" onClick={() => setEtapa('form')}>Sí, crear</button>
          <button className="btn-ghost" onClick={onSiguiente}>No, continuar</button>
        </div>
      </>
    );
  }

  return (
    <>
      <h1>Agenda no médica</h1>
      <label>
        Nombre de la agenda
        <input value={nombreAgenda} onChange={(e) => setNombreAgenda(e.target.value)} placeholder="Ej: Peluquería canina" autoFocus />
      </label>
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
      <div className="acciones">
        <button className="btn-ghost" disabled={guardando} onClick={crear}>
          {guardando ? 'Creando…' : '+ Crear esta agenda'}
        </button>
        <button type="button" className="link" disabled={guardando} onClick={() => setEtapa('pregunta')}>
          ‹ Cancelar
        </button>
      </div>
    </>
  );
}
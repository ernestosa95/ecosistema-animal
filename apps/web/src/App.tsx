import { useEffect, useState } from 'react';
import { useSesion } from './auth/useSesion';
import { api, configurarRefrescoSesion } from './api/client';
import { LoginPage } from './pages/LoginPage';
import { PacientesPage } from './pages/PacientesPage';
import { PacienteDetallePage } from './pages/PacienteDetallePage';
import { PersonasPage } from './pages/PersonasPage';
import TurnosPage from './pages/TurnosPage';
import RecordatoriosPage from './pages/RecordatoriosPage';
import { TroperaPage } from './pages/TroperaPage';
import { UsuariosPage } from './pages/UsuariosPage';
import { FarmaciaPage } from './pages/FarmaciaPage';
import { CajaPage } from './pages/CajaPage';
import { DashboardPage } from './pages/DashboardPage';
import { MensajesBanner } from './components/MensajesBanner';
import { Omnibox } from './components/Omnibox';
import { configurarSesionTurnos, configurarRefrescoSesionTurnos, type Turno } from './api/turnos';
import type { Animal, Persona } from './api/types';

type Vista =
  | { nombre: 'dashboard' }
  | { nombre: 'turnos' }
  | { nombre: 'animales' }
  | { nombre: 'detalle'; animal: Animal; abrirConsulta?: boolean }
  | { nombre: 'duenos'; personaId?: string }
  | { nombre: 'recordatorios' }
  | { nombre: 'tropera' }
  | { nombre: 'usuarios' }
  | { nombre: 'farmacia' }
  | { nombre: 'caja' };

/** Roles cuya pantalla de inicio es el resumen de indicadores. */
const ROLES_DASHBOARD = new Set(['propietario', 'admin']);
/** Roles cuya pantalla de inicio es el turnero (si no caen en ROLES_DASHBOARD). */
const ROLES_TURNERO = new Set(['propietario', 'admin', 'recepcion', 'veterinario']);
/** Roles que atienden (se les ofrece el filtro "Mis turnos"). */
const ROLES_ATIENDEN = new Set(['veterinario', 'propietario']);
/** Roles que gestionan establecimientos/hacienda (mismos que el backend habilita para escribir). */
const ROLES_TROPERA = new Set(['propietario', 'admin', 'capataz']);
/** Roles que pueden gestionar usuarios de su organización (resetear contraseñas). */
const ROLES_USUARIOS = new Set(['propietario', 'admin']);
/** Roles que gestionan farmacia/stock (mismos que el backend habilita para escribir). */
const ROLES_FARMACIA = new Set(['propietario', 'admin', 'veterinario']);
/** Roles que operan el mostrador de caja (auditoría/honorarios quedan filtrados dentro de CajaPage a propietario/admin). */
const ROLES_CAJA = new Set(['propietario', 'admin', 'recepcion']);

/** true si el usuario tiene ALGUNO de los roles del set (roles apilables). */
function tieneAlguno(roles: string[] | undefined, set: Set<string>): boolean {
  return (roles ?? []).some((r) => set.has(r));
}

function homeDe(roles: string[] | undefined): Vista {
  if (tieneAlguno(roles, ROLES_DASHBOARD)) return { nombre: 'dashboard' };
  return tieneAlguno(roles, ROLES_TURNERO) ? { nombre: 'turnos' } : { nombre: 'animales' };
}

/** Decodifica el `sub` (id de usuario) del JWT, sin librerías. */
function usuarioIdDeToken(token?: string): string | undefined {
  if (!token) return undefined;
  try {
    const parte = token.split('.')[1];
    const json = JSON.parse(atob(parte.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof json.sub === 'string' ? json.sub : undefined;
  } catch {
    return undefined;
  }
}

export default function App() {
  const { sesion, iniciar, cerrar, actualizarTokens } = useSesion();
  const [vista, setVista] = useState<Vista | null>(null);

  // El cliente de turnos toma la sesión desde acá (fuente de verdad).
  useEffect(() => { configurarSesionTurnos(sesion); }, [sesion]);

  // Ambos clientes API avisan acá cuando renuevan el access token solos
  // (401 → POST /auth/refresh), para persistirlo en useSesion/localStorage.
  useEffect(() => {
    const onRefresco = (tokens: { accessToken: string; refreshToken: string }) =>
      actualizarTokens(tokens.accessToken, tokens.refreshToken);
    configurarRefrescoSesion(onRefresco);
    configurarRefrescoSesionTurnos(onRefresco);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Al iniciar sesión → pantalla de inicio según rol. Al cerrar → reset.
  useEffect(() => {
    if (sesion && vista === null) setVista(homeDe(sesion.roles));
    if (!sesion && vista !== null) setVista(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesion]);

  if (!sesion) {
    return <LoginPage onSesion={iniciar} />;
  }

  const miUsuarioId = usuarioIdDeToken(sesion.token);
  const atiende = tieneAlguno(sesion.roles, ROLES_ATIENDEN);

  // Atender un turno: marca atendido (en TurnosPage) y acá abre la ficha del
  // paciente con la Nueva consulta lista para cargar.
  async function atenderDesdeTurno(t: Turno) {
    try {
      const animal = await api.obtenerAnimal(sesion, t.pacienteId);
      setVista({ nombre: 'detalle', animal, abrirConsulta: true });
    } catch (e) {
      alert('No se pudo abrir la ficha del paciente: ' + (e instanceof Error ? e.message : 'error'));
    }
  }

  const vistaActual: Vista = vista ?? homeDe(sesion.roles);
  const seccion =
    vistaActual.nombre === 'dashboard'
      ? 'dashboard'
      : vistaActual.nombre === 'turnos'
      ? 'turnos'
      : vistaActual.nombre === 'duenos'
      ? 'duenos'
      : vistaActual.nombre === 'recordatorios'
      ? 'recordatorios'
      : vistaActual.nombre === 'tropera'
      ? 'tropera'
      : vistaActual.nombre === 'usuarios'
      ? 'usuarios'
      : vistaActual.nombre === 'farmacia'
      ? 'farmacia'
      : vistaActual.nombre === 'caja'
      ? 'caja'
      : 'animales';

  return (
    <div className="app">
      <Omnibox
        sesion={sesion}
        onAbrirAnimal={(animal) => setVista({ nombre: 'detalle', animal })}
        onAbrirPersona={(persona: Persona) => setVista({ nombre: 'duenos', personaId: persona.id })}
      />
      <header className="topbar">
        <div className="brand">
          <span className="brand-dot" />
          Ecosistema · Salud Animal
        </div>
        <div className="topbar-right">
          <span className="rol">{sesion.roles.join(' + ')}</span>
          <button className="btn-ghost" onClick={cerrar}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <nav className="nav">
        {tieneAlguno(sesion.roles, ROLES_DASHBOARD) && (
          <button
            className={seccion === 'dashboard' ? 'nav-item activo' : 'nav-item'}
            onClick={() => setVista({ nombre: 'dashboard' })}
          >
            Resumen
          </button>
        )}
        <button
          className={seccion === 'turnos' ? 'nav-item activo' : 'nav-item'}
          onClick={() => setVista({ nombre: 'turnos' })}
        >
          Turnos
        </button>
        <button
          className={seccion === 'animales' ? 'nav-item activo' : 'nav-item'}
          onClick={() => setVista({ nombre: 'animales' })}
        >
          Animales
        </button>
        <button
          className={seccion === 'duenos' ? 'nav-item activo' : 'nav-item'}
          onClick={() => setVista({ nombre: 'duenos' })}
        >
          Dueños
        </button>
        {tieneAlguno(sesion.roles, ROLES_TURNERO) && (
          <button
            className={seccion === 'recordatorios' ? 'nav-item activo' : 'nav-item'}
            onClick={() => setVista({ nombre: 'recordatorios' })}
          >
            Recordatorios
          </button>
        )}
        {tieneAlguno(sesion.roles, ROLES_TROPERA) && (
          <button
            className={seccion === 'tropera' ? 'nav-item activo' : 'nav-item'}
            onClick={() => setVista({ nombre: 'tropera' })}
          >
            Tropera
          </button>
        )}
        {tieneAlguno(sesion.roles, ROLES_USUARIOS) && (
          <button
            className={seccion === 'usuarios' ? 'nav-item activo' : 'nav-item'}
            onClick={() => setVista({ nombre: 'usuarios' })}
          >
            Usuarios
          </button>
        )}
        {tieneAlguno(sesion.roles, ROLES_FARMACIA) && (
          <button
            className={seccion === 'farmacia' ? 'nav-item activo' : 'nav-item'}
            onClick={() => setVista({ nombre: 'farmacia' })}
          >
            Farmacia
          </button>
        )}
        {tieneAlguno(sesion.roles, ROLES_CAJA) && (
          <button
            className={seccion === 'caja' ? 'nav-item activo' : 'nav-item'}
            onClick={() => setVista({ nombre: 'caja' })}
          >
            Caja
          </button>
        )}
      </nav>

      <main className="contenido">
        <MensajesBanner sesion={sesion} />
        {vistaActual.nombre === 'dashboard' && <DashboardPage sesion={sesion} />}
        {vistaActual.nombre === 'turnos' && (
          <TurnosPage
            onAtender={atenderDesdeTurno}
            miVeterinarioId={atiende ? miUsuarioId : undefined}
            soloMiosInicial={sesion.roles.includes('veterinario')}
          />
        )}
        {vistaActual.nombre === 'animales' && (
          <PacientesPage
            sesion={sesion}
            onAbrir={(animal) => setVista({ nombre: 'detalle', animal })}
          />
        )}
        {vistaActual.nombre === 'detalle' && (
          <PacienteDetallePage
            sesion={sesion}
            animal={vistaActual.animal}
            abrirConsulta={vistaActual.abrirConsulta}
            onVolver={() => setVista(homeDe(sesion.roles))}
          />
        )}
        {vistaActual.nombre === 'duenos' && (
          <PersonasPage sesion={sesion} personaIdInicial={vistaActual.personaId} />
        )}
        {vistaActual.nombre === 'recordatorios' && (
          <RecordatoriosPage
            sesion={sesion}
            onAbrirPaciente={(animal) => setVista({ nombre: 'detalle', animal })}
          />
        )}
        {vistaActual.nombre === 'tropera' && <TroperaPage sesion={sesion} />}
        {vistaActual.nombre === 'usuarios' && <UsuariosPage sesion={sesion} />}
        {vistaActual.nombre === 'farmacia' && <FarmaciaPage sesion={sesion} />}
        {vistaActual.nombre === 'caja' && <CajaPage sesion={sesion} />}
      </main>
    </div>
  );
}

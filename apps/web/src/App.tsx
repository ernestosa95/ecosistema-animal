import { useEffect, useState } from 'react';
import { useSesion } from './auth/useSesion';
import { api } from './api/client';
import { LoginPage } from './pages/LoginPage';
import { PacientesPage } from './pages/PacientesPage';
import { PacienteDetallePage } from './pages/PacienteDetallePage';
import { PersonasPage } from './pages/PersonasPage';
import TurnosPage from './pages/TurnosPage';
import { configurarSesionTurnos, type Turno } from './api/turnos';
import type { Animal } from './api/types';

type Vista =
  | { nombre: 'turnos' }
  | { nombre: 'animales' }
  | { nombre: 'detalle'; animal: Animal; abrirConsulta?: boolean }
  | { nombre: 'duenos' };

/** Roles cuya pantalla de inicio es el turnero. */
const ROLES_TURNERO = new Set(['propietario', 'admin', 'recepcion', 'veterinario']);
/** Roles que atienden (se les ofrece el filtro "Mis turnos"). */
const ROLES_ATIENDEN = new Set(['veterinario', 'propietario']);

function homeDe(rol: string | undefined): Vista {
  return ROLES_TURNERO.has(rol ?? '') ? { nombre: 'turnos' } : { nombre: 'animales' };
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
  const { sesion, iniciar, cerrar } = useSesion();
  const [vista, setVista] = useState<Vista | null>(null);

  // El cliente de turnos toma la sesión desde acá (fuente de verdad).
  useEffect(() => { configurarSesionTurnos(sesion); }, [sesion]);

  // Al iniciar sesión → pantalla de inicio según rol. Al cerrar → reset.
  useEffect(() => {
    if (sesion && vista === null) setVista(homeDe(sesion.rol));
    if (!sesion && vista !== null) setVista(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesion]);

  if (!sesion) {
    return <LoginPage onSesion={iniciar} />;
  }

  const miUsuarioId = usuarioIdDeToken(sesion.token);
  const atiende = ROLES_ATIENDEN.has(sesion.rol);

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

  const vistaActual: Vista = vista ?? homeDe(sesion.rol);
  const seccion =
    vistaActual.nombre === 'turnos'
      ? 'turnos'
      : vistaActual.nombre === 'duenos'
      ? 'duenos'
      : 'animales';

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-dot" />
          Ecosistema · Salud Animal
        </div>
        <div className="topbar-right">
          <span className="rol">{sesion.rol}</span>
          <button className="btn-ghost" onClick={cerrar}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <nav className="nav">
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
      </nav>

      <main className="contenido">
        {vistaActual.nombre === 'turnos' && (
          <TurnosPage
            onAtender={atenderDesdeTurno}
            miVeterinarioId={atiende ? miUsuarioId : undefined}
            soloMiosInicial={sesion.rol === 'veterinario'}
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
            onVolver={() => setVista(homeDe(sesion.rol))}
          />
        )}
        {vistaActual.nombre === 'duenos' && <PersonasPage sesion={sesion} />}
      </main>
    </div>
  );
}

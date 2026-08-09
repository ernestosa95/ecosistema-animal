import { useEffect, useState } from 'react';
import { useSesion } from './auth/useSesion';
import { LoginPage } from './pages/LoginPage';
import { PacientesPage } from './pages/PacientesPage';
import { PacienteDetallePage } from './pages/PacienteDetallePage';
import { PersonasPage } from './pages/PersonasPage';
import TurnosPage from './pages/TurnosPage';
import { configurarSesionTurnos } from './api/turnos';
import type { Animal } from './api/types';

type Vista =
  | { nombre: 'turnos' }
  | { nombre: 'animales' }
  | { nombre: 'detalle'; animal: Animal }
  | { nombre: 'duenos' };

/** Perfiles administrativos: su primera pantalla es el turnero. */
const ROLES_ADMIN = new Set(['propietario', 'admin', 'recepcion']);

function homeDe(rol: string | undefined): Vista {
  return ROLES_ADMIN.has(rol ?? '') ? { nombre: 'turnos' } : { nombre: 'animales' };
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
          <TurnosPage onAtender={() => setVista({ nombre: 'animales' })} />
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
            onVolver={() => setVista({ nombre: 'animales' })}
          />
        )}
        {vistaActual.nombre === 'duenos' && <PersonasPage sesion={sesion} />}
      </main>
    </div>
  );
}
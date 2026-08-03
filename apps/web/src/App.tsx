import { useState } from 'react';
import { useSesion } from './auth/useSesion';
import { LoginPage } from './pages/LoginPage';
import { PacientesPage } from './pages/PacientesPage';
import { PacienteDetallePage } from './pages/PacienteDetallePage';
import { PersonasPage } from './pages/PersonasPage';
import TurnosPage from './pages/TurnosPage';
import type { Animal } from './api/types';

type Vista =
  | { nombre: 'pacientes' }
  | { nombre: 'detalle'; animal: Animal }
  | { nombre: 'agenda' }
  | { nombre: 'duenos' };

export default function App() {
  const { sesion, iniciar, cerrar } = useSesion();
  const [vista, setVista] = useState<Vista>({ nombre: 'pacientes' });

  if (!sesion) {
    return <LoginPage onSesion={iniciar} />;
  }

  const seccion =
    vista.nombre === 'duenos' ? 'duenos'
      : vista.nombre === 'agenda' ? 'agenda'
        : 'pacientes';

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
          className={seccion === 'pacientes' ? 'nav-item activo' : 'nav-item'}
          onClick={() => setVista({ nombre: 'pacientes' })}
        >
          Pacientes
        </button>
        <button
          className={seccion === 'agenda' ? 'nav-item activo' : 'nav-item'}
          onClick={() => setVista({ nombre: 'agenda' })}
        >
          Agenda
        </button>
        <button
          className={seccion === 'duenos' ? 'nav-item activo' : 'nav-item'}
          onClick={() => setVista({ nombre: 'duenos' })}
        >
          Dueños
        </button>
      </nav>

      <main className="contenido">
        {vista.nombre === 'pacientes' && (
          <PacientesPage
            sesion={sesion}
            onAbrir={(animal) => setVista({ nombre: 'detalle', animal })}
          />
        )}
        {vista.nombre === 'detalle' && (
          <PacienteDetallePage
            sesion={sesion}
            animal={vista.animal}
            onVolver={() => setVista({ nombre: 'pacientes' })}
          />
        )}
        {vista.nombre === 'agenda' && (
          <TurnosPage
            onAtender={(_turno) => {
              // Opcional a futuro: abrir "Nueva consulta" del paciente atendido.
              // Ej: setVista({ nombre: 'detalle', animal: ... });
            }}
          />
        )}
        {vista.nombre === 'duenos' && <PersonasPage sesion={sesion} />}
      </main>
    </div>
  );
}

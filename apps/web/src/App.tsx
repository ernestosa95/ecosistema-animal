import { useEffect, useState } from 'react';
import { useSesion } from './auth/useSesion';
import { api, configurarRefrescoSesion } from './api/client';
import { LoginPage } from './pages/LoginPage';
import { LandingPage } from './pages/LandingPage';
import { PacientesPage } from './pages/PacientesPage';
import { PacienteDetallePage } from './pages/PacienteDetallePage';
import { PersonasPage } from './pages/PersonasPage';
import TurnosPage from './pages/TurnosPage';
import RecordatoriosPage from './pages/RecordatoriosPage';
import {
  TroperaHomeSection,
  TroperaAnimalesSection,
  TroperaPotrerosSection,
  TroperaIndividualesSection,
  TroperaPlantillasSection,
} from './pages/TroperaPage';
import { UsuariosPage } from './pages/UsuariosPage';
import { PlanPage } from './pages/PlanPage';
import { FarmaciaPage } from './pages/FarmaciaPage';
import { CajaPage } from './pages/CajaPage';
import { HuellaHomeSection } from './pages/HuellaHomeSection';
import { MensajesBanner } from './components/MensajesBanner';
import { Omnibox } from './components/Omnibox';
import { TutorialGuiado } from './components/TutorialGuiado';
import type { SeccionTour } from './tutorial/tours';
import { WizardConfiguracionRapida } from './components/WizardConfiguracionRapida';
import { configurarSesionTurnos, configurarRefrescoSesionTurnos, type Turno } from './api/turnos';
import type { Animal, Persona, Sesion } from './api/types';
import {
  NAV_TROPERA,
  NAV_HUELLA,
  ROLES_ATIENDEN,
  ROLES_DASHBOARD,
  ROLES_TURNERO,
  ROLES_USUARIOS,
  itemsVisibles,
  solucionesDisponibles,
  tieneAlguno,
  type SolucionId,
} from './nav/config';

type Vista =
  | { nombre: 'dashboard' }
  | { nombre: 'turnos' }
  | { nombre: 'animales' }
  | { nombre: 'detalle'; animal: Animal; abrirConsulta?: boolean; abrirVacuna?: boolean }
  | { nombre: 'duenos'; personaId?: string }
  | { nombre: 'recordatorios' }
  | { nombre: 'usuarios' }
  | { nombre: 'plan' }
  | { nombre: 'farmacia' }
  | { nombre: 'caja' }
  | { nombre: 'tropera-home' }
  | { nombre: 'tropera-animales' }
  | { nombre: 'tropera-potreros' }
  | { nombre: 'tropera-individuales' }
  | { nombre: 'tropera-plantillas' };

const CLAVE_SOLUCION = 'ecosistema.solucionActiva';

function solucionDe(nombre: Vista['nombre']): SolucionId {
  return nombre.startsWith('tropera-') ? 'tropera' : 'huella';
}

/** Sección inicial dentro de una solución, respetando el criterio de acceso por rol de cada ítem. */
function homeDe(roles: string[] | undefined, solucion: SolucionId): Vista {
  if (solucion === 'tropera') return { nombre: 'tropera-home' };
  if (tieneAlguno(roles, ROLES_DASHBOARD)) return { nombre: 'dashboard' };
  return tieneAlguno(roles, ROLES_TURNERO) ? { nombre: 'turnos' } : { nombre: 'animales' };
}

function solucionInicial(sesion: Sesion): SolucionId {
  const disponibles = solucionesDisponibles(sesion);
  if (disponibles.length <= 1) return disponibles[0] ?? 'huella';
  try {
    const guardada = localStorage.getItem(CLAVE_SOLUCION) as SolucionId | null;
    if (guardada && disponibles.includes(guardada)) return guardada;
  } catch {
    // localStorage no disponible — sigue con el default.
  }
  return tieneAlguno(sesion.roles, ROLES_DASHBOARD) || tieneAlguno(sesion.roles, ROLES_TURNERO) ? 'huella' : 'tropera';
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

// Guía interactiva del primer login: se muestra una sola vez por usuario
// (localStorage, no hace falta un flag en el backend para algo puramente
// de onboarding) y siempre se puede volver a abrir con el botón "Ayuda".
const CLAVE_TUTORIAL = 'ecosistema.tutorial.visto';

function tutorialYaVisto(usuarioId?: string): boolean {
  if (!usuarioId) return true;
  try {
    return localStorage.getItem(`${CLAVE_TUTORIAL}.${usuarioId}`) === '1';
  } catch {
    return true;
  }
}

function marcarTutorialVisto(usuarioId?: string): void {
  if (!usuarioId) return;
  try {
    localStorage.setItem(`${CLAVE_TUTORIAL}.${usuarioId}`, '1');
  } catch {
    // localStorage no disponible (modo privado, etc.) — no es crítico.
  }
}

// Wizard de configuración rápida: mismo criterio que el tutorial (una sola
// vez por usuario, localStorage), pero sólo para quien es propietario — es
// quien queda a cargo de una organización recién aprobada (ver
// SolicitudesService.aprobar(), siempre crea la membresía como
// "propietario"). A diferencia del tutorial, bloquea el resto de la app
// mientras está activo (ver el `return` temprano más abajo).
const CLAVE_WIZARD = 'ecosistema.wizard.visto';

function wizardYaVisto(usuarioId?: string): boolean {
  if (!usuarioId) return true;
  try {
    return localStorage.getItem(`${CLAVE_WIZARD}.${usuarioId}`) === '1';
  } catch {
    return true;
  }
}

function marcarWizardVisto(usuarioId?: string): void {
  if (!usuarioId) return;
  try {
    localStorage.setItem(`${CLAVE_WIZARD}.${usuarioId}`, '1');
  } catch {
    // localStorage no disponible (modo privado, etc.) — no es crítico.
  }
}

function IconoRail({ paths }: { paths: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: paths }}
    />
  );
}

export default function App() {
  const { sesion, iniciar, cerrar, actualizarTokens, actualizarRoles } = useSesion();
  const [vista, setVista] = useState<Vista | null>(null);
  const [solucionActiva, setSolucionActiva] = useState<SolucionId>('huella');
  const [menuUsuarioAbierto, setMenuUsuarioAbierto] = useState(false);
  const [tutorialActivo, setTutorialActivo] = useState(false);
  const miUsuarioId = usuarioIdDeToken(sesion?.token);

  // El cliente de turnos toma la sesión desde acá (fuente de verdad).
  useEffect(() => { configurarSesionTurnos(sesion); }, [sesion]);

  // Primer login de este usuario en este navegador → guía interactiva.
  useEffect(() => {
    if (sesion && miUsuarioId && !tutorialYaVisto(miUsuarioId)) {
      setTutorialActivo(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesion, miUsuarioId]);

  function cerrarTutorial() {
    setTutorialActivo(false);
    marcarTutorialVisto(miUsuarioId);
  }

  // Ambos clientes API avisan acá cuando renuevan el access token solos
  // (401 → POST /auth/refresh), para persistirlo en useSesion/localStorage.
  useEffect(() => {
    const onRefresco = (tokens: { accessToken: string; refreshToken: string }) =>
      actualizarTokens(tokens.accessToken, tokens.refreshToken);
    configurarRefrescoSesion(onRefresco);
    configurarRefrescoSesionTurnos(onRefresco);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Analítica de uso (AdminPage.tsx → "Analítica"): una pantalla por cada
  // cambio de `vista.nombre` — centralizado acá en vez de instrumentar cada
  // página por separado, ya que `vista` es la única fuente de verdad de
  // "en qué pantalla está el usuario" en toda la app.
  useEffect(() => {
    if (sesion && vista) api.registrarEvento(sesion, 'pantalla', vista.nombre);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesion, vista?.nombre]);

  // Al iniciar sesión → solución y pantalla de inicio según rol. Al cerrar → reset.
  useEffect(() => {
    if (sesion && vista === null) {
      const solucion = solucionInicial(sesion);
      setSolucionActiva(solucion);
      setVista(homeDe(sesion.roles, solucion));
    }
    if (!sesion && vista !== null) setVista(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesion]);

  if (!sesion) {
    // La landing pública (campañas de marketing) vive en '/', el login/alta
    // de cuenta en '/login' — sus botones navegan ahí (ver LandingPage.tsx).
    if (window.location.pathname === '/login') return <LoginPage onSesion={iniciar} />;
    return <LandingPage />;
  }

  if (sesion.roles.includes('propietario') && !wizardYaVisto(miUsuarioId)) {
    return (
      <WizardConfiguracionRapida
        sesion={sesion}
        miUsuarioId={miUsuarioId}
        onFinalizar={() => { marcarWizardVisto(miUsuarioId); setVista(homeDe(sesion.roles, solucionInicial(sesion))); }}
        onCerrarSesion={cerrar}
        onRolesPropiosActualizados={actualizarRoles}
      />
    );
  }

  const disponibles = solucionesDisponibles(sesion);
  const atiende = tieneAlguno(sesion.roles, ROLES_ATIENDEN);

  // Un admin puede desactivar ambas soluciones (ej. una organización
  // suspendida) — sin esto, el rail caería al fallback 'huella' de
  // homeDe()/solucionActiva y mostraría secciones a las que en realidad no
  // hay acceso.
  if (disponibles.length === 0) {
    return (
      <div className="login-wrap">
        <div className="card login-card">
          <div className="brand brand-lg">
            <span className="brand-dot" />
            Ecosistema · Salud Animal
          </div>
          <h1>Sin soluciones activas</h1>
          <p className="muted">
            Tu organización no tiene ninguna solución habilitada (Tropera ni Huella) en este momento.
            Contactá a quien administra tu cuenta.
          </p>
          <button className="btn-ghost" onClick={cerrar}>
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  /** Navega a una vista, sincronizando qué solución queda activa en el rail. */
  function irA(v: Vista) {
    setVista(v);
    setSolucionActiva(solucionDe(v.nombre));
  }

  function cambiarSolucion(s: SolucionId) {
    setSolucionActiva(s);
    try {
      localStorage.setItem(CLAVE_SOLUCION, s);
    } catch {
      // localStorage no disponible — no es crítico, sólo se pierde la persistencia.
    }
    if (sesion) setVista(homeDe(sesion.roles, s));
  }

  // Atender un turno: marca atendido (en TurnosPage) y acá abre la ficha del
  // paciente con la Nueva consulta lista para cargar.
  async function atenderDesdeTurno(t: Turno) {
    if (!sesion) return;
    try {
      const animal = await api.obtenerAnimal(sesion, t.pacienteId);
      irA({ nombre: 'detalle', animal, abrirConsulta: true });
    } catch (e) {
      alert('No se pudo abrir la ficha del paciente: ' + (e instanceof Error ? e.message : 'error'));
    }
  }

  const vistaActual: Vista = vista ?? homeDe(sesion.roles, solucionActiva);
  const activoId = vistaActual.nombre === 'detalle' ? 'animales' : vistaActual.nombre;
  const itemsSolucionActiva = itemsVisibles(
    solucionActiva === 'tropera' ? NAV_TROPERA : NAV_HUELLA,
    sesion.roles,
  );
  const nombreSolucion = (s: SolucionId) => (s === 'tropera' ? 'Tropera' : 'Huella');
  const tituloActivo =
    itemsSolucionActiva.find((it) => it.id === activoId)?.titulo ??
    (vistaActual.nombre === 'usuarios' ? 'Usuarios' : vistaActual.nombre === 'plan' ? 'Mi plan' : '');

  return (
    <div className="app app-rail">
      <Omnibox
        sesion={sesion}
        onAbrirAnimal={(animal) => irA({ nombre: 'detalle', animal })}
        onAbrirPersona={(persona: Persona) => irA({ nombre: 'duenos', personaId: persona.id })}
      />

      <aside className="nav-rail">
        {disponibles.length > 1 && (
          <div className="solutions-group">
            {disponibles.map((s) => (
              <button
                key={s}
                className={`solution-btn ${s}${solucionActiva === s ? ' active' : ''}`}
                title={nombreSolucion(s)}
                onClick={() => cambiarSolucion(s)}
              >
                {s === 'tropera' ? 'T' : 'H'}
              </button>
            ))}
          </div>
        )}

        <div className="options-group">
          {itemsSolucionActiva.map((it) => (
            <button
              key={it.id}
              data-tour={`nav-${it.id}`}
              className={`option-btn${activoId === it.id ? ' active' : ''}`}
              data-title={it.titulo}
              onClick={() => irA({ nombre: it.id } as Vista)}
            >
              <IconoRail paths={it.icono} />
            </button>
          ))}
        </div>

        <div className="user-group">
          <button
            className="user-btn"
            data-tour="nav-usuario-menu"
            onClick={() => setMenuUsuarioAbierto((v) => !v)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </button>

          {menuUsuarioAbierto && (
            <>
            <div className="overlay-transparente" onClick={() => setMenuUsuarioAbierto(false)} />
            <div className="user-dropdown">
              <span className="dropdown-rol">{sesion.roles.join(' + ')}</span>
              {tieneAlguno(sesion.roles, ROLES_USUARIOS) && (
                <button
                  className="dropdown-item"
                  data-tour="nav-usuarios"
                  onClick={() => {
                    setMenuUsuarioAbierto(false);
                    setVista({ nombre: 'usuarios' });
                  }}
                >
                  Usuarios
                </button>
              )}
              {tieneAlguno(sesion.roles, ROLES_USUARIOS) && (
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setMenuUsuarioAbierto(false);
                    setVista({ nombre: 'plan' });
                  }}
                >
                  Mi plan
                </button>
              )}
              <button
                className="dropdown-item"
                onClick={() => {
                  setMenuUsuarioAbierto(false);
                  setTutorialActivo(true);
                }}
              >
                ❓ Ayuda
              </button>
              <div className="dropdown-divider" />
              <button
                className="dropdown-item"
                onClick={() => {
                  setMenuUsuarioAbierto(false);
                  cerrar();
                }}
              >
                Cerrar sesión
              </button>
            </div>
            </>
          )}
        </div>
      </aside>

      <main className="contenido-shell">
        <MensajesBanner sesion={sesion} />
        <div className="content-header">
          <div className={`badge-${solucionActiva}`}>
            <span>{nombreSolucion(solucionActiva)}</span>
            {tituloActivo && (
              <>
                <span className="separator">|</span>
                <span>{tituloActivo}</span>
              </>
            )}
          </div>
        </div>

        <div className="contenido">
          {vistaActual.nombre === 'dashboard' && (
            <HuellaHomeSection
              sesion={sesion}
              onAbrirPaciente={(animal, opts) => irA({ nombre: 'detalle', animal, ...opts })}
              onIrATurnos={() => irA({ nombre: 'turnos' })}
            />
          )}
          {vistaActual.nombre === 'turnos' && (
            <TurnosPage
              onAtender={atenderDesdeTurno}
              miVeterinarioId={atiende ? miUsuarioId : undefined}
              soloMiosInicial={sesion.roles.includes('veterinario')}
            />
          )}
          {vistaActual.nombre === 'animales' && (
            <PacientesPage sesion={sesion} onAbrir={(animal) => irA({ nombre: 'detalle', animal })} />
          )}
          {vistaActual.nombre === 'detalle' && (
            <PacienteDetallePage
              sesion={sesion}
              animal={vistaActual.animal}
              abrirConsulta={vistaActual.abrirConsulta}
              abrirVacuna={vistaActual.abrirVacuna}
              onVolver={() => irA({ nombre: 'animales' })}
            />
          )}
          {vistaActual.nombre === 'duenos' && (
            <PersonasPage sesion={sesion} personaIdInicial={vistaActual.personaId} />
          )}
          {vistaActual.nombre === 'recordatorios' && (
            <RecordatoriosPage sesion={sesion} onAbrirPaciente={(animal) => irA({ nombre: 'detalle', animal })} />
          )}
          {vistaActual.nombre === 'usuarios' && <UsuariosPage sesion={sesion} />}
          {vistaActual.nombre === 'plan' && <PlanPage sesion={sesion} />}
          {vistaActual.nombre === 'farmacia' && <FarmaciaPage sesion={sesion} />}
          {vistaActual.nombre === 'caja' && <CajaPage sesion={sesion} />}
          {vistaActual.nombre === 'tropera-home' && <TroperaHomeSection sesion={sesion} />}
          {vistaActual.nombre === 'tropera-animales' && <TroperaAnimalesSection sesion={sesion} />}
          {vistaActual.nombre === 'tropera-potreros' && <TroperaPotrerosSection sesion={sesion} />}
          {vistaActual.nombre === 'tropera-individuales' && <TroperaIndividualesSection sesion={sesion} />}
          {vistaActual.nombre === 'tropera-plantillas' && <TroperaPlantillasSection sesion={sesion} />}
        </div>
      </main>

      <TutorialGuiado
        sesion={sesion}
        activo={tutorialActivo}
        seccionActual={activoId as SeccionTour}
        onNavegar={(s) => irA({ nombre: s } as Vista)}
        onTerminar={cerrarTutorial}
      />
    </div>
  );
}

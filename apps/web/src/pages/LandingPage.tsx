import { useEffect, useState } from 'react';
import { listarPlanesPublicos, type PlanPublico } from '../api/solicitudes';
import { consultarCupoInteresados, type CupoInteresados } from '../api/interesados';
import { ModalInteres } from '../components/ModalInteres';
import { ROLES_INFO } from '../config/rolesInfo';

/**
 * Landing pública para campañas de marketing (no requiere sesión) —
 * enfocada en Huella (la solución más madura hoy; Tropera puede sumar su
 * propia landing/sección más adelante). Vive en '/' (ver App.tsx).
 *
 * Estrategia de lanzamiento (temporal): el alta self-service directa a
 * '/login' queda reemplazada en todos los CTA por una captura de interés
 * ("Estoy interesado" → ModalInteres, cupo fijo de 10, ver
 * `api/interesados.ts`/`InteresadosService` en el backend) — el dueño del
 * negocio hace el alta a mano de esas primeras 10 veterinarias. "Iniciar
 * sesión" no cambia, es para quien ya tiene cuenta. Si en algún momento se
 * vuelve a habilitar el alta directa, restaurar `irALogin()` (todavía la usa
 * el botón de "Iniciar sesión") en los CTA que ahora usan `BotonInteres`.
 */
export function LandingPage() {
  const [planes, setPlanes] = useState<PlanPublico[] | null>(null);
  const [tabActiva, setTabActiva] = useState<string>(FEATURES[0].id);
  const [cupo, setCupo] = useState<CupoInteresados | null>(null);
  const [modalAbierta, setModalAbierta] = useState(false);

  useEffect(() => {
    listarPlanesPublicos()
      .then(setPlanes)
      .catch(() => setPlanes([]));
    consultarCupoInteresados()
      .then(setCupo)
      .catch(() => setCupo({ disponible: true, restantes: 10 })); // si falla la consulta, no bloquear el CTA
  }, []);

  function irALogin(planId?: string) {
    window.location.href = planId ? `/login?plan=${planId}` : '/login';
  }

  /** CTA de alta: botón mientras haya cupo, aviso de cupo completo si no. */
  function BotonInteres({ className, children }: { className: string; children: React.ReactNode }) {
    if (cupo && !cupo.disponible) {
      return (
        <span className={className} style={{ opacity: 0.6, cursor: 'default', pointerEvents: 'none' }}>
          Cupo completo por ahora
        </span>
      );
    }
    return (
      <button className={className} onClick={() => setModalAbierta(true)}>
        {children}
      </button>
    );
  }

  const tab = FEATURES.find((f) => f.id === tabActiva) ?? FEATURES[0];

  return (
    <div className="landing">
      <nav className="landing-nav">
        <span className="landing-logo">🐾 Huella</span>
        <div className="landing-nav-links">
          <a href="#funcionalidades">Funcionalidades</a>
          <a href="#pasos">Cómo funciona</a>
          <a href="#planes">Planes</a>
        </div>
        <div className="landing-nav-acciones">
          <button className="landing-btn-ghost landing-btn-sm" onClick={() => irALogin()}>
            Iniciar sesión
          </button>
          <BotonInteres className="landing-btn landing-btn-sm">Estoy interesado</BotonInteres>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <header className="landing-hero">
        <span className="landing-eyebrow">Gestión clínica veterinaria</span>
        <h1 className="landing-serif">
          Toda tu veterinaria,
          <br />
          <em>en un solo lugar.</em>
        </h1>
        <p>
          Historia clínica, turnero, farmacia y caja conectados entre sí — para que el consultorio
          funcione de punta a punta sin planillas sueltas ni WhatsApp como sistema de turnos.
        </p>
        <div className="landing-hero-acciones">
          <BotonInteres className="landing-btn">Estoy interesado</BotonInteres>
          <a className="landing-btn-ghost" href="#planes">
            Ver planes
          </a>
        </div>
        <p className="muted" style={{ marginTop: '0.6rem', fontSize: '0.85rem' }}>
          Los primeros 10 en anotarse tienen los primeros 3 meses gratis.
        </p>

        <div className="landing-mockup">
          <div className="landing-mockup-top">
            <div>
              <span className="landing-mockup-dot" />
              <span className="landing-mockup-dot" />
              <span className="landing-mockup-dot" />
            </div>
            <span className="landing-mockup-titulo">Huella — Centro de operaciones</span>
            <span />
          </div>
          <div className="landing-mockup-body">
            <div className="landing-mockup-grid">
              {[
                ['🩺', 'Nueva consulta', 'Elegí al paciente'],
                ['💉', 'Registro de vacuna', 'Aplicación + próxima dosis'],
                ['🛒', 'Venta común', 'Stock de farmacia'],
                ['📅', 'Nuevo turno', 'Con paciente inline'],
              ].map(([icono, titulo, sub]) => (
                <div className="landing-mockup-card" key={titulo}>
                  <span className="landing-mockup-card-icono">{icono}</span>
                  <span className="landing-mockup-card-titulo">{titulo}</span>
                  <span className="landing-mockup-card-sub">{sub}</span>
                </div>
              ))}
            </div>
            <div className="landing-mockup-tabla">
              <div className="landing-mockup-tabla-head">
                <span>Turnos de hoy</span>
                <span>3</span>
              </div>
              {[
                ['Firulais', '10:30 · Consulta', 'Confirmado'],
                ['Michi', '11:15 · Vacunación', 'Confirmado'],
                ['Toby', '09:00 · Control', 'Atendido'],
              ].map(([nombre, detalle, estado]) => (
                <div className="landing-mockup-fila" key={nombre}>
                  <span>
                    <b style={{ color: 'var(--text)' }}>{nombre}</b> · {detalle}
                  </span>
                  <span className="landing-mockup-chip">{estado}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="landing-badges">
        <span className="landing-badge">☁️ 100% web, sin instalación</span>
        <span className="landing-badge">📱 Portal del dueño sin descargar nada</span>
        <span className="landing-badge">🔐 Roles y permisos por miembro</span>
        <span className="landing-badge">🧾 Caja con auditoría automática</span>
      </div>

      {/* ── Pasos ────────────────────────────────────────────────────── */}
      <section className="landing-section" id="pasos">
        <div className="landing-section-head">
          <h2 className="landing-serif">
            Empezá a operar <em>en tres pasos</em>
          </h2>
          <p>Sin capacitación externa: el tutorial guiado te acompaña desde el primer login.</p>
        </div>
        <div className="landing-pasos">
          <div className="landing-paso">
            <span className="landing-paso-numero">1</span>
            <h3>Creá tu cuenta y elegí tu plan</h3>
            <p>Elegís cuántos veterinarios, administrativos y accesos necesita tu equipo.</p>
            <div className="landing-paso-tags">
              <span className="landing-tag">Alta en minutos</span>
              <span className="landing-tag">Sin instalación</span>
            </div>
          </div>
          <div className="landing-paso">
            <span className="landing-paso-numero">2</span>
            <h3>Cargá tu equipo y tus pacientes</h3>
            <p>Alta de miembros, dueños y mascotas — con datos por especie configurables.</p>
            <div className="landing-paso-tags">
              <span className="landing-tag">Roles por miembro</span>
              <span className="landing-tag">Alta inline del dueño</span>
            </div>
          </div>
          <div className="landing-paso">
            <span className="landing-paso-numero">3</span>
            <h3>Atendé, cobrá y listo</h3>
            <p>Consulta, turnero, farmacia y caja conectados: atender un turno abre la ficha lista.</p>
            <div className="landing-paso-tags">
              <span className="landing-tag">Todo conectado</span>
              <span className="landing-tag">Portal automático</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Funcionalidades ──────────────────────────────────────────── */}
      <section className="landing-section" id="funcionalidades">
        <div className="landing-section-head">
          <h2 className="landing-serif">
            Todo lo que <em>necesita el mostrador</em>
          </h2>
          <p>No son módulos aislados: la dispensa descuenta stock real, la caja liquida al profesional, el turno atendido abre la consulta.</p>
        </div>
        <div className="landing-features">
          <div className="landing-features-tabs">
            {FEATURES.map((f) => (
              <button
                key={f.id}
                className={`landing-features-tab${f.id === tab.id ? ' activo' : ''}`}
                onClick={() => setTabActiva(f.id)}
              >
                {f.icono} {f.label}
              </button>
            ))}
          </div>
          <div className="landing-features-panel">
            <h3 className="landing-serif">{tab.titulo}</h3>
            <p>{tab.descripcion}</p>
            <ul className="landing-features-lista">
              {tab.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Planes ───────────────────────────────────────────────────── */}
      <section className="landing-section" id="planes">
        <div className="landing-section-head">
          <h2 className="landing-serif">
            Elegí el plan <em>que se ajusta a tu equipo</em>
          </h2>
          <p>Sin licencias por puesto ni instalación — escalás con roles, no con módulos que comprar aparte.</p>
        </div>
        {planes === null && <p style={{ color: 'var(--muted)' }}>Cargando planes…</p>}
        {planes !== null && planes.length === 0 && (
          <p style={{ color: 'var(--muted)' }}>
            Los planes se están actualizando — escribinos para conocer las opciones disponibles.
          </p>
        )}
        {planes !== null && planes.length > 0 && (
          <div className="landing-planes">
            {planes.map((p, i) => {
              const destacado = planes.length >= 3 && i === Math.floor(planes.length / 2);
              const cupos = Object.entries(p.limitesRoles ?? {}).filter(([, cupo]) => cupo > 0);
              return (
                <div key={p.id} className={`landing-plan${destacado ? ' destacado' : ''}`}>
                  {destacado && <span className="landing-plan-badge">Recomendado</span>}
                  <h3>{p.nombre}</h3>
                  <p className="landing-plan-descripcion">{p.descripcion || ' '}</p>
                  <div className="landing-plan-precio">
                    {p.precioMensual != null ? (
                      <>
                        ${Number(p.precioMensual).toLocaleString('es-AR')}
                        <span> /mes</span>
                      </>
                    ) : (
                      'Consultar'
                    )}
                  </div>
                  {p.precioAnual != null && (
                    <div className="landing-plan-anual">
                      o ${Number(p.precioAnual).toLocaleString('es-AR')} /año
                    </div>
                  )}
                  <ul className="landing-plan-cupos">
                    {cupos.length === 0 ? (
                      <li>Miembros sin límite por rol</li>
                    ) : (
                      cupos.map(([rolId, cupo]) => (
                        <li key={rolId}>
                          Hasta {cupo} {etiquetaRol(rolId).toLowerCase()}
                        </li>
                      ))
                    )}
                  </ul>
                  <BotonInteres className="landing-btn">Estoy interesado</BotonInteres>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-logo landing-serif">🐾 Huella</div>
        <p>Ecosistema de Salud Animal — gestión clínica veterinaria en un solo lugar.</p>
        <div className="landing-footer-links">
          <a href="/login">Iniciar sesión</a>
          <a href="#planes">Planes</a>
        </div>
        <p style={{ marginTop: '1rem', fontSize: '0.78rem' }}>
          © {new Date().getFullYear()} Ecosistema de Salud Animal.
        </p>
      </footer>

      {modalAbierta && (
        <ModalInteres
          restantes={cupo?.restantes ?? 10}
          onCerrar={() => setModalAbierta(false)}
          onEnviado={() => setCupo((c) => (c ? { disponible: c.restantes > 1, restantes: c.restantes - 1 } : c))}
        />
      )}
    </div>
  );
}

function etiquetaRol(id: string): string {
  return ROLES_INFO.find((r) => r.id === id)?.label ?? id;
}

const FEATURES = [
  {
    id: 'hce',
    icono: '🩺',
    label: 'Historia clínica',
    titulo: 'Historia clínica electrónica',
    descripcion:
      'Ficha completa por paciente, con datos específicos por especie configurables — no atada a "perro/gato".',
    items: [
      'Código legible + microchip ISO, sin ambigüedad de "cuál Firulais es"',
      'Consultas completas: motivo, anamnesis, examen físico, diagnóstico y tratamiento',
      'Timeline médica con precarga automática del último peso/temperatura',
      'Macros de texto predefinidos por organización',
      'Carnet tipo DNI con QR + ficha completa en A4',
      'Catálogo de datos por especie configurable, no hardcodeado',
    ],
  },
  {
    id: 'turnero',
    icono: '📅',
    label: 'Turnero',
    titulo: 'Turnero de mostrador',
    descripcion: 'Agenda diaria + calendario mensual, pensada para cargarse desde el mostrador en el momento.',
    items: [
      'Alta de turno con paciente y dueño inline, sin salir del formulario',
      'Asignación de profesional y estados completos del turno',
      '"Atender" abre la ficha con la consulta lista para cargar',
      'Recordatorios de vacunas con contacto directo por WhatsApp',
    ],
  },
  {
    id: 'farmacia',
    icono: '💊',
    label: 'Farmacia y stock',
    titulo: 'Farmacia y stock',
    descripcion: 'Vademécum propio con movimientos auditables y descuento de stock real al atender.',
    items: [
      'Catálogo de productos con stock por producto',
      'Movimientos con historial: compra, uso, vencimiento, merma',
      'Dispensa ligada a la consulta: se descuenta stock real al atender',
      'Calculadora de dosis a partir del peso y la concentración',
      'Buscador contra el registro nacional de SENASA al cargar productos',
    ],
  },
  {
    id: 'caja',
    icono: '🧾',
    label: 'Caja',
    titulo: 'Caja de mostrador',
    descripcion: 'Apertura y cierre de caja diaria, con auditoría automática de diferencias.',
    items: [
      'Cálculo automático de lo esperado contra lo contado',
      'Auditoría de diferencias si la caja no cierra',
      'Liquidación de honorarios por profesional',
      'Venta de mostrador con descuento real de stock de farmacia',
    ],
  },
  {
    id: 'portal',
    icono: '📱',
    label: 'Portal del dueño',
    titulo: 'Portal del dueño',
    descripcion: 'El dueño de la mascota accede al resumen de su historia clínica sin instalar nada.',
    items: [
      'Acceso público por el QR del carnet, sin login',
      'Magic-link emitido por la veterinaria, sin crear cuenta',
      'El dueño ve el resumen de su mascota desde el celular',
      'Mejora la percepción de profesionalismo frente a la competencia en papel',
    ],
  },
];

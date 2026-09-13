import { useEffect, useState } from 'react';
import { api } from '../api/client';
import {
  crearSolicitud, listarPlanesPublicos, enviarCodigoVerificacion, confirmarCodigoVerificacion,
  type PlanPublico,
} from '../api/solicitudes';
import { consultarCupoInteresados, type CupoInteresados } from '../api/interesados';
import { TerminosModal } from '../components/TerminosModal';
import { ModalInteres } from '../components/ModalInteres';
import { InfoRoles } from '../components/InfoRoles';
import { SelectorBusqueda } from '../components/SelectorBusqueda';
import { rolInfoDe } from '../config/rolesInfo';
import { PROVINCIAS_ARGENTINA } from '../config/provinciasArgentina';
import type { Sesion } from '../api/types';

// El alta pública pide bastantes datos (persona + organización + plan +
// acceso) — mostrarlos todos juntos da la impresión de un formulario
// interminable. Paginado en pasos temáticos, cada uno se siente chico;
// avanzar de paso reusa la validación nativa del <form> (los campos del
// paso siguen siendo `required` y sólo el paso visible está en el DOM, así
// que el botón "Siguiente", al ser type="submit", dispara la validación del
// browser antes de que el handler decida no enviar todavía).
const PASOS_REGISTRO = ['Tus datos', 'Tu organización', 'Tu plan', 'Tu acceso'] as const;

export function LoginPage({ onSesion }: { onSesion: (s: Sesion) => void }) {
  // Estrategia de lanzamiento (temporal, ver LandingPage.tsx): el alta
  // self-service directa ("modo registro" acá abajo) queda pausada, sin
  // reemplazar el código — sólo sin ningún botón que la dispare, para poder
  // restaurarla fácil cuando se levante el cupo de 10. "Solicitar acceso"
  // abre el mismo ModalInteres que la landing en vez de pasar a modo
  // registro; si no, este link quedaba como una vía paralela para saltearse
  // el cupo sin pasar por la landing.
  const [planIdInicial] = useState(() => new URLSearchParams(window.location.search).get('plan'));
  const [modo, setModo] = useState<'login' | 'registro' | 'olvide'>('login');
  const [paso, setPaso] = useState(0);
  const [enviada, setEnviada] = useState(false);
  const [olvideEnviado, setOlvideEnviado] = useState(false);
  const [cupo, setCupo] = useState<CupoInteresados | null>(null);
  const [modalInteresAbierta, setModalInteresAbierta] = useState(!!planIdInicial);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [telefono, setTelefono] = useState('');
  const [dni, setDni] = useState('');

  const [planes, setPlanes] = useState<PlanPublico[]>([]);
  const [planId, setPlanId] = useState('');
  const [nombreOrganizacion, setNombreOrganizacion] = useState('');
  const [tipoOrganizacion, setTipoOrganizacion] = useState('clinica');
  const [direccionOrganizacion, setDireccionOrganizacion] = useState('');
  const [localidadOrganizacion, setLocalidadOrganizacion] = useState('');
  const [provinciaOrganizacion, setProvinciaOrganizacion] = useState('');
  const [telefonoOrganizacion, setTelefonoOrganizacion] = useState('');
  const [emailOrganizacion, setEmailOrganizacion] = useState('');
  const [terminosAceptados, setTerminosAceptados] = useState(false);
  const [mostrarTerminos, setMostrarTerminos] = useState(false);

  // Verificación de email por código, previa a poder mandar la solicitud
  // (paso "Tu acceso"). `codigoToken` es el token opaco que devuelve
  // enviarCodigoVerificacion() — hay que retenerlo para poder confirmar el
  // código contra él. `emailVerificadoToken` es la prueba final que viaja
  // en crearSolicitud(); mientras no exista, no se puede enviar la solicitud.
  const [codigoToken, setCodigoToken] = useState<string | null>(null);
  const [codigoInput, setCodigoInput] = useState('');
  const [emailVerificadoToken, setEmailVerificadoToken] = useState<string | null>(null);
  const [enviandoCodigo, setEnviandoCodigo] = useState(false);
  const [verificandoCodigo, setVerificandoCodigo] = useState(false);
  const [errorCodigo, setErrorCodigo] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  // Cambiar el email después de haber mandado/confirmado un código invalida
  // esa verificación — no tiene sentido validar un código contra otro email.
  function cambiarEmail(v: string) {
    setEmail(v);
    setCodigoToken(null);
    setEmailVerificadoToken(null);
    setCodigoInput('');
    setErrorCodigo(null);
  }

  async function enviarCodigo() {
    setErrorCodigo(null);
    setEnviandoCodigo(true);
    try {
      const { token } = await enviarCodigoVerificacion(email);
      setCodigoToken(token);
      setCodigoInput('');
    } catch (err) {
      setErrorCodigo(err instanceof Error ? err.message : 'No se pudo enviar el código');
    } finally {
      setEnviandoCodigo(false);
    }
  }

  async function confirmarCodigo() {
    if (!codigoToken) return;
    setErrorCodigo(null);
    setVerificandoCodigo(true);
    try {
      const { emailVerificadoToken: tok } = await confirmarCodigoVerificacion(codigoToken, codigoInput.trim());
      setEmailVerificadoToken(tok);
    } catch (err) {
      setErrorCodigo(err instanceof Error ? err.message : 'El código no es correcto');
    } finally {
      setVerificandoCodigo(false);
    }
  }

  useEffect(() => {
    if (modo === 'registro' && planes.length === 0) {
      listarPlanesPublicos().then((ps) => {
        setPlanes(ps);
        if (planIdInicial && ps.some((p) => p.id === planIdInicial)) setPlanId(planIdInicial);
      }).catch(() => {});
    }
  }, [modo]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    consultarCupoInteresados()
      .then(setCupo)
      .catch(() => setCupo({ disponible: true, restantes: 10 })); // si falla la consulta, no bloquear el link
  }, []);

  const planElegido = planes.find((p) => p.id === planId);

  async function entrar() {
    const login = await api.login(email, password);
    const org = login.organizaciones[0];
    if (!org) throw new Error('El usuario no tiene ninguna organización asociada');
    onSesion({
      token: login.accessToken,
      refreshToken: login.refreshToken,
      organizacionId: org.organizacionId,
      roles: org.roles,
      huellaActiva: org.huellaActiva,
      troperaActiva: org.troperaActiva,
    });
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (modo === 'registro' && paso < PASOS_REGISTRO.length - 1) {
      setPaso((p) => p + 1);
      return;
    }
    setError(null);
    setCargando(true);
    try {
      if (modo === 'olvide') {
        await api.olvidePassword(email);
        setOlvideEnviado(true);
      } else if (modo === 'login') {
        await entrar();
      } else {
        if (!planId) throw new Error('Elegí un plan');
        if (!emailVerificadoToken) throw new Error('Verificá tu email antes de enviar la solicitud');
        await crearSolicitud({
          nombre, apellido, email, password,
          terminosAceptados,
          telefono, dni,
          planId,
          nombreOrganizacion, tipoOrganizacion,
          direccionOrganizacion: direccionOrganizacion || undefined,
          localidadOrganizacion,
          provinciaOrganizacion,
          telefonoOrganizacion: telefonoOrganizacion || undefined,
          emailOrganizacion: emailOrganizacion || undefined,
          emailVerificadoToken,
        });
        setEnviada(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setCargando(false);
    }
  }

  if (enviada) {
    return (
      <div className="login-wrap">
        <div className="card login-card">
          <div className="brand brand-lg">
            <span className="brand-dot" />
            Ecosistema · Salud Animal
          </div>
          <h1>Solicitud enviada</h1>
          <p>
            Recibimos tu solicitud. Vas a poder ingresar cuando la aprobemos. Te avisaremos
            al email que cargaste.
          </p>
          <button className="btn" onClick={() => { setEnviada(false); setModo('login'); setPaso(0); }}>
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  if (olvideEnviado) {
    return (
      <div className="login-wrap">
        <div className="card login-card">
          <div className="brand brand-lg">
            <span className="brand-dot" />
            Ecosistema · Salud Animal
          </div>
          <h1>Revisá tu email</h1>
          <p>
            Si <b>{email}</b> tiene una cuenta, te enviamos un link para elegir una contraseña
            nueva. Válido por 30 minutos.
          </p>
          <button
            className="btn"
            onClick={() => { setOlvideEnviado(false); setModo('login'); }}
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-wrap">
      <form
        className={`card login-card${modo === 'registro' ? ' login-card-ancho' : ''}`}
        onSubmit={enviar}
      >
        <div className="brand brand-lg">
          <span className="brand-dot" />
          Ecosistema · Salud Animal
        </div>
        <h1 className={modo === 'registro' ? 'landing-serif' : undefined}>
          {modo === 'login' ? 'Ingresar' : modo === 'olvide' ? 'Recuperar contraseña' : 'Solicitar acceso'}
        </h1>

        {modo === 'registro' ? (
          <>
            <div className="form-pasos">
              {PASOS_REGISTRO.map((titulo, i) => (
                <span key={titulo} className={`form-paso-punto${i <= paso ? ' activo' : ''}`} />
              ))}
            </div>
            <p className="form-paso-label">
              Paso {paso + 1} de {PASOS_REGISTRO.length} · <b>{PASOS_REGISTRO[paso]}</b>
            </p>

            <div className="form-grid">
              {paso === 0 && (
                <>
                  <label>
                    Nombre
                    <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
                  </label>
                  <label>
                    Apellido
                    <input value={apellido} onChange={(e) => setApellido(e.target.value)} required />
                  </label>
                  <label>
                    Teléfono
                    <input value={telefono} onChange={(e) => setTelefono(e.target.value)} required minLength={6} />
                  </label>
                  <label>
                    DNI
                    <input value={dni} onChange={(e) => setDni(e.target.value)} required minLength={6} />
                  </label>
                </>
              )}

              {paso === 1 && (
                <>
                  <label className="span-2">
                    Nombre de la institución / campo
                    <input
                      value={nombreOrganizacion}
                      onChange={(e) => setNombreOrganizacion(e.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Tipo
                    <select value={tipoOrganizacion} onChange={(e) => setTipoOrganizacion(e.target.value)} disabled>
                      <option value="clinica">Clínica veterinaria o similares</option>
                    </select>
                  </label>
                  <label>
                    Dirección (opcional)
                    <input value={direccionOrganizacion} onChange={(e) => setDireccionOrganizacion(e.target.value)} placeholder="Calle, número..." />
                  </label>
                  <label>
                    Localidad
                    <input value={localidadOrganizacion} onChange={(e) => setLocalidadOrganizacion(e.target.value)} required />
                  </label>
                  <label>
                    Provincia
                    <SelectorBusqueda
                      opciones={PROVINCIAS_ARGENTINA}
                      valor={provinciaOrganizacion}
                      onCambiar={setProvinciaOrganizacion}
                      placeholder="Buscar provincia…"
                      required
                    />
                  </label>
                  <label>
                    Teléfono de la institución (opcional)
                    <input value={telefonoOrganizacion} onChange={(e) => setTelefonoOrganizacion(e.target.value)} />
                  </label>
                  <label className="span-2">
                    Email de contacto de la institución (opcional)
                    <input type="email" value={emailOrganizacion} onChange={(e) => setEmailOrganizacion(e.target.value)} />
                  </label>
                </>
              )}

              {paso === 2 && (
                <>
                  <label className="span-2">
                    Plan
                    <select value={planId} onChange={(e) => setPlanId(e.target.value)} required>
                      <option value="">Elegí un plan…</option>
                      {planes.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre}{p.precioMensual ? ` — $${p.precioMensual}/mes` : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                  {planElegido && (
                    <div className="card login-card-plan span-2">
                      {planElegido.descripcion && (
                        <p className="muted" style={{ fontSize: '0.85rem', margin: '0 0 0.4rem' }}>{planElegido.descripcion}</p>
                      )}
                      <p style={{ fontSize: '0.85rem', fontWeight: 600, margin: '0 0 0.3rem' }}>Este plan incluye:</p>
                      <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.85rem' }}>
                        {Object.entries(planElegido.limitesRoles ?? {})
                          .filter(([, n]) => n > 0)
                          .map(([rol, n]) => (
                            <li key={rol}>{n} × {rolInfoDe(rol)?.label ?? rol}</li>
                          ))}
                      </ul>
                    </div>
                  )}
                  <div className="span-2">
                    <InfoRoles
                      soloRoles={
                        planElegido
                          ? Object.entries(planElegido.limitesRoles ?? {})
                              .filter(([, n]) => n > 0)
                              .map(([rol]) => rol)
                          : undefined
                      }
                    />
                  </div>
                </>
              )}

              {paso === 3 && (
                <>
                  <label>
                    Email
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => cambiarEmail(e.target.value)}
                      required
                      readOnly={!!emailVerificadoToken}
                    />
                  </label>
                  <label>
                    Contraseña
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                  </label>

                  <div className="span-2 login-card-verif-email">
                    {emailVerificadoToken ? (
                      <p className="muted" style={{ margin: 0 }}>
                        <span className="chip" style={{ background: 'rgba(92, 138, 78, 0.14)', color: 'var(--verde-dark)' }}>
                          ✓ Email verificado
                        </span>{' '}
                        <button type="button" className="link" onClick={() => cambiarEmail(email)}>
                          Cambiar email
                        </button>
                      </p>
                    ) : codigoToken ? (
                      <>
                        <p className="muted" style={{ margin: '0 0 0.4rem', fontSize: '0.85rem' }}>
                          Te mandamos un código a <b>{email}</b>. Ingresalo acá abajo (vale por 10 minutos).
                        </p>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                          <label style={{ margin: 0, flex: '0 0 140px' }}>
                            Código
                            <input
                              value={codigoInput}
                              onChange={(e) => setCodigoInput(e.target.value)}
                              maxLength={6}
                              placeholder="000000"
                              className="mono"
                            />
                          </label>
                          <button
                            type="button"
                            className="btn-ghost"
                            disabled={verificandoCodigo || codigoInput.trim().length !== 6}
                            onClick={confirmarCodigo}
                          >
                            {verificandoCodigo ? 'Verificando…' : 'Confirmar código'}
                          </button>
                          <button type="button" className="link" disabled={enviandoCodigo} onClick={enviarCodigo}>
                            Reenviar código
                          </button>
                        </div>
                      </>
                    ) : (
                      <button type="button" className="btn-ghost" disabled={!email || enviandoCodigo} onClick={enviarCodigo}>
                        {enviandoCodigo ? 'Enviando…' : 'Enviar código de verificación'}
                      </button>
                    )}
                    {errorCodigo && <div className="alerta" style={{ marginTop: '0.5rem' }}>{errorCodigo}</div>}
                  </div>

                  <label className="span-2" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'none' }}>
                    <input
                      type="checkbox"
                      style={{ width: 'auto', margin: 0 }}
                      checked={terminosAceptados}
                      onChange={(e) => setTerminosAceptados(e.target.checked)}
                      required
                    />
                    Acepto los{' '}
                    <button type="button" className="link" onClick={() => setMostrarTerminos(true)}>
                      términos y condiciones
                    </button>
                  </label>
                </>
              )}

              {error && <div className="alerta span-2">{error}</div>}

              <div className="span-2 login-card-nav">
                {paso > 0 && (
                  <button type="button" className="btn-ghost" onClick={() => setPaso((p) => p - 1)}>
                    ‹ Atrás
                  </button>
                )}
                <button
                  className="landing-btn"
                  type="submit"
                  disabled={cargando}
                >
                  {cargando
                    ? 'Procesando…'
                    : paso < PASOS_REGISTRO.length - 1
                      ? 'Siguiente ›'
                      : 'Enviar solicitud'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <label>
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            {modo !== 'olvide' && (
              <label>
                Contraseña
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </label>
            )}
            {modo === 'login' && (
              <p className="switch" style={{ marginTop: '-0.5rem' }}>
                <button
                  type="button"
                  className="link"
                  onClick={() => { setError(null); setModo('olvide'); }}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </p>
            )}

            {error && <div className="alerta">{error}</div>}

            <button className="btn" type="submit" disabled={cargando}>
              {cargando
                ? 'Procesando…'
                : modo === 'login'
                  ? 'Ingresar'
                  : 'Enviar link de recuperación'}
            </button>
          </>
        )}

        {mostrarTerminos && <TerminosModal onCerrar={() => setMostrarTerminos(false)} />}

        {modo === 'olvide' ? (
          <p className="switch">
            <button type="button" className="link" onClick={() => { setError(null); setModo('login'); }}>
              ‹ Volver a ingresar
            </button>
          </p>
        ) : modo === 'registro' ? (
          <p className="switch">
            ¿Ya tenés cuenta?{' '}
            <button type="button" className="link" onClick={() => { setError(null); setModo('login'); setPaso(0); }}>
              Ingresar
            </button>
          </p>
        ) : (
          <p className="switch">
            {cupo && !cupo.disponible ? (
              'Ya completamos las primeras 10 solicitudes de esta etapa.'
            ) : (
              <>
                ¿No tenés cuenta?{' '}
                <button type="button" className="link" onClick={() => setModalInteresAbierta(true)}>
                  Solicitar acceso
                </button>
              </>
            )}
          </p>
        )}
      </form>

      {modalInteresAbierta && (
        <ModalInteres
          restantes={cupo?.restantes ?? 10}
          onCerrar={() => setModalInteresAbierta(false)}
          onEnviado={() => setCupo((c) => (c ? { disponible: c.restantes > 1, restantes: c.restantes - 1 } : c))}
        />
      )}
    </div>
  );
}

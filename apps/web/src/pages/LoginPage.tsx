import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { crearSolicitud, listarPlanesPublicos, type PlanPublico } from '../api/solicitudes';
import { TerminosModal } from '../components/TerminosModal';
import { InfoRoles } from '../components/InfoRoles';
import { rolInfoDe } from '../config/rolesInfo';
import type { Sesion } from '../api/types';

export function LoginPage({ onSesion }: { onSesion: (s: Sesion) => void }) {
  // La landing pública pasa el plan elegido como ?plan=<id> al mandar acá
  // (ver LandingPage.tsx) — si viene, arranca directo en modo registro con
  // ese plan preseleccionado en cuanto la lista de planes carga.
  const [planIdInicial] = useState(() => new URLSearchParams(window.location.search).get('plan'));
  const [modo, setModo] = useState<'login' | 'registro' | 'olvide'>(planIdInicial ? 'registro' : 'login');
  const [enviada, setEnviada] = useState(false);
  const [olvideEnviado, setOlvideEnviado] = useState(false);

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

  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (modo === 'registro' && planes.length === 0) {
      listarPlanesPublicos().then((ps) => {
        setPlanes(ps);
        if (planIdInicial && ps.some((p) => p.id === planIdInicial)) setPlanId(planIdInicial);
      }).catch(() => {});
    }
  }, [modo]); // eslint-disable-line react-hooks/exhaustive-deps

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
        await crearSolicitud({
          nombre, apellido, email, password,
          terminosAceptados,
          telefono, dni,
          planId,
          nombreOrganizacion, tipoOrganizacion,
          direccionOrganizacion: direccionOrganizacion || undefined,
          localidadOrganizacion: localidadOrganizacion || undefined,
          provinciaOrganizacion: provinciaOrganizacion || undefined,
          telefonoOrganizacion: telefonoOrganizacion || undefined,
          emailOrganizacion: emailOrganizacion || undefined,
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
          <button className="btn" onClick={() => { setEnviada(false); setModo('login'); }}>
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
      <form className="card login-card" onSubmit={enviar}>
        <div className="brand brand-lg">
          <span className="brand-dot" />
          Ecosistema · Salud Animal
        </div>
        <h1>{modo === 'login' ? 'Ingresar' : modo === 'olvide' ? 'Recuperar contraseña' : 'Solicitar acceso'}</h1>

        {modo === 'registro' && (
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

            <label>
              Nombre de la institución / campo
              <input
                value={nombreOrganizacion}
                onChange={(e) => setNombreOrganizacion(e.target.value)}
                required
              />
            </label>
            <label>
              Tipo
              <select value={tipoOrganizacion} onChange={(e) => setTipoOrganizacion(e.target.value)}>
                <option value="clinica">Clínica</option>
                <option value="establecimiento">Establecimiento</option>
                <option value="mixta">Mixta</option>
              </select>
            </label>
            <label>
              Dirección (opcional)
              <input value={direccionOrganizacion} onChange={(e) => setDireccionOrganizacion(e.target.value)} placeholder="Calle, número..." />
            </label>
            <label>
              Localidad (opcional)
              <input value={localidadOrganizacion} onChange={(e) => setLocalidadOrganizacion(e.target.value)} />
            </label>
            <label>
              Provincia (opcional)
              <input value={provinciaOrganizacion} onChange={(e) => setProvinciaOrganizacion(e.target.value)} />
            </label>
            <label>
              Teléfono de la institución (opcional)
              <input value={telefonoOrganizacion} onChange={(e) => setTelefonoOrganizacion(e.target.value)} />
            </label>
            <label>
              Email de contacto de la institución (opcional)
              <input type="email" value={emailOrganizacion} onChange={(e) => setEmailOrganizacion(e.target.value)} />
            </label>

            <label>
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
              <div className="card" style={{ padding: '0.6rem 0.75rem', marginBottom: '0.75rem' }}>
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
            <InfoRoles />
          </>
        )}

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

        {modo === 'registro' && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'none' }}>
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
        )}

        {error && <div className="alerta">{error}</div>}

        <button className="btn" type="submit" disabled={cargando || (modo === 'registro' && !terminosAceptados)}>
          {cargando
            ? 'Procesando…'
            : modo === 'login'
              ? 'Ingresar'
              : modo === 'olvide'
                ? 'Enviar link de recuperación'
                : 'Enviar solicitud'}
        </button>

        {mostrarTerminos && <TerminosModal onCerrar={() => setMostrarTerminos(false)} />}

        {modo === 'olvide' ? (
          <p className="switch">
            <button type="button" className="link" onClick={() => { setError(null); setModo('login'); }}>
              ‹ Volver a ingresar
            </button>
          </p>
        ) : (
          <p className="switch">
            {modo === 'login' ? '¿No tenés cuenta?' : '¿Ya tenés cuenta?'}{' '}
            <button
              type="button"
              className="link"
              onClick={() => {
                setError(null);
                setModo(modo === 'login' ? 'registro' : 'login');
              }}
            >
              {modo === 'login' ? 'Solicitar acceso' : 'Ingresar'}
            </button>
          </p>
        )}
      </form>
    </div>
  );
}

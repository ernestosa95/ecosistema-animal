import { useState } from 'react';
import { api } from '../api/client';
import { crearSolicitud } from '../api/solicitudes';
import type { Sesion } from '../api/types';

export function LoginPage({ onSesion }: { onSesion: (s: Sesion) => void }) {
  const [modo, setModo] = useState<'login' | 'registro'>('login');
  const [enviada, setEnviada] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [telefono, setTelefono] = useState('');

  const [tipo, setTipo] = useState<'crear' | 'unirse'>('crear');
  const [nombreOrganizacion, setNombreOrganizacion] = useState('');
  const [tipoOrganizacion, setTipoOrganizacion] = useState('clinica');
  const [organizacionSolicitada, setOrganizacionSolicitada] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function entrar() {
    const login = await api.login(email, password);
    const org = login.organizaciones[0];
    if (!org) throw new Error('El usuario no tiene ninguna organización asociada');
    onSesion({ token: login.accessToken, organizacionId: org.organizacionId, rol: org.rol });
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      if (modo === 'login') {
        await entrar();
      } else {
        await crearSolicitud({
          tipo, nombre, apellido, email, password,
          telefono: telefono || undefined,
          ...(tipo === 'crear'
            ? { nombreOrganizacion, tipoOrganizacion }
            : { organizacionSolicitada }),
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

  return (
    <div className="login-wrap">
      <form className="card login-card" onSubmit={enviar}>
        <div className="brand brand-lg">
          <span className="brand-dot" />
          Ecosistema · Salud Animal
        </div>
        <h1>{modo === 'login' ? 'Ingresar' : 'Solicitar acceso'}</h1>

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
              Teléfono (opcional)
              <input value={telefono} onChange={(e) => setTelefono(e.target.value)} />
            </label>

            <label>
              ¿Qué querés hacer?
              <select value={tipo} onChange={(e) => setTipo(e.target.value as 'crear' | 'unirse')}>
                <option value="crear">Crear una veterinaria nueva</option>
                <option value="unirse">Unirme a una veterinaria existente</option>
              </select>
            </label>

            {tipo === 'crear' ? (
              <>
                <label>
                  Nombre de la veterinaria
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
              </>
            ) : (
              <label>
                Veterinaria a la que querés unirte
                <input
                  value={organizacionSolicitada}
                  onChange={(e) => setOrganizacionSolicitada(e.target.value)}
                  placeholder="Nombre de la veterinaria"
                  required
                />
              </label>
            )}
          </>
        )}

        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
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

        {error && <div className="alerta">{error}</div>}

        <button className="btn" type="submit" disabled={cargando}>
          {cargando ? 'Procesando…' : modo === 'login' ? 'Ingresar' : 'Enviar solicitud'}
        </button>

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
      </form>
    </div>
  );
}

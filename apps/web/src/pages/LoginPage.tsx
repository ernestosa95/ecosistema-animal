import { useState } from 'react';
import { api } from '../api/client';
import type { Sesion } from '../api/types';

export function LoginPage({ onSesion }: { onSesion: (s: Sesion) => void }) {
  const [modo, setModo] = useState<'login' | 'registro'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [nombreOrganizacion, setNombreOrganizacion] = useState('');
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
      if (modo === 'registro') {
        await api.register({ email, password, nombre, apellido, nombreOrganizacion });
      }
      await entrar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="card login-card" onSubmit={enviar}>
        <div className="brand brand-lg">
          <span className="brand-dot" />
          Ecosistema · Salud Animal
        </div>
        <h1>{modo === 'login' ? 'Ingresar' : 'Crear cuenta'}</h1>

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
              Nombre de la clínica / organización
              <input
                value={nombreOrganizacion}
                onChange={(e) => setNombreOrganizacion(e.target.value)}
                required
              />
            </label>
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
          {cargando ? 'Procesando…' : modo === 'login' ? 'Ingresar' : 'Registrarme'}
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
            {modo === 'login' ? 'Crear una' : 'Ingresar'}
          </button>
        </p>
      </form>
    </div>
  );
}

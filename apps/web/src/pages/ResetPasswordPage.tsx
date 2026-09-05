// apps/web/src/pages/ResetPasswordPage.tsx
// Pantalla que abre el link de "olvidé mi contraseña" (?resetToken=...,
// ver main.tsx). Mismo look que LoginPage (.login-wrap/.login-card) porque
// es parte del mismo flujo de acceso, no del portal del dueño.
import { useState } from 'react';
import { api } from '../api/client';

export default function ResetPasswordPage() {
  const [token] = useState(() => new URLSearchParams(window.location.search).get('resetToken') ?? '');
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [listo, setListo] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmar) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setCargando(true);
    try {
      await api.resetearPasswordConToken(token, password);
      setListo(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setCargando(false);
    }
  }

  if (!token) {
    return (
      <div className="login-wrap">
        <div className="card login-card">
          <div className="brand brand-lg">
            <span className="brand-dot" />
            Ecosistema · Salud Animal
          </div>
          <h1>Enlace inválido</h1>
          <p>Este link no es válido. Pedí uno nuevo desde la pantalla de ingreso.</p>
          <button className="btn" onClick={() => { window.location.href = '/login'; }}>
            Ir a ingresar
          </button>
        </div>
      </div>
    );
  }

  if (listo) {
    return (
      <div className="login-wrap">
        <div className="card login-card">
          <div className="brand brand-lg">
            <span className="brand-dot" />
            Ecosistema · Salud Animal
          </div>
          <h1>Contraseña actualizada</h1>
          <p>Ya podés ingresar con tu contraseña nueva.</p>
          <button className="btn" onClick={() => { window.location.href = '/login'; }}>
            Ir a ingresar
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
        <h1>Elegí una contraseña nueva</h1>

        <label>
          Contraseña nueva
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoFocus
          />
        </label>
        <label>
          Repetir contraseña
          <input
            type="password"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            required
            minLength={8}
          />
        </label>

        {error && <div className="alerta">{error}</div>}

        <button className="btn" type="submit" disabled={cargando}>
          {cargando ? 'Guardando…' : 'Guardar contraseña'}
        </button>
      </form>
    </div>
  );
}

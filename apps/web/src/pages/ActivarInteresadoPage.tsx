// apps/web/src/pages/ActivarInteresadoPage.tsx
// Pantalla que abre el link de "terminá tu alta" (?activarToken=..., ver
// main.tsx e InteresadosService.invitarTodos() en el backend). Mismo look
// que LoginPage/ResetPasswordPage (.login-wrap/.login-card) porque es parte
// del mismo flujo de acceso. A diferencia de ResetPasswordPage, acá sí
// termina logueado: activarInteresado() devuelve una Sesion lista, que se
// guarda con la misma clave que useSesion.ts usa (CLAVE = 'ecosistema.sesion')
// — esta página vive fuera de App.tsx, así que no tiene acceso al hook, y un
// reload a '/' hace que App.tsx la recargue sola desde localStorage.
import { useEffect, useState } from 'react';
import { obtenerDatosActivacion, activarInteresado, type DatosActivacion } from '../api/interesados';

const CLAVE_SESION = 'ecosistema.sesion';

export default function ActivarInteresadoPage() {
  const [token] = useState(() => new URLSearchParams(window.location.search).get('activarToken') ?? '');
  const [datos, setDatos] = useState<DatosActivacion | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [cargandoDatos, setCargandoDatos] = useState(true);

  const [apellido, setApellido] = useState('');
  const [nombreOrganizacion, setNombreOrganizacion] = useState('');
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!token) { setCargandoDatos(false); return; }
    obtenerDatosActivacion(token)
      .then((d) => { setDatos(d); setNombreOrganizacion(d.nombreVeterinaria); })
      .catch((e) => setErrorCarga(e instanceof Error ? e.message : 'Este link no es válido o venció.'))
      .finally(() => setCargandoDatos(false));
  }, [token]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmar) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setEnviando(true);
    try {
      const sesion = await activarInteresado({
        token,
        apellido,
        password,
        nombreOrganizacion: nombreOrganizacion.trim() || undefined,
      });
      localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
      window.location.href = '/';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
      setEnviando(false);
    }
  }

  if (!token || errorCarga) {
    return (
      <div className="login-wrap">
        <div className="card login-card">
          <div className="brand brand-lg">
            <span className="brand-dot" />
            Huella
          </div>
          <h1>Enlace inválido</h1>
          <p>{errorCarga || 'Este link no es válido.'} Si vencido, pedile al staff que te reenvíe la invitación.</p>
          <button className="btn" onClick={() => { window.location.href = '/login'; }}>
            Ir a ingresar
          </button>
        </div>
      </div>
    );
  }

  if (cargandoDatos) return null;

  return (
    <div className="login-wrap">
      <form className="card login-card" onSubmit={enviar}>
        <div className="brand brand-lg">
          <span className="brand-dot" />
          Huella
        </div>
        <h1>¡Ya casi! Completá tu cuenta</h1>
        <p className="muted" style={{ marginTop: '-0.5rem' }}>
          {datos?.nombre}, terminá de configurar tu cuenta para empezar a usar Huella.
        </p>

        <label>
          Apellido
          <input value={apellido} onChange={(e) => setApellido(e.target.value)} required autoFocus />
        </label>
        <label>
          Nombre de tu veterinaria
          <input value={nombreOrganizacion} onChange={(e) => setNombreOrganizacion(e.target.value)} required />
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

        <button className="btn" type="submit" disabled={enviando}>
          {enviando ? 'Creando tu cuenta…' : 'Empezar a usar Huella'}
        </button>
      </form>
    </div>
  );
}

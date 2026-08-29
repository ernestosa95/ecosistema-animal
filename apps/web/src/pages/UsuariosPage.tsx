import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Miembro, ResetPasswordResultado } from '../api/client';
import type { Sesion } from '../api/types';

const ETIQUETAS_ROL: Record<string, string> = {
  propietario: 'Propietario',
  admin: 'Administrador',
  capataz: 'Capataz',
  veterinario: 'Veterinario',
  recepcion: 'Recepción',
};

export function UsuariosPage({ sesion }: { sesion: Sesion }) {
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [abiertoId, setAbiertoId] = useState<string | null>(null);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      setMiembros(await api.miembros(sesion));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="page-head">
        <h1>Usuarios</h1>
      </div>
      <p className="muted">Personal de tu organización. Sólo propietario/admin pueden resetear contraseñas.</p>

      {error && <div className="alerta">{error}</div>}

      {cargando ? (
        <p className="muted">Cargando…</p>
      ) : miembros.length === 0 ? (
        <p className="muted">No hay miembros para mostrar.</p>
      ) : (
        <div className="card">
          <table className="tabla">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Rol</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {miembros.map((m) => (
                <FilaMiembro
                  key={m.usuarioId}
                  sesion={sesion}
                  miembro={m}
                  abierto={abiertoId === m.usuarioId}
                  onToggle={() => setAbiertoId((actual) => (actual === m.usuarioId ? null : m.usuarioId))}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FilaMiembro({
  sesion,
  miembro,
  abierto,
  onToggle,
}: {
  sesion: Sesion;
  miembro: Miembro;
  abierto: boolean;
  onToggle: () => void;
}) {
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [resultado, setResultado] = useState<ResetPasswordResultado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  function abrirCerrar() {
    setResultado(null);
    setError(null);
    setNuevaPassword('');
    onToggle();
  }

  async function resetear() {
    setError(null);
    setGuardando(true);
    try {
      const r = await api.resetearPassword(sesion, miembro.usuarioId, nuevaPassword.trim() || undefined);
      setResultado(r);
      setNuevaPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al resetear');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <tr>
        <td>{miembro.nombre} {miembro.apellido}</td>
        <td>{miembro.roles.map((r) => ETIQUETAS_ROL[r] ?? r).join(' + ')}</td>
        <td>
          <button className="link" onClick={abrirCerrar}>
            {abierto ? 'Cerrar' : 'Resetear contraseña'}
          </button>
        </td>
      </tr>
      {abierto && (
        <tr>
          <td colSpan={3}>
            <div className="card" style={{ margin: '0.5rem 0' }}>
              {resultado ? (
                <div>
                  <p>Contraseña actualizada para <b>{resultado.email}</b>.</p>
                  {resultado.temporal && resultado.password && (
                    <div
                      className="alerta"
                      style={{ background: '#eef7f4', borderColor: '#0E7C6B', color: '#0E7C6B' }}
                    >
                      Contraseña temporal — copiala ahora y pasásela al usuario, <b>no se vuelve a mostrar</b>:{' '}
                      <span className="mono" style={{ fontWeight: 700 }}>{resultado.password}</span>
                    </div>
                  )}
                  <button className="btn-ghost" onClick={abrirCerrar} style={{ marginTop: '0.5rem' }}>
                    Cerrar
                  </button>
                </div>
              ) : (
                <>
                  <p className="muted">
                    Dejá la contraseña vacía para generar una temporal automáticamente, o escribí una específica.
                  </p>
                  <label>
                    Nueva contraseña (opcional)
                    <input
                      type="text"
                      value={nuevaPassword}
                      onChange={(e) => setNuevaPassword(e.target.value)}
                      placeholder="mínimo 6 caracteres"
                    />
                  </label>
                  {error && <div className="alerta">{error}</div>}
                  <div className="acciones" style={{ marginTop: '0.5rem' }}>
                    <button className="btn" disabled={guardando} onClick={resetear}>
                      {guardando
                        ? 'Guardando…'
                        : nuevaPassword.trim()
                        ? 'Guardar contraseña'
                        : 'Generar contraseña temporal'}
                    </button>
                    <button className="btn-ghost" onClick={abrirCerrar}>
                      Cancelar
                    </button>
                  </div>
                </>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// apps/web/src/components/FormAltaMiembro.tsx
import { useState } from 'react';
import { api } from '../api/client';
import type { Sesion } from '../api/types';
import { ROLES_INFO } from '../config/rolesInfo';

export interface LimitesPlan {
  [rol: string]: { limite: number | null; usados: number };
}

/**
 * Alta de un miembro de la propia organización — reutilizado en `UsuariosPage.tsx`
 * (alta libre, en cualquier momento) y en el primer paso del wizard de
 * configuración rápida (`WizardConfiguracionRapida.tsx`). Si se pasan
 * `limites` (de `api.limitesPlan`), deshabilita los roles que ya agotaron el
 * cupo del plan en vez de dejar que el submit falle con un 400.
 */
export function FormAltaMiembro({ sesion, limites, onCreado }: {
  sesion: Sesion;
  limites?: LimitesPlan | null;
  onCreado: (usuario: { id: string; email: string; nombre: string | null; apellido: string | null }, roles: string[]) => void;
}) {
  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [password, setPassword] = useState('');
  const [roles, setRoles] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  function toggleRol(id: string) {
    setRoles((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));
  }

  async function crear() {
    setError(null);
    if (!email.trim()) { setError('Ingresá un email'); return; }
    if (roles.length === 0) { setError('Elegí al menos un rol'); return; }
    setGuardando(true);
    try {
      const r = await api.agregarMiembro(sesion, {
        email: email.trim(), roles,
        nombre: nombre.trim() || undefined, apellido: apellido.trim() || undefined,
        password: password.trim() || undefined,
      });
      api.registrarEvento(sesion, 'accion', 'usuario-crear');
      onCreado(r.usuario, roles);
      setEmail(''); setNombre(''); setApellido(''); setPassword(''); setRoles([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo agregar el usuario');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div>
      <div className="form-grid">
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@email.com" />
        </label>
        <label>
          Contraseña (opcional si el email ya tiene cuenta)
          <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="mínimo 6 caracteres" />
        </label>
        <label>
          Nombre (opcional)
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </label>
        <label>
          Apellido (opcional)
          <input value={apellido} onChange={(e) => setApellido(e.target.value)} />
        </label>
      </div>
      <label>Rol (podés elegir más de uno)</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
        {ROLES_INFO.map((r) => {
          const lim = limites?.[r.id];
          const sinCupo = !!lim && lim.limite != null && lim.usados >= lim.limite && !roles.includes(r.id);
          return (
            <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: sinCupo ? 0.5 : 1 }}>
              <input
                type="checkbox"
                style={{ width: 'auto', margin: 0 }}
                checked={roles.includes(r.id)}
                disabled={sinCupo}
                onChange={() => toggleRol(r.id)}
              />
              {r.label}
              {lim && lim.limite != null && (
                <span className="muted" style={{ fontSize: '0.78rem' }}>({lim.usados}/{lim.limite})</span>
              )}
            </label>
          );
        })}
      </div>
      {error && <div className="alerta">{error}</div>}
      <button className="btn" disabled={guardando} onClick={crear}>
        {guardando ? 'Agregando…' : '+ Agregar usuario'}
      </button>
    </div>
  );
}

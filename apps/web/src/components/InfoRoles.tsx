// apps/web/src/components/InfoRoles.tsx
import { ROLES_INFO } from '../config/rolesInfo';

/**
 * Bloque colapsable "¿Qué puede hacer cada rol?" — reutilizado en el form de
 * solicitud y en /admin (Planes). `soloRoles`, si viene, filtra a sólo esos
 * ids (el paso "Tu plan" del alta lo usa para mostrar únicamente los roles
 * que el plan elegido efectivamente incluye, en vez de los 5 roles fijos);
 * sin el prop se listan todos, como en /admin donde no hay un plan puntual
 * en contexto.
 */
export function InfoRoles({ soloRoles }: { soloRoles?: string[] } = {}) {
  const roles = soloRoles ? ROLES_INFO.filter((r) => soloRoles.includes(r.id)) : ROLES_INFO;
  return (
    <details className="info-roles">
      <summary>¿Qué puede hacer cada rol?</summary>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.6rem' }}>
        {roles.map((r) => (
          <div key={r.id}>
            <b>{r.label}</b>
            <p className="muted" style={{ margin: '0.1rem 0 0.3rem', fontSize: '0.85rem' }}>{r.resumen}</p>
            <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.82rem' }}>
              {r.incluye.map((linea, i) => <li key={i}>{linea}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </details>
  );
}

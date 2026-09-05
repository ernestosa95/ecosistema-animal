// apps/web/src/components/InfoRoles.tsx
import { ROLES_INFO } from '../config/rolesInfo';

/** Bloque colapsable "¿Qué puede hacer cada rol?" — reutilizado en el form de solicitud y en /admin (Planes). */
export function InfoRoles() {
  return (
    <details className="info-roles">
      <summary>¿Qué puede hacer cada rol?</summary>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.6rem' }}>
        {ROLES_INFO.map((r) => (
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

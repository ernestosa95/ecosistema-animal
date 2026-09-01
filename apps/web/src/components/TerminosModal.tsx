import { SECCIONES_TERMINOS } from '../legal/terminos';

/** Modal de sólo lectura con el texto completo de términos y condiciones / política de privacidad. */
export function TerminosModal({ onCerrar }: { onCerrar: () => void }) {
  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <span>Términos y condiciones y política de privacidad</span>
          <button className="link" onClick={onCerrar}>
            Cerrar ✕
          </button>
        </div>
        <div className="terminos-cuerpo">
          {SECCIONES_TERMINOS.map((s) => (
            <section key={s.titulo}>
              <h3>{s.titulo}</h3>
              {s.parrafos.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

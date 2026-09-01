// Piezas de UI compartidas por TurnosPage.tsx y GestionAgendas.tsx — reusan
// las clases `hu-*` del CSS propio de TurnosPage.tsx (autocontenido, no las
// del resto de la app).
export function Overlay({ children, onClose, ancho }: { children: React.ReactNode; onClose: () => void; ancho?: boolean }) {
  return (
    <div className="hu-overlay" onClick={onClose}>
      <div className={`hu-modal${ancho ? ' hu-modal-ancho' : ''}`} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="hu-field">
      <span>{label}</span>
      {children}
    </div>
  );
}

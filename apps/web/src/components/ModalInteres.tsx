import { useState } from 'react';
import { crearInteresado } from '../api/interesados';

/**
 * Form de captura de interés ("Estoy interesado") — estrategia de lanzamiento
 * (cupo fijo de 10, ver InteresadosService en el backend): reemplaza
 * temporalmente al alta self-service directa en TODOS los puntos de entrada,
 * no sólo la landing — también el "Solicitar acceso" de LoginPage.tsx, que
 * si no se reemplazaba acá también quedaba como una vía paralela para
 * saltarse el cupo. Compartido entre esas dos páginas.
 */
export function ModalInteres({
  restantes,
  onCerrar,
  onEnviado,
}: {
  restantes: number;
  onCerrar: () => void;
  onEnviado: () => void;
}) {
  const [nombre, setNombre] = useState('');
  const [nombreVeterinaria, setNombreVeterinaria] = useState('');
  const [contacto, setContacto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await crearInteresado({ nombre, nombreVeterinaria, contacto });
      setEnviado(true);
      onEnviado();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar la solicitud');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div className="drawer-head">
          <span>Estoy interesado</span>
          <button className="link" onClick={onCerrar}>
            Cerrar ✕
          </button>
        </div>

        {enviado ? (
          <div style={{ marginTop: '0.75rem' }}>
            <p>
              ¡Listo! Ya te anotamos. Te vamos a contactar para coordinar el alta y los primeros 3 meses gratis.
            </p>
            <button className="btn" onClick={onCerrar} style={{ marginTop: '0.5rem' }}>
              Cerrar
            </button>
          </div>
        ) : (
          <>
            <p className="muted" style={{ marginTop: '0.4rem' }}>
              Los primeros 10 en anotarse tienen 3 meses gratis
              {restantes <= 5 ? ` — quedan ${restantes} lugares.` : '.'}
            </p>
            <form className="form-grid" onSubmit={enviar} style={{ marginTop: '0.75rem' }}>
              <label className="span-2">
                Tu nombre
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
              </label>
              <label className="span-2">
                Nombre de la veterinaria
                <input value={nombreVeterinaria} onChange={(e) => setNombreVeterinaria(e.target.value)} required />
              </label>
              <label className="span-2">
                Email o celular
                <input value={contacto} onChange={(e) => setContacto(e.target.value)} required />
              </label>
              {error && <div className="alerta span-2">{error}</div>}
              <div className="span-2">
                <button className="btn" type="submit" disabled={enviando}>
                  {enviando ? 'Enviando…' : 'Enviar'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

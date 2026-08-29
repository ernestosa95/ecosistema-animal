import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Sesion, MensajePlataforma } from '../api/types';

/** Anuncios de la plataforma (super-admin → usuarios): banner descartable al loguearse. */
export function MensajesBanner({ sesion }: { sesion: Sesion }) {
  const [mensajes, setMensajes] = useState<MensajePlataforma[]>([]);

  useEffect(() => {
    api.mensajesPendientes(sesion).then(setMensajes).catch(() => {
      /* si falla, simplemente no se muestra ningún banner */
    });
  }, [sesion]);

  if (mensajes.length === 0) return null;
  const [actual, ...resto] = mensajes;

  async function descartar() {
    try {
      await api.marcarMensajeLeido(sesion, actual.id);
    } catch {
      /* si falla la marca, el mensaje puede volver a aparecer en el próximo login */
    }
    setMensajes(resto);
  }

  return (
    <div className="alerta" style={{ background: '#eef2ee', color: '#1f2933', borderColor: '#c8d8c2', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
      <div>
        <strong>{actual.titulo}</strong>
        <p style={{ margin: '0.25rem 0 0' }}>{actual.cuerpo}</p>
      </div>
      <button className="btn-ghost" onClick={descartar}>
        Descartar
      </button>
    </div>
  );
}

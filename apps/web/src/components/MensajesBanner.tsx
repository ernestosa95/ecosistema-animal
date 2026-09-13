import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Sesion, MensajePlataforma } from '../api/types';

/**
 * Anuncios de la plataforma (super-admin → usuarios): banner descartable al
 * loguearse. Cuando el mensaje trae preguntas de feedback (ver
 * MensajesAdminService en el backend), suma un form corto en vez de sólo
 * "Descartar" — responder es opcional a propósito (nunca bloquea el
 * descarte), ver FormFeedback más abajo.
 */
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

  function siguiente() {
    setMensajes(resto);
  }

  return (
    <div className="alerta" style={{ background: '#eef2ee', color: '#1f2933', borderColor: '#c8d8c2' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong>{actual.titulo}</strong>
          <p style={{ margin: '0.25rem 0 0' }}>{actual.cuerpo}</p>
        </div>
        {actual.preguntas.length === 0 && (
          <button className="btn-ghost" onClick={descartar}>
            Descartar
          </button>
        )}
      </div>
      {actual.preguntas.length > 0 && (
        <FormFeedback key={actual.id} sesion={sesion} mensaje={actual} onRespondido={siguiente} onDescartar={descartar} />
      )}
    </div>
  );
}

function FormFeedback({
  sesion,
  mensaje,
  onRespondido,
  onDescartar,
}: {
  sesion: Sesion;
  mensaje: MensajePlataforma;
  onRespondido: () => void;
  onDescartar: () => void;
}) {
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setRespuesta(preguntaId: string, valor: string) {
    setRespuestas((r) => ({ ...r, [preguntaId]: valor }));
  }

  async function enviar() {
    const items = Object.entries(respuestas)
      .filter(([, v]) => v.trim().length > 0)
      .map(([preguntaId, respuesta]) => ({ preguntaId, respuesta: respuesta.trim() }));
    if (items.length === 0) {
      setError('Respondé al menos una pregunta, o descartá sin responder.');
      return;
    }
    setEnviando(true); setError(null);
    try {
      await api.responderMensaje(sesion, mensaje.id, items);
      onRespondido();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar tu respuesta');
      setEnviando(false);
    }
  }

  return (
    <div style={{ marginTop: '0.75rem', paddingTop: '0.6rem', borderTop: '1px solid #c8d8c2', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {mensaje.preguntas.map((p) => (
        <div key={p.id}>
          <div style={{ fontSize: '0.88rem', fontWeight: 600, marginBottom: '0.25rem' }}>{p.texto}</div>
          {p.tipo === 'si_no' && (
            <div style={{ display: 'flex', gap: '1rem' }}>
              {['Sí', 'No'].map((op) => (
                <label key={op} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.88rem' }}>
                  <input
                    type="radio"
                    name={p.id}
                    checked={respuestas[p.id] === op.toLowerCase()}
                    onChange={() => setRespuesta(p.id, op.toLowerCase())}
                  />
                  {op}
                </label>
              ))}
            </div>
          )}
          {p.tipo === 'opcion_multiple' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              {(p.opciones ?? []).map((op) => (
                <label key={op} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.88rem' }}>
                  <input
                    type="radio"
                    name={p.id}
                    checked={respuestas[p.id] === op}
                    onChange={() => setRespuesta(p.id, op)}
                  />
                  {op}
                </label>
              ))}
            </div>
          )}
          {p.tipo === 'texto_breve' && (
            <input
              type="text"
              value={respuestas[p.id] ?? ''}
              onChange={(e) => setRespuesta(p.id, e.target.value)}
              placeholder="Tu respuesta…"
              style={{ width: '100%', maxWidth: 420 }}
            />
          )}
        </div>
      ))}
      {error && <div style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</div>}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button className="btn" onClick={enviar} disabled={enviando}>
          {enviando ? 'Enviando…' : 'Enviar respuestas'}
        </button>
        <button className="btn-ghost" onClick={onDescartar} disabled={enviando}>
          Descartar sin responder
        </button>
      </div>
    </div>
  );
}

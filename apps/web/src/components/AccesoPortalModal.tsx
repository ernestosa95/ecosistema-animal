import { useMemo, useState } from 'react';
import { api } from '../api/client';
import { useEntidadesBusqueda } from '../hooks/useEntidadesBusqueda';
import { puntuarMultiple } from '../utils/fuzzy';
import type { Sesion, Persona } from '../api/types';

/**
 * Modal de acceso rápido al portal desde el Home ("centro de operaciones") —
 * a diferencia de PersonasPage.tsx (que ya tiene esto por dueño, adentro de
 * "Ver mascotas"), acá arranca directo pidiendo el dueño, sin tener que
 * pasar por la lista de Personas primero. Mismo patrón de dueño
 * existente/nuevo que SeleccionarAnimalModal.tsx.
 */
export function AccesoPortalModal({ sesion, onCerrar }: { sesion: Sesion; onCerrar: () => void }) {
  const { personas, refrescar } = useEntidadesBusqueda(sesion);
  const [persona, setPersona] = useState<Persona | null>(null);

  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        {persona ? (
          <AccesosDeDueno
            sesion={sesion}
            persona={persona}
            onVolver={() => setPersona(null)}
            onCerrar={onCerrar}
          />
        ) : (
          <BuscarDueno
            personas={personas}
            sesion={sesion}
            onSeleccionar={setPersona}
            onCreado={(p) => { refrescar(); setPersona(p); }}
            onCerrar={onCerrar}
          />
        )}
      </div>
    </div>
  );
}

function BuscarDueno({ personas, sesion, onSeleccionar, onCreado, onCerrar }: {
  personas: Persona[]; sesion: Sesion; onSeleccionar: (p: Persona) => void;
  onCreado: (p: Persona) => void; onCerrar: () => void;
}) {
  const [query, setQuery] = useState('');
  const [modoCrear, setModoCrear] = useState(false);
  const [dNombre, setDNombre] = useState('');
  const [dApellido, setDApellido] = useState('');
  const [dCelular, setDCelular] = useState('');
  const [dDni, setDDni] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const resultados = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return personas
      .map((p) => ({ persona: p, score: puntuarMultiple(q, [`${p.nombre} ${p.apellido}`, p.dni, p.celular]) }))
      .filter((r) => r.score > 0)
      .sort((x, y) => y.score - x.score)
      .slice(0, 8);
  }, [query, personas]);

  function abrirCrear() {
    const [n, ...resto] = query.trim().split(' ');
    setDNombre(n ?? '');
    setDApellido(resto.join(' '));
    setError(null);
    setModoCrear(true);
  }

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!dNombre.trim() || !dApellido.trim() || !dCelular.trim() || !dDni.trim()) {
      setError('Completá nombre, apellido, celular y DNI');
      return;
    }
    setGuardando(true);
    try {
      const p = await api.crearPersona(sesion, {
        nombre: dNombre.trim(),
        apellido: dApellido.trim(),
        celular: dCelular.trim(),
        dni: dDni.trim(),
      });
      onCreado(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el dueño');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <div className="drawer-head">
        <span>Acceso al portal</span>
        <button className="link" onClick={onCerrar}>Cerrar ✕</button>
      </div>
      {!modoCrear && <p className="muted">Buscá al dueño para generarle el acceso.</p>}

      {modoCrear ? (
        <form className="form-grid" onSubmit={crear} style={{ marginTop: '0.75rem' }}>
          <label>
            Nombre
            <input value={dNombre} onChange={(e) => setDNombre(e.target.value)} required autoFocus />
          </label>
          <label>
            Apellido
            <input value={dApellido} onChange={(e) => setDApellido(e.target.value)} required />
          </label>
          <label>
            Celular
            <input value={dCelular} onChange={(e) => setDCelular(e.target.value)} required />
          </label>
          <label>
            DNI
            <input value={dDni} onChange={(e) => setDDni(e.target.value)} required />
          </label>
          {error && <div className="alerta span-2">{error}</div>}
          <div className="span-2" style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="btn-ghost" onClick={() => setModoCrear(false)} disabled={guardando}>
              Volver a buscar
            </button>
            <button className="btn" type="submit" disabled={guardando}>
              {guardando ? 'Creando…' : 'Crear y continuar'}
            </button>
          </div>
        </form>
      ) : (
        <>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar dueño por nombre, DNI o celular…"
            style={{ marginTop: '0.75rem' }}
          />
          {query.trim() && resultados.length === 0 && <p className="muted omni-empty">Sin resultados.</p>}
          <div className="omni-resultados">
            {resultados.map(({ persona: p }) => (
              <button key={p.id} type="button" className="omni-item" onClick={() => onSeleccionar(p)}>
                <span className="omni-tipo">Dueño</span>
                <b>{p.nombre} {p.apellido}</b>
                <span className="muted">{p.dni ? `DNI ${p.dni}` : p.celular ?? '—'}</span>
              </button>
            ))}
          </div>
          <button type="button" className="link" style={{ marginTop: '0.75rem' }} onClick={abrirCrear}>
            ＋ No aparece: crear dueño nuevo
          </button>
        </>
      )}
    </>
  );
}

function AccesosDeDueno({ sesion, persona, onVolver, onCerrar }: {
  sesion: Sesion; persona: Persona; onVolver: () => void; onCerrar: () => void;
}) {
  const [link, setLink] = useState<string | null>(null);
  const [generandoLink, setGenerandoLink] = useState(false);
  const [copiadoLink, setCopiadoLink] = useState(false);
  const [codigo, setCodigo] = useState<{ codigo: string; expiraEnMinutos: number } | null>(null);
  const [generandoCodigo, setGenerandoCodigo] = useState(false);
  const [enviandoWsp, setEnviandoWsp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tel = persona.celular || persona.telefono || '';

  async function generarLink() {
    setError(null); setGenerandoLink(true); setCopiadoLink(false);
    try {
      const r = await api.generarAccesoPortal(sesion, persona.id);
      setLink(r.portalUrl);
      api.registrarEvento(sesion, 'accion', 'portal-generar-acceso');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el link');
    } finally {
      setGenerandoLink(false);
    }
  }

  async function copiarLink() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopiadoLink(true);
  }

  async function generarCodigo() {
    setError(null); setGenerandoCodigo(true);
    try {
      const r = await api.generarCodigoPortal(sesion, persona.id);
      setCodigo(r);
      api.registrarEvento(sesion, 'accion', 'portal-generar-codigo');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el código');
    } finally {
      setGenerandoCodigo(false);
    }
  }

  /**
   * Genera link + código frescos (si todavía no existían) y manda los dos
   * juntos por WhatsApp con un tutorial breve. El código dura sólo unos
   * minutos sin uso — se avisa en el propio mensaje para que, si lo abren
   * tarde, sepan que tienen que pedir uno nuevo en vez de pensar que está roto.
   */
  async function enviarPorWhatsapp() {
    if (!tel) return;
    setError(null); setEnviandoWsp(true);
    const ventana = window.open('', '_blank');
    try {
      const [linkR, codigoR] = await Promise.all([
        link ? Promise.resolve({ portalUrl: link }) : api.generarAccesoPortal(sesion, persona.id),
        codigo ? Promise.resolve(codigo) : (persona.dni ? api.generarCodigoPortal(sesion, persona.id) : Promise.resolve(null)),
      ]);
      setLink(linkR.portalUrl);
      if (codigoR) setCodigo(codigoR);
      api.registrarEvento(sesion, 'accion', 'portal-enviar-whatsapp');

      const pasoCodigo = codigoR
        ? `\n2️⃣ O entrá a ${window.location.origin}/portal con tu DNI y este código: *${codigoR.codigo}* (vale unos minutos — si ya pasó, pedinos uno nuevo)`
        : '';
      const msg = `¡Hola ${persona.nombre}! Así entrás al portal para ver la historia clínica, vacunas y turnos de tus mascotas:\n\n1️⃣ Más fácil, tocá este link → ${linkR.portalUrl}${pasoCodigo}\n\n¡Cualquier duda, escribinos! 🐾`;

      if (ventana) ventana.location.href = `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`;
    } catch (err) {
      ventana?.close();
      setError(err instanceof Error ? err.message : 'No se pudo generar el acceso');
    } finally {
      setEnviandoWsp(false);
    }
  }

  return (
    <>
      <div className="drawer-head">
        <span>Acceso al portal</span>
        <button className="link" onClick={onCerrar}>Cerrar ✕</button>
      </div>
      <p className="muted" style={{ marginTop: '-0.2rem' }}>
        {persona.nombre} {persona.apellido}
        {persona.dni ? ` · DNI ${persona.dni}` : ''}
        {tel ? ` · ${tel}` : ''}
      </p>

      {error && <div className="alerta">{error}</div>}

      {tel && (
        <div className="card" style={{ padding: '0.75rem 0.9rem', marginBottom: '0.75rem', background: 'var(--huella-bg)' }}>
          <b>Enviar los dos accesos por WhatsApp</b>
          <p className="muted" style={{ fontSize: '0.85rem', margin: '0.3rem 0 0.6rem' }}>
            Genera el link y (si tiene DNI cargado) el código, y arma un WhatsApp con un tutorial
            breve para {persona.nombre}.
          </p>
          <button className="btn" onClick={enviarPorWhatsapp} disabled={enviandoWsp}>
            {enviandoWsp ? 'Generando…' : '💬 Enviar por WhatsApp'}
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <div className="card" style={{ padding: '0.75rem 0.9rem' }}>
          <div className="dato-label">Link de acceso directo (vale 30 días)</div>
          {link ? (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '0.4rem' }}>
              <button className="btn-ghost" onClick={copiarLink}>{copiadoLink ? 'Copiado ✓' : 'Copiar link'}</button>
              {tel && (
                <a
                  className="btn-ghost"
                  href={`https://wa.me/${tel}?text=${encodeURIComponent(`Te compartimos el acceso al portal de tus mascotas: ${link}`)}`}
                  target="_blank" rel="noreferrer"
                >
                  Enviar sólo esto por WhatsApp
                </a>
              )}
            </div>
          ) : (
            <button className="btn-ghost" onClick={generarLink} disabled={generandoLink} style={{ marginTop: '0.4rem' }}>
              {generandoLink ? 'Generando…' : 'Generar link'}
            </button>
          )}
        </div>

        <div className="card" style={{ padding: '0.75rem 0.9rem' }}>
          <div className="dato-label">Código para ingresar con DNI (para más adelante, se cierra a los minutos sin uso)</div>
          {codigo ? (
            <span className="mono" style={{ fontSize: '1.1rem', letterSpacing: '0.08em', display: 'block', marginTop: '0.4rem' }}>
              {codigo.codigo}
            </span>
          ) : (
            <button
              className="btn-ghost"
              onClick={generarCodigo}
              disabled={generandoCodigo || !persona.dni}
              title={!persona.dni ? 'Cargá el DNI del dueño primero' : undefined}
              style={{ marginTop: '0.4rem' }}
            >
              {generandoCodigo ? 'Generando…' : 'Generar código'}
            </button>
          )}
        </div>
      </div>

      <div className="acciones" style={{ marginTop: '0.75rem' }}>
        <button type="button" className="link" onClick={onVolver}>‹ Elegir otro dueño</button>
      </div>
    </>
  );
}

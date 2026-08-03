// apps/web/src/pages/TurnosPage.tsx
import { useEffect, useMemo, useState } from 'react';
import {
  listarTurnos, crearTurno, confirmarTurno, reprogramarTurno,
  cancelarTurno, atenderTurno, buscarAnimales,
  type Turno, type EstadoTurno, type AnimalOpcion,
} from '../api/turnos';

// ── Config visual ──────────────────────────────────────────────────────────
const ESPECIES: Record<string, string> = {
  Canino: '🐕', Felino: '🐈', Equino: '🐎', Bovino: '🐄', Ave: '🦜', Conejo: '🐇',
};
const ESTADOS: Record<EstadoTurno, { label: string; color: string }> = {
  solicitado:   { label: 'Solicitado',   color: '#E9A23B' },
  confirmado:   { label: 'Confirmado',   color: '#0E7C6B' },
  reprogramado: { label: 'Reprogramado', color: '#7C5CBF' },
  atendido:     { label: 'Atendido',     color: '#2E9E5B' },
  cancelado:    { label: 'Cancelado',    color: '#8A9A96' },
};
// Máquina de estados: qué acciones ofrece cada estado
const ACCIONES: Record<EstadoTurno, Array<['confirmar' | 'atender' | 'reprogramar' | 'cancelar', string]>> = {
  solicitado:   [['confirmar', 'solid'], ['reprogramar', ''], ['cancelar', 'danger']],
  confirmado:   [['atender', 'solid'], ['reprogramar', ''], ['cancelar', 'danger']],
  reprogramado: [['confirmar', 'solid'], ['atender', ''], ['cancelar', 'danger']],
  atendido:     [],
  cancelado:    [],
};
const LABEL: Record<string, string> = { confirmar: 'Confirmar', atender: 'Atender', reprogramar: 'Reprogramar', cancelar: 'Cancelar' };

// ── Helpers de fecha ────────────────────────────────────────────────────────
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const fechaLarga = (d: Date) => d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });

type Modal =
  | { tipo: 'reprogramar'; turno: Turno }
  | { tipo: 'cancelar'; turno: Turno }
  | { tipo: 'nuevo' }
  | null;

interface Props {
  /** Se llama al atender un turno; usalo para abrir "Nueva consulta" del paciente. */
  onAtender?: (turno: Turno) => void;
}

export default function TurnosPage({ onAtender }: Props) {
  const [fecha, setFecha] = useState<Date>(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; });
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<'todos' | EstadoTurno>('todos');
  const [modal, setModal] = useState<Modal>(null);
  const [ocupado, setOcupado] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  async function cargar() {
    setCargando(true); setError(null);
    try { setTurnos(await listarTurnos(iso(fecha))); }
    catch (e: any) { setError(e.message ?? 'No se pudieron cargar los turnos'); }
    finally { setCargando(false); }
  }
  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [fecha]);

  function avisar(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2600); }

  async function correr(fn: () => Promise<any>, msg?: string) {
    if (ocupado) return;
    setOcupado(true);
    try { await fn(); await cargar(); if (msg) avisar(msg); }
    catch (e: any) { avisar(e.message ?? 'Ocurrió un error'); }
    finally { setOcupado(false); }
  }

  function onAccion(t: Turno, a: string) {
    if (a === 'confirmar') correr(() => confirmarTurno(t.id), `Turno de ${t.paciente} confirmado`);
    else if (a === 'atender') correr(async () => { await atenderTurno(t.id); onAtender?.(t); }, `${t.paciente} atendido`);
    else if (a === 'cancelar') setModal({ tipo: 'cancelar', turno: t });
    else if (a === 'reprogramar') setModal({ tipo: 'reprogramar', turno: t });
  }

  const delDia = useMemo(
    () => (filtro === 'todos' ? turnos : turnos.filter(t => t.estado === filtro)),
    [turnos, filtro],
  );
  const cuenta = (e: EstadoTurno) => turnos.filter(t => t.estado === e).length;

  return (
    <div className="hu-agenda">
      <style>{CSS}</style>

      {/* Navegación de fecha */}
      <div className="hu-datenav">
        <button className="hu-nav" onClick={() => setFecha(addDays(fecha, -1))}>‹</button>
        <div className="hu-datelabel">{fechaLarga(fecha)}</div>
        <button className="hu-nav" onClick={() => setFecha(addDays(fecha, 1))}>›</button>
        <button className="hu-btn ghost" onClick={() => { const d = new Date(); d.setHours(0, 0, 0, 0); setFecha(d); }}>Hoy</button>
        <input type="date" value={iso(fecha)} onChange={e => e.target.value && setFecha(new Date(e.target.value + 'T00:00:00'))} />
      </div>

      {/* Resumen */}
      <div className="hu-summary">
        <div className="hu-stat"><b>{turnos.length}</b><span>turnos</span></div>
        <div className="hu-stat"><b style={{ color: ESTADOS.solicitado.color }}>{cuenta('solicitado')}</b><span>a confirmar</span></div>
        <div className="hu-stat"><b style={{ color: ESTADOS.confirmado.color }}>{cuenta('confirmado') + cuenta('reprogramado')}</b><span>en agenda</span></div>
        <div className="hu-stat"><b style={{ color: ESTADOS.atendido.color }}>{cuenta('atendido')}</b><span>atendidos</span></div>
      </div>

      {/* Filtros */}
      <div className="hu-filters">
        {([['todos', 'Todos'], ['solicitado', 'Solicitados'], ['confirmado', 'Confirmados'],
          ['reprogramado', 'Reprogramados'], ['atendido', 'Atendidos'], ['cancelado', 'Cancelados']] as const)
          .map(([k, l]) => (
            <div key={k} className={`hu-chip ${filtro === k ? 'active' : ''}`} onClick={() => setFiltro(k)}>{l}</div>
          ))}
      </div>

      {/* Lista */}
      {cargando ? (
        <div className="hu-empty">Cargando agenda…</div>
      ) : error ? (
        <div className="hu-empty" style={{ color: '#C0492F' }}>
          {error}<br /><button className="hu-btn ghost" style={{ marginTop: 10 }} onClick={cargar}>Reintentar</button>
        </div>
      ) : delDia.length === 0 ? (
        <div className="hu-empty">No hay turnos {filtro !== 'todos' ? 'en este estado' : 'para este día'}.</div>
      ) : (
        delDia.map(t => {
          const est = ESTADOS[t.estado];
          return (
            <div key={t.id} className="hu-card" style={{ borderLeftColor: est.color }}>
              <div className="hu-time">{t.hora}<small>{t.canal === 'portal' ? 'portal' : 'mostrador'}</small></div>
              <div className="hu-main">
                <div className="hu-pac">{ESPECIES[t.especie] || '🐾'} {t.paciente} <span className="hu-sp">· {t.especie}</span></div>
                <div className="hu-meta">{t.dueno}</div>
                <div className="hu-motivo">{t.motivo}</div>
                <div style={{ marginTop: 8 }}>
                  <span className="hu-badge" style={{ color: est.color, background: est.color + '1a' }}>
                    <span className="hu-dot" style={{ background: est.color }} />{est.label}
                  </span>
                </div>
                {ACCIONES[t.estado].length > 0 && (
                  <div className="hu-actions">
                    {ACCIONES[t.estado].map(([a, cls]) => (
                      <button key={a} className={`hu-act ${cls}`} disabled={ocupado} onClick={() => onAccion(t, a)}>{LABEL[a]}</button>
                    ))}
                  </div>
                )}
                {t.estado === 'atendido' && <div className="hu-terminal">✓ Consulta registrada</div>}
                {t.estado === 'cancelado' && <div className="hu-terminal">Turno cancelado</div>}
              </div>
            </div>
          );
        })
      )}

      <button className="hu-fab" onClick={() => setModal({ tipo: 'nuevo' })}>+ Nuevo turno</button>

      {modal?.tipo === 'reprogramar' && (
        <ModalReprogramar turno={modal.turno} onClose={() => setModal(null)}
          onOk={(fecha, hora) => { setModal(null); correr(() => reprogramarTurno(modal.turno.id, { fecha, hora }), 'Turno reprogramado'); setFecha(new Date(fecha + 'T00:00:00')); }} />
      )}
      {modal?.tipo === 'cancelar' && (
        <ModalCancelar turno={modal.turno} onClose={() => setModal(null)}
          onOk={(motivo) => { setModal(null); correr(() => cancelarTurno(modal.turno.id, motivo), 'Turno cancelado'); }} />
      )}
      {modal?.tipo === 'nuevo' && (
        <ModalNuevo fechaDefault={iso(fecha)} onClose={() => setModal(null)}
          onOk={(data) => { setModal(null); correr(() => crearTurno(data), 'Turno creado'); setFecha(new Date(data.fecha + 'T00:00:00')); }} />
      )}

      {toast && <div className="hu-toast">{toast}</div>}
    </div>
  );
}

// ── Modal: reprogramar ──────────────────────────────────────────────────────
function ModalReprogramar({ turno, onClose, onOk }: { turno: Turno; onClose: () => void; onOk: (f: string, h: string) => void }) {
  const [f, setF] = useState(turno.fecha);
  const [h, setH] = useState(turno.hora);
  return (
    <Overlay onClose={onClose}>
      <h2>Reprogramar turno</h2>
      <p className="hu-sub">{turno.paciente} · {turno.dueno}</p>
      <div className="hu-row2">
        <Field label="Nueva fecha"><input type="date" value={f} onChange={e => setF(e.target.value)} /></Field>
        <Field label="Nueva hora"><input type="time" value={h} onChange={e => setH(e.target.value)} /></Field>
      </div>
      <div className="hu-mactions">
        <button className="hu-btn ghost" onClick={onClose}>Cancelar</button>
        <button className="hu-btn primary" onClick={() => onOk(f, h)}>Reprogramar</button>
      </div>
    </Overlay>
  );
}

// ── Modal: cancelar ─────────────────────────────────────────────────────────
function ModalCancelar({ turno, onClose, onOk }: { turno: Turno; onClose: () => void; onOk: (motivo: string) => void }) {
  const [m, setM] = useState('');
  return (
    <Overlay onClose={onClose}>
      <h2>¿Cancelar turno?</h2>
      <p className="hu-sub">{turno.paciente} · {turno.hora} · {turno.dueno}</p>
      <Field label="Motivo (opcional)"><input type="text" value={m} onChange={e => setM(e.target.value)} placeholder="Ej: el dueño no puede asistir" /></Field>
      <div className="hu-mactions">
        <button className="hu-btn ghost" onClick={onClose}>Volver</button>
        <button className="hu-btn" style={{ flex: 1, background: '#C0492F', color: '#fff' }} onClick={() => onOk(m)}>Sí, cancelar</button>
      </div>
    </Overlay>
  );
}

// ── Modal: nuevo turno (con búsqueda de animal) ─────────────────────────────
function ModalNuevo({ fechaDefault, onClose, onOk }: {
  fechaDefault: string; onClose: () => void;
  onOk: (d: { animalId: string; motivo: string; fecha: string; hora: string; paciente?: string; especie?: string; dueno?: string }) => void;
}) {
  const [q, setQ] = useState('');
  const [ops, setOps] = useState<AnimalOpcion[]>([]);
  const [sel, setSel] = useState<AnimalOpcion | null>(null);
  const [motivo, setMotivo] = useState('');
  const [fecha, setFecha] = useState(fechaDefault);
  const [hora, setHora] = useState('10:00');

  useEffect(() => {
    if (sel || q.trim().length < 2) { setOps([]); return; }
    let vivo = true;
    const t = setTimeout(async () => { try { const r = await buscarAnimales(q.trim()); if (vivo) setOps(r); } catch { /* noop */ } }, 250);
    return () => { vivo = false; clearTimeout(t); };
  }, [q, sel]);

  return (
    <Overlay onClose={onClose}>
      <h2>Nuevo turno</h2>
      <p className="hu-sub">Alta desde mostrador (queda confirmado)</p>

      <Field label="Paciente">
        {sel ? (
          <div className="hu-selected">
            <span>{ESPECIES[sel.especie] || '🐾'} {sel.nombre} · {sel.dueno}</span>
            <button onClick={() => { setSel(null); setQ(''); }}>cambiar</button>
          </div>
        ) : (
          <>
            <input type="text" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nombre…" />
            {ops.length > 0 && (
              <div className="hu-suggest">
                {ops.map(o => (
                  <div key={o.id} className="hu-sug" onClick={() => { setSel(o); setOps([]); }}>
                    {ESPECIES[o.especie] || '🐾'} <b>{o.nombre}</b> · {o.dueno}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Field>

      <Field label="Motivo"><input type="text" value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Motivo de la consulta" /></Field>
      <div className="hu-row2">
        <Field label="Fecha"><input type="date" value={fecha} onChange={e => setFecha(e.target.value)} /></Field>
        <Field label="Hora"><input type="time" value={hora} onChange={e => setHora(e.target.value)} /></Field>
      </div>
      <div className="hu-mactions">
        <button className="hu-btn ghost" onClick={onClose}>Cancelar</button>
        <button className="hu-btn primary" disabled={!sel}
          onClick={() => sel && onOk({ animalId: sel.id, motivo: motivo || 'Consulta', fecha, hora, paciente: sel.nombre, especie: sel.especie, dueno: sel.dueno })}>
          Crear turno
        </button>
      </div>
    </Overlay>
  );
}

// ── Piezas compartidas ──────────────────────────────────────────────────────
function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="hu-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="hu-modal">{children}</div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="hu-field"><label>{label}</label>{children}</div>;
}

// ── Estilos (propios, sin framework) ────────────────────────────────────────
const CSS = `
.hu-agenda{--teal:#0E7C6B;--teal-dark:#0A5C50;--ink:#17302C;--muted:#6B807B;--line:#DCE6E3;--bg:#F3F8F6;--accent:#E9A23B;
  color:var(--ink);max-width:760px;margin:0 auto;padding-bottom:80px}
.hu-agenda *{box-sizing:border-box}
.hu-datenav{display:flex;align-items:center;gap:8px;margin:8px 0}
.hu-nav{background:#fff;border:1px solid var(--line);border-radius:10px;width:38px;height:38px;font-size:18px;cursor:pointer;color:var(--ink)}
.hu-nav:hover{border-color:var(--teal)}
.hu-datelabel{font-size:16px;font-weight:700;text-transform:capitalize;flex:1;text-align:center}
.hu-btn{border:none;border-radius:10px;padding:9px 14px;font-size:13px;font-weight:600;cursor:pointer}
.hu-btn.ghost{background:#fff;border:1px solid var(--line);color:var(--ink)}
.hu-btn.ghost:hover{border-color:var(--teal)}
.hu-btn.primary{background:var(--teal);color:#fff}
.hu-btn.primary:hover{background:var(--teal-dark)}
.hu-btn:disabled{opacity:.5;cursor:not-allowed}
.hu-agenda input[type=date],.hu-agenda input[type=time],.hu-agenda input[type=text]{border:1px solid var(--line);border-radius:10px;padding:9px 11px;font-size:14px;background:#fff;color:var(--ink);width:100%}
.hu-agenda input:focus{outline:none;border-color:var(--teal)}
.hu-summary{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 12px}
.hu-stat{background:#fff;border:1px solid var(--line);border-radius:12px;padding:8px 12px;min-width:78px}
.hu-stat b{display:block;font-size:20px;line-height:1}
.hu-stat span{font-size:11px;color:var(--muted)}
.hu-filters{display:flex;gap:6px;overflow-x:auto;padding-bottom:6px;margin-bottom:6px}
.hu-chip{white-space:nowrap;border:1px solid var(--line);background:#fff;border-radius:999px;padding:6px 12px;font-size:12.5px;cursor:pointer;color:var(--muted)}
.hu-chip.active{background:var(--ink);color:#fff;border-color:var(--ink)}
.hu-card{background:#fff;border:1px solid var(--line);border-left-width:4px;border-radius:12px;padding:12px 14px;margin-bottom:10px;display:flex;gap:12px;align-items:flex-start}
.hu-time{font-weight:800;font-size:15px;min-width:52px}
.hu-time small{display:block;font-size:10px;color:var(--muted);font-weight:600}
.hu-main{flex:1;min-width:0}
.hu-pac{font-weight:700;font-size:15px}
.hu-sp{font-size:13px;color:var(--muted)}
.hu-meta{color:var(--muted);font-size:12.5px;margin-top:2px}
.hu-motivo{font-size:13px;margin-top:6px}
.hu-badge{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px;text-transform:uppercase;letter-spacing:.4px}
.hu-dot{width:7px;height:7px;border-radius:50%}
.hu-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
.hu-act{border:1px solid var(--line);background:#fff;border-radius:8px;padding:6px 11px;font-size:12.5px;cursor:pointer;font-weight:600;color:var(--ink)}
.hu-act:hover{border-color:var(--teal);color:var(--teal)}
.hu-act.solid{background:var(--teal);color:#fff;border-color:var(--teal)}
.hu-act.solid:hover{background:var(--teal-dark)}
.hu-act.danger:hover{border-color:#C0492F;color:#C0492F}
.hu-act:disabled{opacity:.5;cursor:not-allowed}
.hu-terminal{font-size:12px;color:var(--muted);margin-top:8px;font-style:italic}
.hu-empty{text-align:center;color:var(--muted);padding:40px 16px;background:#fff;border:1px dashed var(--line);border-radius:12px}
.hu-fab{position:fixed;right:22px;bottom:22px;background:var(--teal);color:#fff;border:none;border-radius:14px;padding:14px 18px;font-size:14px;font-weight:700;box-shadow:0 6px 20px rgba(14,124,107,.4);cursor:pointer;z-index:15}
.hu-fab:hover{background:var(--teal-dark)}
.hu-overlay{position:fixed;inset:0;background:rgba(23,48,44,.45);display:flex;align-items:center;justify-content:center;z-index:40;padding:16px}
.hu-modal{background:#fff;border-radius:16px;width:100%;max-width:460px;padding:20px}
.hu-modal h2{margin:0 0 4px;font-size:18px}
.hu-sub{margin:0 0 16px;color:var(--muted);font-size:13px}
.hu-field{margin-bottom:12px;position:relative}
.hu-field label{display:block;font-size:12px;font-weight:700;color:var(--muted);margin-bottom:5px;text-transform:uppercase;letter-spacing:.5px}
.hu-row2{display:flex;gap:10px}.hu-row2>*{flex:1}
.hu-mactions{display:flex;gap:8px;margin-top:8px}.hu-mactions .hu-btn{flex:1;padding:12px}
.hu-suggest{border:1px solid var(--line);border-radius:10px;margin-top:6px;overflow:hidden;max-height:180px;overflow-y:auto}
.hu-sug{padding:9px 11px;font-size:13.5px;cursor:pointer;border-bottom:1px solid var(--bg)}
.hu-sug:hover{background:var(--bg)}
.hu-selected{display:flex;align-items:center;justify-content:space-between;border:1px solid var(--teal);border-radius:10px;padding:9px 11px;font-size:13.5px}
.hu-selected button{background:none;border:none;color:var(--teal);font-weight:600;cursor:pointer;font-size:12.5px}
.hu-toast{position:fixed;left:50%;transform:translateX(-50%);bottom:24px;background:var(--ink);color:#fff;padding:11px 18px;border-radius:12px;font-size:13.5px;z-index:60;box-shadow:0 4px 16px rgba(23,48,44,.2)}
`;

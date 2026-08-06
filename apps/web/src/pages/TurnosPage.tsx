// apps/web/src/pages/TurnosPage.tsx
// Agenda del día alineada a la API real:
//   GET   /turnos?desde&hasta        (rango; el backend filtra por fechaHora)
//   POST  /turnos                    ({ animalId, fechaHora, motivo, canal })
//   PATCH /turnos/:id/estado         ({ estado, fechaHora? })
// Los turnos vienen "planos" (sin nombres): resolvemos paciente/dueño en el cliente.
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import type { Sesion, Turno, EstadoTurno, Animal, Persona, Especie } from '../api/types';

interface Props {
  sesion: Sesion;
  /** Se llama al atender un turno; usalo para abrir la ficha/Nueva consulta del paciente. */
  onAtender?: (animal: Animal) => void;
}

const MOTIVOS = ['Control / Chequeo', 'Vacunación', 'Desparasitación', 'Consulta clínica', 'Urgencia', 'Cirugía'];

const ESTADO_INFO: Record<EstadoTurno, { label: string; color: string }> = {
  solicitado: { label: 'Solicitado', color: '#E9A23B' },
  confirmado: { label: 'Confirmado', color: '#0E7C6B' },
  reprogramado: { label: 'Reprogramado', color: '#7C5CBF' },
  atendido: { label: 'Atendido', color: '#2E9E5B' },
  cancelado: { label: 'Cancelado', color: '#8A9A96' },
  ausente: { label: 'Ausente', color: '#8A9A96' },
};

// Acciones disponibles por estado (respeta los estados terminales del backend).
const ACCIONES: Record<EstadoTurno, EstadoTurno[]> = {
  solicitado: ['confirmado', 'reprogramado', 'cancelado'],
  confirmado: ['atendido', 'reprogramado', 'cancelado'],
  reprogramado: ['confirmado', 'atendido', 'cancelado'],
  atendido: [],
  cancelado: [],
  ausente: [],
};
const BTN_LABEL: Partial<Record<EstadoTurno, string>> = {
  confirmado: 'Confirmar', atendido: 'Atender', reprogramado: 'Reprogramar', cancelado: 'Cancelar',
};

// Helpers de fecha
const two = (n: number) => String(n).padStart(2, '0');
const isoDay = (d: Date) => `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const fechaLarga = (d: Date) => d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
const horaDe = (iso: string) => { const d = new Date(iso); return `${two(d.getHours())}:${two(d.getMinutes())}`; };
// Combina 'YYYY-MM-DD' + 'HH:MM' locales en un ISO instantáneo (para el backend).
const combinar = (dia: string, hora: string) => new Date(`${dia}T${hora}:00`).toISOString();

type Modal =
  | { tipo: 'nuevo' }
  | { tipo: 'reprogramar'; turno: Turno }
  | null;

export default function TurnosPage({ sesion, onAtender }: Props) {
  const [fecha, setFecha] = useState<Date>(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; });
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [animales, setAnimales] = useState<Animal[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [especies, setEspecies] = useState<Especie[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [modal, setModal] = useState<Modal>(null);

  // Mapas para resolver nombres en el cliente
  const animalPorId = useMemo(() => new Map(animales.map((a) => [a.id, a])), [animales]);
  const personaPorId = useMemo(() => new Map(personas.map((p) => [p.id, p])), [personas]);
  const especiePorId = useMemo(() => new Map(especies.map((e) => [e.id, e])), [especies]);

  const nombreAnimal = (id: string) => animalPorId.get(id)?.nombre ?? '—';
  const especieDe = (id: string) => { const a = animalPorId.get(id); return a ? especiePorId.get(a.especieId)?.nombre ?? '' : ''; };
  const duenoDe = (id: string) => {
    const a = animalPorId.get(id);
    const p = a?.personaId ? personaPorId.get(a.personaId) : undefined;
    return p ? `${p.nombre} ${p.apellido}` : '—';
  };

  async function cargar() {
    setCargando(true); setError(null);
    try {
      const d0 = new Date(fecha); d0.setHours(0, 0, 0, 0);
      const d1 = new Date(fecha); d1.setHours(23, 59, 59, 999);
      const [ts, ans, pers, esp] = await Promise.all([
        api.turnos(sesion, d0.toISOString(), d1.toISOString()),
        animales.length ? Promise.resolve(animales) : api.animales(sesion),
        personas.length ? Promise.resolve(personas) : api.personas(sesion),
        especies.length ? Promise.resolve(especies) : api.especies(sesion),
      ]);
      setTurnos([...ts].sort((a, b) => a.fechaHora.localeCompare(b.fechaHora)));
      setAnimales(ans); setPersonas(pers); setEspecies(esp);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los turnos');
    } finally {
      setCargando(false);
    }
  }
  useEffect(() => { cargar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [fecha]);

  async function correr(fn: () => Promise<unknown>) {
    if (ocupado) return;
    setOcupado(true);
    try { await fn(); await cargar(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Ocurrió un error'); }
    finally { setOcupado(false); }
  }

  function onAccion(t: Turno, destino: EstadoTurno) {
    if (destino === 'reprogramado') { setModal({ tipo: 'reprogramar', turno: t }); return; }
    if (destino === 'cancelado' && !window.confirm(`¿Cancelar el turno de ${nombreAnimal(t.animalId)}?`)) return;
    correr(async () => {
      await api.cambiarEstadoTurno(sesion, t.id, { estado: destino });
      if (destino === 'atendido') { const a = animalPorId.get(t.animalId); if (a) onAtender?.(a); }
    });
  }

  const cuenta = (e: EstadoTurno) => turnos.filter((t) => t.estado === e).length;

  return (
    <div className="tn-wrap">
      <style>{CSS}</style>

      <div className="tn-datenav">
        <button className="tn-nav" onClick={() => setFecha(addDays(fecha, -1))}>‹</button>
        <div className="tn-datelabel">{fechaLarga(fecha)}</div>
        <button className="tn-nav" onClick={() => setFecha(addDays(fecha, 1))}>›</button>
        <button className="tn-btn ghost" onClick={() => { const d = new Date(); d.setHours(0, 0, 0, 0); setFecha(d); }}>Hoy</button>
        <input type="date" value={isoDay(fecha)} onChange={(e) => e.target.value && setFecha(new Date(`${e.target.value}T00:00:00`))} />
        <button className="tn-btn solid" onClick={() => setModal({ tipo: 'nuevo' })}>+ Nuevo turno</button>
      </div>

      <div className="tn-summary">
        <div className="tn-stat"><b>{turnos.length}</b><span>turnos</span></div>
        <div className="tn-stat"><b style={{ color: ESTADO_INFO.solicitado.color }}>{cuenta('solicitado')}</b><span>a confirmar</span></div>
        <div className="tn-stat"><b style={{ color: ESTADO_INFO.confirmado.color }}>{cuenta('confirmado') + cuenta('reprogramado')}</b><span>en agenda</span></div>
        <div className="tn-stat"><b style={{ color: ESTADO_INFO.atendido.color }}>{cuenta('atendido')}</b><span>atendidos</span></div>
      </div>

      {error && <div className="tn-alerta">{error}</div>}

      {cargando ? (
        <div className="tn-empty">Cargando agenda…</div>
      ) : turnos.length === 0 ? (
        <div className="tn-empty">No hay turnos para este día.</div>
      ) : (
        <div className="tn-list">
          {turnos.map((t) => {
            const info = ESTADO_INFO[t.estado];
            return (
              <div key={t.id} className="tn-row">
                <div className="tn-hora">{horaDe(t.fechaHora)}</div>
                <div className="tn-info">
                  <div className="tn-pac">
                    {nombreAnimal(t.animalId)}
                    {especieDe(t.animalId) && <span className="tn-esp"> · {especieDe(t.animalId)}</span>}
                    <span className="tn-due"> · {duenoDe(t.animalId)}</span>
                  </div>
                  <div className="tn-motivo">{t.motivo || 'Sin motivo'}</div>
                </div>
                <span className="tn-badge" style={{ color: info.color, borderColor: info.color }}>{info.label}</span>
                <div className="tn-acciones">
                  {ACCIONES[t.estado].map((destino) => (
                    <button
                      key={destino}
                      disabled={ocupado}
                      className={`tn-btn ${destino === 'atendido' || destino === 'confirmado' ? 'solid' : destino === 'cancelado' ? 'danger' : 'ghost'}`}
                      onClick={() => onAccion(t, destino)}
                    >
                      {BTN_LABEL[destino]}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal?.tipo === 'nuevo' && (
        <NuevoTurno
          sesion={sesion}
          fecha={isoDay(fecha)}
          animales={animales}
          duenoDe={duenoDe}
          onClose={() => setModal(null)}
          onCreado={() => { setModal(null); cargar(); }}
        />
      )}

      {modal?.tipo === 'reprogramar' && (
        <Reprogramar
          turno={modal.turno}
          nombre={nombreAnimal(modal.turno.animalId)}
          onClose={() => setModal(null)}
          onConfirmar={(fechaHora) => {
            setModal(null);
            correr(() => api.cambiarEstadoTurno(sesion, modal.turno.id, { estado: 'reprogramado', fechaHora }));
          }}
        />
      )}
    </div>
  );
}

// ── Modal: nuevo turno ──────────────────────────────────────────────────────
function NuevoTurno({
  sesion, fecha, animales, duenoDe, onClose, onCreado,
}: {
  sesion: Sesion; fecha: string; animales: Animal[];
  duenoDe: (animalId: string) => string;
  onClose: () => void; onCreado: () => void;
}) {
  const [q, setQ] = useState('');
  const [animalId, setAnimalId] = useState<string | null>(null);
  const [dia, setDia] = useState(fecha);
  const [hora, setHora] = useState('09:00');
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const filtrados = useMemo(() => {
    const s = q.toLowerCase();
    return animales
      .filter((a) => `${a.nombre} ${duenoDe(a.id)}`.toLowerCase().includes(s))
      .slice(0, 6);
  }, [q, animales, duenoDe]);
  const sel = animales.find((a) => a.id === animalId);

  async function guardar() {
    if (!animalId) return;
    setGuardando(true); setErr(null);
    try {
      await api.crearTurno(sesion, { animalId, fechaHora: combinar(dia, hora), motivo, canal: 'mostrador' });
      onCreado();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo crear el turno');
      setGuardando(false);
    }
  }

  return (
    <Overlay title="Nuevo turno" onClose={onClose}>
      {err && <div className="tn-alerta">{err}</div>}
      <label className="tn-lbl">Animal (buscá por animal o dueño)</label>
      {sel ? (
        <div className="tn-sel">
          <span>{sel.nombre} · {duenoDe(sel.id)}</span>
          <button onClick={() => setAnimalId(null)}>✕</button>
        </div>
      ) : (
        <>
          <input className="tn-inp" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
          {q && (
            <div className="tn-drop">
              {filtrados.map((a) => (
                <button key={a.id} className="tn-opt" onClick={() => { setAnimalId(a.id); setQ(''); }}>
                  {a.nombre} <span className="tn-due"> · {duenoDe(a.id)}</span>
                </button>
              ))}
              {filtrados.length === 0 && <div className="tn-opt tn-muted">Sin resultados</div>}
            </div>
          )}
        </>
      )}

      <div className="tn-grid2">
        <div>
          <label className="tn-lbl">Fecha</label>
          <input className="tn-inp" type="date" value={dia} onChange={(e) => setDia(e.target.value)} />
        </div>
        <div>
          <label className="tn-lbl">Hora</label>
          <input className="tn-inp" type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
        </div>
      </div>

      <label className="tn-lbl">Motivo</label>
      <input className="tn-inp" list="tn-motivos" placeholder="Elegí o escribí un motivo"
        value={motivo} onChange={(e) => setMotivo(e.target.value)} />
      <datalist id="tn-motivos">{MOTIVOS.map((m) => <option key={m} value={m} />)}</datalist>

      <div className="tn-modal-foot">
        <button className="tn-btn ghost" onClick={onClose}>Cancelar</button>
        <button className="tn-btn solid" disabled={!animalId || guardando} onClick={guardar}>
          {guardando ? 'Guardando…' : 'Crear turno'}
        </button>
      </div>
    </Overlay>
  );
}

// ── Modal: reprogramar ──────────────────────────────────────────────────────
function Reprogramar({
  turno, nombre, onClose, onConfirmar,
}: {
  turno: Turno; nombre: string; onClose: () => void; onConfirmar: (fechaHora: string) => void;
}) {
  const d = new Date(turno.fechaHora);
  const [dia, setDia] = useState(isoDay(d));
  const [hora, setHora] = useState(`${two(d.getHours())}:${two(d.getMinutes())}`);
  return (
    <Overlay title={`Reprogramar — ${nombre}`} onClose={onClose}>
      <div className="tn-grid2">
        <div>
          <label className="tn-lbl">Nueva fecha</label>
          <input className="tn-inp" type="date" value={dia} onChange={(e) => setDia(e.target.value)} />
        </div>
        <div>
          <label className="tn-lbl">Nueva hora</label>
          <input className="tn-inp" type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
        </div>
      </div>
      <div className="tn-modal-foot">
        <button className="tn-btn ghost" onClick={onClose}>Cancelar</button>
        <button className="tn-btn solid" onClick={() => onConfirmar(combinar(dia, hora))}>Reprogramar</button>
      </div>
    </Overlay>
  );
}

function Overlay({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="tn-overlay" onClick={onClose}>
      <div className="tn-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tn-modal-head"><h3>{title}</h3><button onClick={onClose}>✕</button></div>
        <div className="tn-modal-body">{children}</div>
      </div>
    </div>
  );
}

// ── Estilos propios (scoped por prefijo tn-) ────────────────────────────────
const CSS = `
.tn-wrap { max-width: 900px; margin: 0 auto; }
.tn-datenav { display: flex; align-items: center; gap: .5rem; margin-bottom: 1rem; flex-wrap: wrap; }
.tn-datelabel { font-weight: 700; text-transform: capitalize; min-width: 12rem; }
.tn-nav { border: 1px solid #d9ddd7; background: #fff; border-radius: 8px; width: 2rem; height: 2rem; cursor: pointer; font-size: 1.1rem; }
.tn-datenav input[type=date] { border: 1px solid #d9ddd7; border-radius: 8px; padding: .35rem .5rem; }
.tn-btn { border-radius: 8px; padding: .4rem .8rem; font-weight: 600; font-size: .88rem; cursor: pointer; border: 1px solid transparent; }
.tn-btn.solid { background: #0E7C6B; color: #fff; }
.tn-btn.ghost { background: #fff; border-color: #d9ddd7; color: #46514d; }
.tn-btn.danger { background: #fff; border-color: #f0c0c0; color: #b4423a; }
.tn-btn:disabled { opacity: .5; cursor: default; }
.tn-datenav .tn-btn.solid { margin-left: auto; }
.tn-summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: .75rem; margin-bottom: 1rem; }
.tn-stat { border: 1px solid #e7e9e4; border-radius: 10px; padding: .75rem; background: #fff; }
.tn-stat b { font-size: 1.5rem; display: block; }
.tn-stat span { font-size: .75rem; color: #7a857f; }
.tn-list { border: 1px solid #e7e9e4; border-radius: 10px; overflow: hidden; background: #fff; }
.tn-row { display: flex; align-items: center; gap: .75rem; padding: .7rem .9rem; border-top: 1px solid #f0f1ee; flex-wrap: wrap; }
.tn-row:first-child { border-top: none; }
.tn-hora { font-weight: 700; width: 3.2rem; color: #46514d; }
.tn-info { flex: 1; min-width: 10rem; }
.tn-pac { font-weight: 600; }
.tn-esp, .tn-due { color: #7a857f; font-weight: 400; }
.tn-motivo { font-size: .82rem; color: #7a857f; }
.tn-badge { font-size: .72rem; font-weight: 700; padding: .12rem .5rem; border: 1px solid; border-radius: 999px; }
.tn-acciones { display: flex; gap: .35rem; flex-wrap: wrap; }
.tn-empty { text-align: center; color: #7a857f; padding: 2.5rem; border: 1px dashed #d9ddd7; border-radius: 10px; }
.tn-alerta { background: #fdeceb; color: #b4423a; border: 1px solid #f2b8b3; border-radius: 8px; padding: .5rem .7rem; margin-bottom: .75rem; font-size: .88rem; }
.tn-overlay { position: fixed; inset: 0; background: rgba(20,30,25,.35); display: flex; align-items: center; justify-content: center; padding: 1rem; z-index: 50; }
.tn-modal { background: #fff; border-radius: 14px; width: 100%; max-width: 30rem; max-height: 92vh; overflow: auto; }
.tn-modal-head { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.1rem; border-bottom: 1px solid #eef0ec; }
.tn-modal-head h3 { margin: 0; font-size: 1rem; }
.tn-modal-head button { border: none; background: none; font-size: 1rem; cursor: pointer; color: #7a857f; }
.tn-modal-body { padding: 1.1rem; }
.tn-modal-foot { display: flex; justify-content: flex-end; gap: .5rem; margin-top: 1rem; }
.tn-lbl { display: block; font-size: .78rem; color: #46514d; margin: .6rem 0 .2rem; font-weight: 600; }
.tn-inp { width: 100%; box-sizing: border-box; border: 1px solid #d9ddd7; border-radius: 8px; padding: .5rem; font-size: .9rem; }
.tn-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: .6rem; }
.tn-sel { display: flex; justify-content: space-between; align-items: center; border: 1px solid #0E7C6B; background: #eafaf6; border-radius: 8px; padding: .5rem .7rem; }
.tn-sel button { border: none; background: none; cursor: pointer; color: #0E7C6B; }
.tn-drop { border: 1px solid #e7e9e4; border-radius: 8px; margin-top: .3rem; overflow: hidden; }
.tn-opt { display: block; width: 100%; text-align: left; padding: .5rem .7rem; border: none; background: #fff; cursor: pointer; font-size: .9rem; }
.tn-opt:hover { background: #f3f7f5; }
.tn-muted { color: #9aa39e; cursor: default; }
@media (max-width: 640px) { .tn-summary { grid-template-columns: repeat(2, 1fr); } }
`;

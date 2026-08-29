// apps/web/src/pages/TurnosPage.tsx
// Agenda diaria (turnero) — vista operativa de mostrador.
// Requiere que App.tsx registre la sesión: configurarSesionTurnos(sesion).
import { useEffect, useMemo, useState } from 'react';
import {
  listarTurnos, crearTurno, confirmarTurno, reprogramarTurno,
  cancelarTurno, atenderTurno, buscarAnimales, contarTurnosPorDia,
  listarEspecies, listarDuenos, listarProfesionales, crearPacienteRapido,
  type Turno, type EstadoTurno, type AnimalOpcion,
  type EspecieOpcion, type DuenoOpcion, type Profesional,
} from '../api/turnos';
import { ExportBar } from '../components/ExportBar';

// ── Config visual ────────────────────────────────────────────────────────────
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
// Máquina de estados: qué acciones ofrece cada estado.
const ACCIONES: Record<EstadoTurno, Array<['confirmar' | 'atender' | 'reprogramar' | 'cancelar', string]>> = {
  solicitado:   [['confirmar', 'solid'], ['reprogramar', ''], ['cancelar', 'danger']],
  confirmado:   [['atender', 'solid'], ['reprogramar', ''], ['cancelar', 'danger']],
  reprogramado: [['confirmar', 'solid'], ['atender', ''], ['cancelar', 'danger']],
  atendido:     [],
  cancelado:    [],
};
const LABEL: Record<string, string> = {
  confirmar: 'Confirmar', atender: 'Atender', reprogramar: 'Reprogramar', cancelar: 'Cancelar',
};

// ── Helpers de fecha ──────────────────────────────────────────────────────────
const iso = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const primerDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const pad2 = (n: number) => String(n).padStart(2, '0');
const fechaLarga = (d: Date) =>
  d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });

type Modal =
  | { tipo: 'reprogramar'; turno: Turno }
  | { tipo: 'cancelar'; turno: Turno }
  | { tipo: 'nuevo' }
  | null;

interface Props {
  /** Se llama al atender un turno; usalo para abrir "Nueva consulta" del paciente. */
  onAtender?: (turno: Turno) => void;
  /** Id del profesional logueado (para el filtro "Mis turnos"). */
  miVeterinarioId?: string;
  /** Arranca con el filtro "Mis turnos" activo (para el rol veterinario). */
  soloMiosInicial?: boolean;
}

export default function TurnosPage({ onAtender, miVeterinarioId, soloMiosInicial = false }: Props) {
  const [fecha, setFecha] = useState<Date>(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; });
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<'todos' | EstadoTurno>('todos');
  const [soloMios, setSoloMios] = useState<boolean>(soloMiosInicial);
  const [modal, setModal] = useState<Modal>(null);
  const [ocupado, setOcupado] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // Calendario del mes: mes visible + conteo de turnos por día.
  const [mesView, setMesView] = useState<Date>(() => primerDia(new Date()));
  const [mesCounts, setMesCounts] = useState<Record<string, number>>({});

  async function cargar() {
    setCargando(true); setError(null);
    try { setTurnos(await listarTurnos(iso(fecha))); }
    catch (e: any) { setError(e.message ?? 'No se pudieron cargar los turnos'); }
    finally { setCargando(false); }
  }
  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [fecha]);

  // Al cambiar de día (flechas, "Hoy", input) el calendario sigue al mes del día.
  useEffect(() => { setMesView(primerDia(fecha)); }, [fecha]);

  async function cargarMes(mv: Date) {
    const anio = mv.getFullYear(); const mes = mv.getMonth();
    const finDia = new Date(anio, mes + 1, 0).getDate();
    const desde = `${anio}-${pad2(mes + 1)}-01T00:00:00`;
    const hasta = `${anio}-${pad2(mes + 1)}-${pad2(finDia)}T23:59:59`;
    try { setMesCounts(await contarTurnosPorDia(desde, hasta)); } catch { setMesCounts({}); }
  }
  useEffect(() => { cargarMes(mesView); /* eslint-disable-next-line */ }, [mesView]);

  function avisar(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2600); }

  async function correr(fn: () => Promise<any>, msg?: string) {
    if (ocupado) return;
    setOcupado(true);
    try { await fn(); await cargar(); await cargarMes(mesView); if (msg) avisar(msg); }
    catch (e: any) { avisar(e.message ?? 'Ocurrió un error'); }
    finally { setOcupado(false); }
  }

  function onAccion(t: Turno, a: string) {
    if (a === 'confirmar') correr(() => confirmarTurno(t.id), `Turno de ${t.paciente} confirmado`);
    else if (a === 'atender') correr(async () => { await atenderTurno(t.id); onAtender?.(t); }, `${t.paciente} atendido`);
    else if (a === 'cancelar') setModal({ tipo: 'cancelar', turno: t });
    else if (a === 'reprogramar') setModal({ tipo: 'reprogramar', turno: t });
  }

  const delDia = useMemo(() => {
    let list = turnos;
    if (soloMios && miVeterinarioId) list = list.filter(t => t.veterinarioId === miVeterinarioId);
    if (filtro !== 'todos') list = list.filter(t => t.estado === filtro);
    return list;
  }, [turnos, filtro, soloMios, miVeterinarioId]);
  const cuenta = (e: EstadoTurno) => turnos.filter(t => t.estado === e).length;

  return (
    <div className="hu-agenda">
      <style>{CSS}</style>

      {/* Cabecera: controles (izq) + calendario del mes (der) */}
      <div className="hu-header2">
        <div className="hu-hcol">
          <div className="hu-daterow">
            <button className="hu-nav" onClick={() => setFecha(addDays(fecha, -1))} aria-label="Día anterior">‹</button>
            <div className="hu-datelabel">{fechaLarga(fecha)}</div>
            <button className="hu-nav" onClick={() => setFecha(addDays(fecha, 1))} aria-label="Día siguiente">›</button>
            <button className="hu-btn ghost" onClick={() => { const d = new Date(); d.setHours(0, 0, 0, 0); setFecha(d); }}>Hoy</button>
          </div>
          <input
            type="date"
            value={iso(fecha)}
            onChange={e => e.target.value && setFecha(new Date(e.target.value + 'T00:00:00'))}
          />
          <button className="hu-btn primary" data-tour="turnos-nuevo" onClick={() => setModal({ tipo: 'nuevo' })}>＋ Nuevo turno</button>

          {/* Contadores del día */}
          <div className="hu-summary">
            <div className="hu-stat"><b>{turnos.length}</b><span>turnos</span></div>
            <div className="hu-stat"><b style={{ color: ESTADOS.solicitado.color }}>{cuenta('solicitado')}</b><span>a confirmar</span></div>
            <div className="hu-stat"><b style={{ color: ESTADOS.confirmado.color }}>{cuenta('confirmado') + cuenta('reprogramado')}</b><span>en agenda</span></div>
            <div className="hu-stat"><b style={{ color: ESTADOS.atendido.color }}>{cuenta('atendido')}</b><span>atendidos</span></div>
          </div>
        </div>

        <MesCalendario
          mesView={mesView}
          selected={fecha}
          counts={mesCounts}
          onMes={setMesView}
          onPick={(d) => { d.setHours(0, 0, 0, 0); setFecha(d); }}
        />
      </div>

      {/* Filtros */}
      <div className="hu-filters">
        {miVeterinarioId && (
          <div className={`hu-chip ${soloMios ? 'active' : ''}`} onClick={() => setSoloMios(v => !v)}>
            {soloMios ? '★ Mis turnos' : 'Mis turnos'}
          </div>
        )}
        {([['todos', 'Todos'], ['solicitado', 'Solicitados'], ['confirmado', 'Confirmados'],
          ['reprogramado', 'Reprogramados'], ['atendido', 'Atendidos'], ['cancelado', 'Cancelados']] as const)
          .map(([k, l]) => (
            <div key={k} className={`hu-chip ${filtro === k ? 'active' : ''}`} onClick={() => setFiltro(k as any)}>{l}</div>
          ))}
      </div>

      {/* Lista */}
      {!cargando && delDia.length > 0 && (
        <ExportBar
          nombreArchivo={`turnos-${iso(fecha)}`}
          titulo={`Turnos — ${fechaLarga(fecha)}`}
          columnas={[
            { clave: 'hora', etiqueta: 'Hora' },
            { clave: 'paciente', etiqueta: 'Paciente' },
            { clave: 'dueno', etiqueta: 'Dueño' },
            { clave: 'estado', etiqueta: 'Estado', valor: (t: Turno) => ESTADOS[t.estado]?.label ?? t.estado },
            { clave: 'motivo', etiqueta: 'Motivo' },
          ]}
          filas={delDia}
        />
      )}
      {cargando ? (
        <div className="hu-empty">Cargando agenda…</div>
      ) : error ? (
        <div className="hu-empty hu-error">{error}</div>
      ) : delDia.length === 0 ? (
        <div className="hu-empty">No hay turnos para este día{filtro !== 'todos' ? ' con ese filtro' : ''}.</div>
      ) : (
        <div className="hu-list">
          {delDia.map(t => (
            <TurnoCard key={t.id} t={t} disabled={ocupado} onAccion={onAccion} />
          ))}
        </div>
      )}

      {/* Modales */}
      {modal?.tipo === 'reprogramar' && (
        <ModalReprogramar turno={modal.turno} onClose={() => setModal(null)}
          onOk={(f, h) => {
            const turno = modal.turno; setModal(null);
            correr(() => reprogramarTurno(turno.id, { fecha: f, hora: h }), 'Turno reprogramado');
            setFecha(new Date(f + 'T00:00:00'));
          }} />
      )}
      {modal?.tipo === 'cancelar' && (
        <ModalCancelar turno={modal.turno} onClose={() => setModal(null)}
          onOk={(motivo) => {
            const turno = modal.turno; setModal(null);
            correr(() => cancelarTurno(turno.id, motivo), 'Turno cancelado');
          }} />
      )}
      {modal?.tipo === 'nuevo' && (
        <ModalNuevo fechaDefault={iso(fecha)} onClose={() => setModal(null)}
          onOk={(data) => {
            setModal(null);
            correr(() => crearTurno(data), 'Turno creado');
            setFecha(new Date(data.fecha + 'T00:00:00'));
          }} />
      )}

      {toast && <div className="hu-toast">{toast}</div>}
    </div>
  );
}

// ── Calendario del mes ────────────────────────────────────────────────────────
function MesCalendario({ mesView, selected, counts, onMes, onPick }: {
  mesView: Date; selected: Date; counts: Record<string, number>;
  onMes: (d: Date) => void; onPick: (d: Date) => void;
}) {
  const anio = mesView.getFullYear();
  const mes = mesView.getMonth();
  const primero = new Date(anio, mes, 1);
  const offset = (primero.getDay() + 6) % 7; // semana arranca lunes
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();
  const hoyISO = iso(new Date());
  const selISO = iso(selected);
  const dISO = (d: number) => iso(new Date(anio, mes, d));

  const celdas: (number | null)[] = [];
  for (let i = 0; i < offset; i++) celdas.push(null);
  for (let d = 1; d <= diasEnMes; d++) celdas.push(d);

  const titulo = mesView.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

  return (
    <div className="hu-cal">
      <div className="hu-calhead">
        <button className="hu-nav" onClick={() => onMes(addMonths(mesView, -1))} aria-label="Mes anterior">‹</button>
        <span className="hu-calmes">{titulo}</span>
        <button className="hu-nav" onClick={() => onMes(addMonths(mesView, 1))} aria-label="Mes siguiente">›</button>
      </div>
      <div className="hu-caldow">
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((x, i) => <span key={i}>{x}</span>)}
      </div>
      <div className="hu-calgrid">
        {celdas.map((d, i) => {
          if (d === null) return <span key={i} className="hu-calempty" />;
          const isoD = dISO(d);
          const n = counts[isoD] ?? 0;
          const cls = `hu-calday${isoD === selISO ? ' sel' : ''}${isoD === hoyISO ? ' hoy' : ''}`;
          return (
            <button key={i} className={cls} onClick={() => onPick(new Date(anio, mes, d))}
              title={n > 0 ? `${n} turno${n > 1 ? 's' : ''}` : undefined}>
              <span>{d}</span>
              {n > 0 && <i className="hu-caldot" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Card de turno ─────────────────────────────────────────────────────────────
function TurnoCard({ t, disabled, onAccion }: {
  t: Turno; disabled: boolean; onAccion: (t: Turno, a: string) => void;
}) {
  const est = ESTADOS[t.estado];
  return (
    <div className="hu-turno">
      <div className="hu-thora">{t.hora}</div>
      <div className="hu-tmain">
        <div className="hu-tpac">
          {ESPECIES[t.especie] || '🐾'} {t.paciente}
          {t.dueno && t.dueno !== '—' ? <span className="hu-tdueno"> · {t.dueno}</span> : null}
        </div>
        <div className="hu-tmeta">
          {t.motivo || 'Consulta'}{t.canal ? ` · ${t.canal}` : ''}
        </div>
      </div>
      <span className="hu-badge" style={{ color: est.color, background: est.color + '1a' }}>{est.label}</span>
      <div className="hu-tacts">
        {ACCIONES[t.estado].map(([a, variante]) => (
          <button
            key={a}
            className={`hu-act ${variante}`}
            disabled={disabled}
            onClick={() => onAccion(t, a)}
          >
            {LABEL[a]}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Modal: reprogramar ────────────────────────────────────────────────────────
function ModalReprogramar({ turno, onClose, onOk }: {
  turno: Turno; onClose: () => void; onOk: (f: string, h: string) => void;
}) {
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

// ── Modal: cancelar ───────────────────────────────────────────────────────────
function ModalCancelar({ turno, onClose, onOk }: {
  turno: Turno; onClose: () => void; onOk: (motivo: string) => void;
}) {
  const [m, setM] = useState('');
  return (
    <Overlay onClose={onClose}>
      <h2>¿Cancelar turno?</h2>
      <p className="hu-sub">{turno.paciente} · {turno.hora} · {turno.dueno}</p>
      <Field label="Motivo (opcional)">
        <input type="text" value={m} onChange={e => setM(e.target.value)} placeholder="Ej: el dueño no puede asistir" />
      </Field>
      <div className="hu-mactions">
        <button className="hu-btn ghost" onClick={onClose}>Volver</button>
        <button className="hu-btn" style={{ background: '#C0492F', color: '#fff' }} onClick={() => onOk(m)}>Sí, cancelar</button>
      </div>
    </Overlay>
  );
}

// ── Modal: nuevo turno (búsqueda + alta de paciente con dueño existente/nuevo) ──
function ModalNuevo({ fechaDefault, onClose, onOk }: {
  fechaDefault: string; onClose: () => void;
  onOk: (d: {
    animalId: string; motivo: string; fecha: string; hora: string;
    veterinarioId?: string; estado?: 'solicitado' | 'confirmado';
    paciente?: string; especie?: string; dueno?: string;
  }) => void;
}) {
  const [q, setQ] = useState('');
  const [ops, setOps] = useState<AnimalOpcion[]>([]);
  const [sel, setSel] = useState<AnimalOpcion | null>(null);
  const [motivo, setMotivo] = useState('');
  const [fecha, setFecha] = useState(fechaDefault);
  const [hora, setHora] = useState('10:00');

  // Catálogos
  const [especies, setEspecies] = useState<EspecieOpcion[]>([]);
  const [duenos, setDuenos] = useState<DuenoOpcion[]>([]);
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [profError, setProfError] = useState<string | null>(null);
  const [veterinarioId, setVeterinarioId] = useState('');

  // Alta inline de paciente
  const [modoCrear, setModoCrear] = useState(false);
  const [nNombre, setNNombre] = useState('');
  const [nEspecieId, setNEspecieId] = useState('');
  const [duenoSel, setDuenoSel] = useState('');       // '' sin dueño | '__nuevo__' | personaId
  const [dNombre, setDNombre] = useState('');
  const [dApellido, setDApellido] = useState('');
  const [dCelular, setDCelular] = useState('');
  const [dDni, setDDni] = useState('');
  const [creando, setCreando] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    listarEspecies().then(setEspecies).catch(() => setEspecies([]));
    listarDuenos().then(setDuenos).catch(() => setDuenos([]));
    listarProfesionales()
      .then((p) => { setProfesionales(p); setProfError(null); })
      .catch((e) => { setProfesionales([]); setProfError(e?.message ?? 'No se pudo cargar /usuarios'); });
  }, []);

  useEffect(() => {
    if (sel || modoCrear || q.trim().length < 2) { setOps([]); return; }
    let vivo = true;
    const t = setTimeout(async () => {
      try { const r = await buscarAnimales(q.trim()); if (vivo) setOps(r); } catch { /* noop */ }
    }, 250);
    return () => { vivo = false; clearTimeout(t); };
  }, [q, sel, modoCrear]);

  function abrirAlta() { setModoCrear(true); setNNombre(q.trim()); setOps([]); }

  async function crearYUsar() {
    if (!nNombre.trim() || !nEspecieId) { setErr('Nombre y especie del paciente son obligatorios.'); return; }
    if (duenoSel === '__nuevo__' && (!dNombre.trim() || !dApellido.trim())) {
      setErr('Para crear un dueño nuevo, nombre y apellido son obligatorios.'); return;
    }
    setErr(null); setCreando(true);
    try {
      const res = await crearPacienteRapido({
        nombre: nNombre.trim(),
        especieId: nEspecieId,
        personaId: duenoSel && duenoSel !== '__nuevo__' ? duenoSel : undefined,
        duenoNuevo: duenoSel === '__nuevo__'
          ? { nombre: dNombre.trim(), apellido: dApellido.trim(), celular: dCelular.trim() || undefined, dni: dDni.trim() || undefined }
          : undefined,
      });
      // Resolvemos los nombres para mostrar con los catálogos ya cargados en el modal.
      const especieNombre = especies.find(e => e.id === nEspecieId)?.nombre ?? '';
      const duenoNombre =
        res.duenoNombre ??
        (res.personaId ? duenos.find(d => d.id === res.personaId)?.nombre ?? '' : '');
      setSel({ id: res.id, nombre: res.nombre, especie: especieNombre, dueno: duenoNombre });
      setModoCrear(false);
    } catch (e: any) {
      setErr(e.message ?? 'No se pudo crear el paciente');
    } finally {
      setCreando(false);
    }
  }

  return (
    <Overlay onClose={onClose}>
      <h2>Nuevo turno</h2>
      <p className="hu-sub">Alta desde mostrador (queda confirmado)</p>

      <Field label="Paciente">
        {sel ? (
          <div className="hu-selected">
            <span>{ESPECIES[sel.especie] || '🐾'} {sel.nombre}{sel.dueno ? ` · ${sel.dueno}` : ''}</span>
            <button onClick={() => { setSel(null); setQ(''); setModoCrear(false); }}>cambiar</button>
          </div>
        ) : modoCrear ? (
          <div className="hu-altapaciente">
            <div className="hu-row2">
              <Field label="Nombre del paciente">
                <input type="text" value={nNombre} onChange={e => setNNombre(e.target.value)} placeholder="Ej: Frida" />
              </Field>
              <Field label="Especie">
                <select value={nEspecieId} onChange={e => setNEspecieId(e.target.value)}>
                  <option value="">Elegir…</option>
                  {especies.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              </Field>
            </div>

            <Field label="Dueño">
              <select value={duenoSel} onChange={e => setDuenoSel(e.target.value)}>
                <option value="">Sin dueño</option>
                <option value="__nuevo__">＋ Crear dueño nuevo…</option>
                {duenos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
              </select>
            </Field>

            {duenoSel === '__nuevo__' && (
              <>
                <div className="hu-row2">
                  <Field label="Nombre"><input type="text" value={dNombre} onChange={e => setDNombre(e.target.value)} /></Field>
                  <Field label="Apellido"><input type="text" value={dApellido} onChange={e => setDApellido(e.target.value)} /></Field>
                </div>
                <div className="hu-row2">
                  <Field label="Celular"><input type="text" value={dCelular} onChange={e => setDCelular(e.target.value)} placeholder="Opcional" /></Field>
                  <Field label="DNI"><input type="text" value={dDni} onChange={e => setDDni(e.target.value)} placeholder="Opcional" /></Field>
                </div>
              </>
            )}

            {err && <div className="hu-err">{err}</div>}
            <div className="hu-mactions">
              <button className="hu-btn ghost" onClick={() => setModoCrear(false)} disabled={creando}>Volver a buscar</button>
              <button className="hu-btn primary" onClick={crearYUsar} disabled={creando}>
                {creando ? 'Creando…' : 'Crear y usar'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <input type="text" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nombre…" />
            {ops.length > 0 && (
              <div className="hu-suggest">
                {ops.map(o => (
                  <div key={o.id} className="hu-sug" onClick={() => { setSel(o); setOps([]); }}>
                    {ESPECIES[o.especie] || '🐾'} <b>{o.nombre}</b>{o.dueno ? ` · ${o.dueno}` : ''}
                  </div>
                ))}
              </div>
            )}
            {q.trim().length >= 2 && ops.length === 0 && (
              <button className="hu-btn ghost" style={{ marginTop: 6 }} onClick={abrirAlta}>
                ＋ No aparece: crear paciente nuevo
              </button>
            )}
          </>
        )}
      </Field>

      <Field label="Profesional">
        <select value={veterinarioId} onChange={e => setVeterinarioId(e.target.value)} disabled={!profesionales.length}>
          <option value="">{profesionales.length ? 'Sin asignar' : 'No hay profesionales'}</option>
          {profesionales.map(p => <option key={p.id} value={p.id}>{p.nombre} · {p.rol}</option>)}
        </select>
        {!profesionales.length && (
          <div className="hu-err">
            {profError
              ? `No se pudieron cargar los profesionales: ${profError}. Verificá que GET /usuarios exista (registrar UsuariosModule en app.module.ts).`
              : 'No hay veterinarios en esta clínica. Agregá un miembro con rol Veterinario desde Administración.'}
          </div>
        )}
      </Field>

      <Field label="Motivo">
        <input type="text" value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Motivo de la consulta" />
      </Field>
      <div className="hu-row2">
        <Field label="Fecha"><input type="date" value={fecha} onChange={e => setFecha(e.target.value)} /></Field>
        <Field label="Hora"><input type="time" value={hora} onChange={e => setHora(e.target.value)} /></Field>
      </div>

      <div className="hu-mactions">
        <button className="hu-btn ghost" onClick={onClose}>Cancelar</button>
        <button className="hu-btn primary" disabled={!sel}
          onClick={() => sel && onOk({
            animalId: sel.id, motivo: motivo || 'Consulta', fecha, hora,
            veterinarioId: veterinarioId || undefined, estado: 'confirmado',
            paciente: sel.nombre, especie: sel.especie, dueno: sel.dueno,
          })}>
          Crear turno
        </button>
      </div>
    </Overlay>
  );
}

// ── Piezas compartidas ────────────────────────────────────────────────────────
function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="hu-overlay" onClick={onClose}>
      <div className="hu-modal" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="hu-field">
      <span>{label}</span>
      {children}
    </div>
  );
}

// ── Estilos (CSS propio, autocontenido) ───────────────────────────────────────
const CSS = `
.hu-agenda { --hu-teal:#0E7C6B; --hu-teal-d:#0a5f52; --hu-bg:#f6f8f7; --hu-card:#fff;
  --hu-border:#e2e8e5; --hu-text:#1f2a27; --hu-muted:#6b7c77;
  max-width: 860px; margin: 0 auto; padding: 8px 4px 48px; color: var(--hu-text); }

.hu-agenda h2 { margin: 0 0 2px; font-size: 1.15rem; }

/* Cabecera en dos columnas */
.hu-header2 { display:grid; grid-template-columns:1fr auto; gap:20px; align-items:start; margin-bottom:16px; }
.hu-hcol { display:flex; flex-direction:column; gap:10px; max-width:420px; }
.hu-daterow { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.hu-hcol input[type=date] { padding:.5rem .6rem; border:1px solid var(--hu-border);
  border-radius:8px; background:#fff; color:var(--hu-text); width:100%; }
.hu-hcol .hu-btn.primary { align-self:flex-start; }
.hu-nav { width:34px; height:34px; border-radius:8px; border:1px solid var(--hu-border);
  background:#fff; font-size:1.2rem; line-height:1; cursor:pointer; color:var(--hu-text); flex:0 0 auto; }
.hu-nav:hover { background:#f0f3f2; }
.hu-datelabel { font-weight:600; text-transform:capitalize; min-width:150px; }

/* Calendario del mes */
.hu-cal { background:var(--hu-card); border:1px solid var(--hu-border); border-radius:12px;
  padding:10px 12px; width:288px; }
.hu-calhead { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
.hu-calmes { font-weight:600; text-transform:capitalize; font-size:.95rem; }
.hu-caldow { display:grid; grid-template-columns:repeat(7,1fr); gap:2px; margin-bottom:4px; }
.hu-caldow span { text-align:center; font-size:.7rem; color:var(--hu-muted); font-weight:700; }
.hu-calgrid { display:grid; grid-template-columns:repeat(7,1fr); gap:2px; }
.hu-calempty { aspect-ratio:1; }
.hu-calday { position:relative; aspect-ratio:1; display:flex; align-items:center; justify-content:center;
  border:1px solid transparent; border-radius:8px; background:none; cursor:pointer;
  font-size:.85rem; color:var(--hu-text); padding:0; }
.hu-calday:hover { background:#f0f3f2; }
.hu-calday.hoy { border-color:var(--hu-teal); color:var(--hu-teal); font-weight:700; }
.hu-calday.sel { background:var(--hu-teal); color:#fff; font-weight:700; }
.hu-calday.sel.hoy { border-color:#fff; }
.hu-caldot { position:absolute; bottom:5px; width:5px; height:5px; border-radius:50%; background:var(--hu-teal); }
.hu-calday.sel .hu-caldot { background:#fff; }

/* Botones */
.hu-btn { padding:.5rem .95rem; font-size:.9rem; font-weight:600; border-radius:8px;
  border:1px solid transparent; cursor:pointer; }
.hu-btn.primary { background:var(--hu-teal); color:#fff; }
.hu-btn.primary:hover { background:var(--hu-teal-d); }
.hu-btn.primary:disabled { opacity:.5; cursor:default; }
.hu-btn.ghost { background:#fff; border-color:var(--hu-border); color:var(--hu-text); }
.hu-btn.ghost:hover { background:#f0f3f2; }

/* Resumen (dentro de la columna izquierda, 2x2) */
.hu-summary { display:grid; grid-template-columns:repeat(2,1fr); gap:10px; }
.hu-hcol .hu-summary { flex:1 1 auto; }
.hu-stat { background:var(--hu-card); border:1px solid var(--hu-border); border-radius:10px;
  padding:12px 14px; display:flex; flex-direction:column; justify-content:center; gap:2px; }
.hu-stat b { font-size:1.6rem; line-height:1; }
.hu-stat span { font-size:.75rem; color:var(--hu-muted); text-transform:uppercase; letter-spacing:.03em; }

/* Filtros */
.hu-filters { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:14px; }
.hu-chip { padding:.35rem .7rem; border-radius:999px; border:1px solid var(--hu-border);
  background:#fff; font-size:.82rem; color:var(--hu-muted); cursor:pointer; user-select:none; }
.hu-chip:hover { background:#f0f3f2; }
.hu-chip.active { background:var(--hu-teal); border-color:var(--hu-teal); color:#fff; }

/* Lista */
.hu-list { display:flex; flex-direction:column; gap:8px; }
.hu-turno { display:flex; align-items:center; gap:12px; background:var(--hu-card);
  border:1px solid var(--hu-border); border-radius:10px; padding:10px 14px; }
.hu-thora { font-variant-numeric:tabular-nums; font-weight:700; font-size:1rem; width:46px; color:var(--hu-teal); }
.hu-tmain { flex:1 1 auto; min-width:0; }
.hu-tpac { font-weight:600; }
.hu-tdueno { color:var(--hu-muted); font-weight:400; }
.hu-tmeta { font-size:.82rem; color:var(--hu-muted); margin-top:2px;
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.hu-badge { font-size:.72rem; font-weight:700; padding:.2rem .55rem; border-radius:999px; white-space:nowrap; }
.hu-tacts { display:flex; gap:6px; flex-wrap:wrap; }
.hu-act { font-size:.8rem; font-weight:600; padding:.35rem .6rem; border-radius:7px;
  border:1px solid var(--hu-border); background:#fff; color:var(--hu-text); cursor:pointer; }
.hu-act:hover { background:#f0f3f2; }
.hu-act.solid { background:var(--hu-teal); border-color:var(--hu-teal); color:#fff; }
.hu-act.solid:hover { background:var(--hu-teal-d); }
.hu-act.danger { color:#C0492F; border-color:#e7c4bc; }
.hu-act.danger:hover { background:#fbeeeb; }
.hu-act:disabled { opacity:.5; cursor:default; }

/* Vacío / error */
.hu-empty { text-align:center; color:var(--hu-muted); background:var(--hu-card);
  border:1px dashed var(--hu-border); border-radius:10px; padding:32px 16px; }
.hu-error { color:#C0492F; border-color:#e7c4bc; }

/* Overlay + modal */
.hu-overlay { position:fixed; inset:0; background:rgba(15,25,22,.45);
  display:flex; align-items:flex-start; justify-content:center; padding:6vh 16px; z-index:50; }
.hu-modal { background:#fff; border-radius:14px; padding:20px; width:100%; max-width:460px;
  box-shadow:0 20px 50px rgba(0,0,0,.25); max-height:88vh; overflow:auto; }
.hu-modal h2 { margin:0 0 2px; }
.hu-sub { color:var(--hu-muted); font-size:.85rem; margin:0 0 12px; }

/* Campos */
.hu-field { display:block; font-size:.8rem; color:var(--hu-muted); margin-bottom:12px; }
.hu-field > span { display:block; margin-bottom:4px; }
.hu-field input, .hu-field select { display:block; width:100%; padding:.55rem .65rem; font-size:.95rem;
  color:var(--hu-text); background:#fff; border:1px solid var(--hu-border); border-radius:8px; }
.hu-field input:focus, .hu-field select:focus { outline:none; border-color:var(--hu-teal);
  box-shadow:0 0 0 3px rgba(14,124,107,.15); }
.hu-row2 { display:grid; grid-template-columns:1fr 1fr; gap:0 10px; }
.hu-mactions { display:flex; justify-content:flex-end; gap:8px; margin-top:6px; }

/* Selección de paciente */
.hu-selected { display:flex; align-items:center; justify-content:space-between; gap:8px;
  background:#f0f3f2; border:1px solid var(--hu-border); border-radius:8px; padding:.5rem .65rem; }
.hu-selected button { background:none; border:none; color:var(--hu-teal); font-weight:600; cursor:pointer; }
.hu-suggest { border:1px solid var(--hu-border); border-radius:8px; margin-top:6px; overflow:hidden; }
.hu-sug { padding:.5rem .65rem; cursor:pointer; font-size:.9rem; }
.hu-sug:hover { background:#f0f3f2; }
.hu-altapaciente { border:1px dashed var(--hu-border); border-radius:10px; padding:10px; margin-top:4px; }
.hu-err { color:#C0492F; font-size:.85rem; margin:4px 0 8px; }

/* Toast */
.hu-toast { position:fixed; bottom:24px; left:50%; transform:translateX(-50%);
  background:#1f2a27; color:#fff; padding:.6rem 1rem; border-radius:10px; font-size:.9rem;
  box-shadow:0 10px 30px rgba(0,0,0,.3); z-index:60; }

@media (max-width:720px) {
  .hu-header2 { grid-template-columns:1fr; }
  .hu-hcol { max-width:none; }
  .hu-cal { width:100%; }
}
@media (max-width:560px) {
  .hu-summary { grid-template-columns:repeat(2,1fr); }
  .hu-turno { flex-wrap:wrap; }
  .hu-tacts { width:100%; }
}
`;

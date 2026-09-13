// apps/web/src/pages/TurnosPage.tsx
// Agenda diaria (turnero) — vista operativa de mostrador.
// Requiere que App.tsx registre la sesión: configurarSesionTurnos(sesion).
import { useEffect, useMemo, useState } from 'react';
import {
  listarTurnos, crearTurno, confirmarTurno, reprogramarTurno,
  cancelarTurno, atenderTurno, buscarAnimales, contarTurnosPorDia,
  listarEspecies, listarDuenos, listarAgendas, slotsDisponibles, crearPacienteRapido,
  registrarEvento,
  type Turno, type EstadoTurno, type AnimalOpcion,
  type EspecieOpcion, type DuenoOpcion, type Agenda, type Slot,
} from '../api/turnos';
import { Overlay, Field } from './turnos/ui';

// ── Config visual ────────────────────────────────────────────────────────────
// Mismas 8 especies sembradas en core.especies (seed-especies.mjs) — antes
// faltaban Porcino/Ovino/Caprino acá (caían al genérico 🐾 sin importar la
// especie real) y sobraba "Conejo", que no existe como especie del sistema.
const ESPECIES: Record<string, string> = {
  Canino: '🐕', Felino: '🐈', Equino: '🐎', Bovino: '🐄', Ave: '🦜',
  Porcino: '🐖', Ovino: '🐑', Caprino: '🐐',
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
const fechaCorta = (d: Date) => d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });

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
  // null = un solo día (fecha). Con valor = rango [fecha, fechaHasta] completo.
  const [fechaHasta, setFechaHasta] = useState<Date | null>(null);
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
    try { setTurnos(await listarTurnos(iso(fecha), fechaHasta ? iso(fechaHasta) : undefined)); }
    catch (e: any) { setError(e.message ?? 'No se pudieron cargar los turnos'); }
    finally { setCargando(false); }
  }
  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [fecha, fechaHasta]);

  // Al cambiar de día (flechas, "Hoy", input) el calendario sigue al mes del día.
  useEffect(() => { setMesView(primerDia(fecha)); }, [fecha]);

  /** Navegar por día (flechas/Hoy/calendario) siempre vuelve a un solo día — el rango es una elección explícita con "hasta". */
  function irADia(d: Date) {
    d.setHours(0, 0, 0, 0);
    setFecha(d);
    setFechaHasta(null);
  }

  async function cargarMes(mv: Date) {
    const anio = mv.getFullYear(); const mes = mv.getMonth();
    const finDia = new Date(anio, mes + 1, 0).getDate();
    const desde = `${anio}-${pad2(mes + 1)}-01T00:00:00`;
    const hasta = `${anio}-${pad2(mes + 1)}-${pad2(finDia)}T23:59:59`;
    try { setMesCounts(await contarTurnosPorDia(desde, hasta)); } catch { setMesCounts({}); }
  }
  useEffect(() => { cargarMes(mesView); /* eslint-disable-next-line */ }, [mesView]);

  function avisar(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2600); }

  async function correr(fn: () => Promise<any>, msg?: string, nombreEvento?: string) {
    if (ocupado) return;
    setOcupado(true);
    try {
      await fn();
      if (nombreEvento) registrarEvento('accion', nombreEvento);
      await cargar(); await cargarMes(mesView); if (msg) avisar(msg);
    }
    catch (e: any) { avisar(e.message ?? 'Ocurrió un error'); }
    finally { setOcupado(false); }
  }

  function onAccion(t: Turno, a: string) {
    if (a === 'confirmar') correr(() => confirmarTurno(t.id), `Turno de ${t.paciente} confirmado`, 'turno-confirmar');
    else if (a === 'atender') correr(
      // Se avisa a App.tsx para que abra la ficha con "Nueva consulta",
      // salvo que el turno tenga una agenda asignada SIN profesional
      // (agenda "no médica", ej. peluquería) — un turno sin ninguna agenda
      // (el caso más común históricamente) sigue abriendo la consulta como
      // siempre, la ausencia de agenda no implica "no médica".
      async () => {
        await atenderTurno(t.id);
        const esAgendaNoMedica = !!t.agendaId && !t.agendaUsuarioId;
        if (!esAgendaNoMedica) onAtender?.(t);
      },
      `${t.paciente} atendido`,
      'turno-atender',
    );
    else if (a === 'cancelar') setModal({ tipo: 'cancelar', turno: t });
    else if (a === 'reprogramar') setModal({ tipo: 'reprogramar', turno: t });
  }

  const delDia = useMemo(() => {
    let list = turnos;
    if (soloMios && miVeterinarioId) list = list.filter(t => t.agendaUsuarioId === miVeterinarioId);
    if (filtro !== 'todos') list = list.filter(t => t.estado === filtro);
    return list;
  }, [turnos, filtro, soloMios, miVeterinarioId]);
  const cuenta = (e: EstadoTurno) => turnos.filter(t => t.estado === e).length;

  return (
    <div className="hu-agenda">
      <style>{CSS}</style>

      <div className="hu-layout">
        {/* Columna principal (¾) */}
        <div className="hu-col-main">
          {/* Filtros de fecha */}
          <div className="hu-card-block">
            <div className="hu-daterow">
              <button className="hu-nav" onClick={() => irADia(addDays(fecha, -1))} aria-label="Día anterior">‹</button>
              <div className="hu-datelabel">
                {fechaHasta ? `${fechaCorta(fecha)} – ${fechaCorta(fechaHasta)}` : fechaLarga(fecha)}
              </div>
              <button className="hu-nav" onClick={() => irADia(addDays(fecha, 1))} aria-label="Día siguiente">›</button>
              <button className="hu-btn ghost" onClick={() => irADia(new Date())}>Hoy</button>
              <div className="hu-rango">
                <input
                  type="date"
                  value={iso(fecha)}
                  onChange={e => {
                    if (!e.target.value) return;
                    const nueva = new Date(e.target.value + 'T00:00:00');
                    setFecha(nueva);
                    if (fechaHasta && fechaHasta < nueva) setFechaHasta(null);
                  }}
                />
                <span className="hu-rango-sep">– hasta (opcional):</span>
                <input
                  type="date"
                  className="hu-hasta"
                  value={fechaHasta ? iso(fechaHasta) : ''}
                  min={iso(fecha)}
                  onChange={e => setFechaHasta(e.target.value ? new Date(e.target.value + 'T00:00:00') : null)}
                />
                {fechaHasta && (
                  <button className="hu-nav" title="Volver a un solo día" onClick={() => setFechaHasta(null)}>×</button>
                )}
              </div>
            </div>
          </div>

          {/* KPIs 2x2 + acciones */}
          <div className="hu-card-block">
            <div className="hu-kpigrid">
              <div className="hu-stat hu-kpi-a"><b>{turnos.length}</b><span>turnos</span></div>
              <div className="hu-stat hu-kpi-b"><b style={{ color: ESTADOS.solicitado.color }}>{cuenta('solicitado')}</b><span>a confirmar</span></div>
              <div className="hu-stat hu-kpi-c"><b style={{ color: ESTADOS.confirmado.color }}>{cuenta('confirmado') + cuenta('reprogramado')}</b><span>en agenda</span></div>
              <div className="hu-stat hu-kpi-d"><b style={{ color: ESTADOS.atendido.color }}>{cuenta('atendido')}</b><span>atendidos</span></div>
              <div className="hu-kpi-actions">
                <button className="hu-btn primary hu-btn-full" data-tour="turnos-nuevo" onClick={() => setModal({ tipo: 'nuevo' })}>＋ Nuevo turno</button>
              </div>
            </div>
          </div>

          {/* Filtros + tabla de turnos */}
          <div className="hu-card-block hu-tablecard">
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

            <div className="hu-tablebody">
              {cargando ? (
                <div className="hu-empty">Cargando agenda…</div>
              ) : error ? (
                <div className="hu-empty hu-error">{error}</div>
              ) : delDia.length === 0 ? (
                <div className="hu-empty">No hay turnos para {fechaHasta ? 'este rango' : 'este día'}{filtro !== 'todos' ? ' con ese filtro' : ''}.</div>
              ) : (
                <div className="hu-list">
                  {delDia.map(t => (
                    <TurnoCard key={t.id} t={t} disabled={ocupado} onAccion={onAccion} mostrarFecha={!!fechaHasta} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Columna accesoria (¼) */}
        <div className="hu-col-side">
          <MesCalendario
            mesView={mesView}
            selected={fecha}
            counts={mesCounts}
            onMes={setMesView}
            onPick={irADia}
          />
          <div className="hu-card-block hu-dispcard">
            <h3 className="hu-disp-titulo">Disponibilidad del día</h3>
            <div className="hu-dispbody">
              <GraficoDisponibilidad fecha={iso(fecha)} />
            </div>
          </div>
        </div>
      </div>

      {/* Modales */}
      {modal?.tipo === 'reprogramar' && (
        <ModalReprogramar turno={modal.turno} onClose={() => setModal(null)}
          onOk={(f, h) => {
            const turno = modal.turno; setModal(null);
            correr(() => reprogramarTurno(turno.id, { fecha: f, hora: h }), 'Turno reprogramado', 'turno-reprogramar');
            irADia(new Date(f + 'T00:00:00'));
          }} />
      )}
      {modal?.tipo === 'cancelar' && (
        <ModalCancelar turno={modal.turno} onClose={() => setModal(null)}
          onOk={(motivo) => {
            const turno = modal.turno; setModal(null);
            correr(() => cancelarTurno(turno.id, motivo), 'Turno cancelado', 'turno-cancelar');
          }} />
      )}
      {modal?.tipo === 'nuevo' && (
        <ModalNuevo fechaDefault={iso(fecha)} onClose={() => setModal(null)}
          onOk={(data) => {
            setModal(null);
            correr(() => crearTurno(data), 'Turno creado', 'turno-crear');
            irADia(new Date(data.fecha + 'T00:00:00'));
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
function TurnoCard({ t, disabled, onAccion, mostrarFecha }: {
  t: Turno; disabled: boolean; onAccion: (t: Turno, a: string) => void; mostrarFecha?: boolean;
}) {
  const est = ESTADOS[t.estado];
  return (
    <div className="hu-turno">
      <div className="hu-thora">
        {mostrarFecha && <span className="hu-tfecha">{fechaCorta(new Date(t.fecha + 'T00:00:00'))}</span>}
        {t.hora}
      </div>
      <div className="hu-tmain">
        <div className="hu-tpac">
          {ESPECIES[t.especie] || '🐾'} {t.paciente}
          {t.dueno && t.dueno !== '—' ? <span className="hu-tdueno"> · {t.dueno}</span> : null}
        </div>
        <div className="hu-tmeta">
          {t.motivo || 'Consulta'}{t.canal ? ` · ${t.canal}` : ''}{t.agendaNombre ? ` · ${t.agendaNombre}` : ''}
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

// ── Disponibilidad del día por agenda (columna accesoria) ─────────────────────
/**
 * Para cada agenda activa, una tira de segmentos (uno por slot del día):
 * verde = disponible, gris = ocupado. Da un pantallazo rápido de qué agendas
 * tienen lugar sin abrir el modal de "Nuevo turno".
 */
function GraficoDisponibilidad({ fecha }: { fecha: string }) {
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [porAgenda, setPorAgenda] = useState<Record<string, Slot[]>>({});
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vivo = true;
    setCargando(true);
    listarAgendas()
      .then(async (ags) => {
        const activas = ags.filter((a) => a.activa);
        const entradas = await Promise.all(
          activas.map(async (a) => [a.id, await slotsDisponibles(a.id, fecha).catch(() => [])] as const),
        );
        if (!vivo) return;
        setAgendas(activas);
        setPorAgenda(Object.fromEntries(entradas));
      })
      .finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, [fecha]);

  if (cargando) return <p className="hu-sub">Cargando…</p>;
  if (agendas.length === 0) return <p className="hu-sub">Todavía no hay agendas configuradas.</p>;

  return (
    <div className="hu-disp">
      <div className="hu-disp-legend">
        <span><i className="hu-disp-dot libre" /> Disponible</span>
        <span><i className="hu-disp-dot ocupado" /> Ocupado</span>
      </div>
      {agendas.map((a) => {
        const slots = porAgenda[a.id] ?? [];
        const ocupados = slots.filter((s) => !s.disponible).length;
        return (
          <div key={a.id} className="hu-disp-fila">
            <div className="hu-disp-nombre">{a.nombre}</div>
            {slots.length === 0 ? (
              <p className="hu-sub" style={{ margin: 0 }}>Sin horario ese día</p>
            ) : (
              <>
                <div className="hu-disp-barra">
                  {slots.map((s) => (
                    <span
                      key={s.hora}
                      className={`hu-disp-seg ${s.disponible ? 'libre' : 'ocupado'}`}
                      title={`${s.hora} — ${s.disponible ? 'disponible' : 'ocupado'}`}
                    />
                  ))}
                </div>
                <div className="hu-disp-caption">{ocupados}/{slots.length} ocupados</div>
              </>
            )}
          </div>
        );
      })}
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
      <Field label="Nueva fecha"><input type="date" value={f} onChange={e => { setF(e.target.value); setH(''); }} /></Field>
      {turno.agendaId ? (
        <SelectorHorarioAgenda agendaId={turno.agendaId} fecha={f} hora={h} onHora={setH} turnoIdActual={turno.id} />
      ) : (
        <Field label="Nueva hora"><input type="time" value={h} onChange={e => setH(e.target.value)} /></Field>
      )}
      <div className="hu-mactions">
        <button className="hu-btn ghost" onClick={onClose}>Cancelar</button>
        <button className="hu-btn primary" disabled={!h} onClick={() => onOk(f, h)}>Reprogramar</button>
      </div>
    </Overlay>
  );
}

/**
 * Grilla de horarios disponibles de una agenda para una fecha dada (slots
 * fijos según la duración configurada de la agenda, deshabilitados si ya
 * están ocupados). `turnoIdActual`: al reprogramar, excluye al propio turno
 * de los horarios "ocupados" (si no, se vería a sí mismo como ocupando su
 * horario actual y no podría re-elegirlo).
 */
function SelectorHorarioAgenda({ agendaId, fecha, hora, onHora, turnoIdActual }: {
  agendaId: string; fecha: string; hora: string; onHora: (h: string) => void; turnoIdActual?: string;
}) {
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!agendaId || !fecha) { setSlots(null); return; }
    let vivo = true;
    setCargando(true);
    slotsDisponibles(agendaId, fecha, turnoIdActual)
      .then((s) => { if (vivo) setSlots(s); })
      .catch(() => { if (vivo) setSlots([]); })
      .finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, [agendaId, fecha, turnoIdActual]);

  return (
    <Field label="Horario">
      {cargando ? (
        <p className="hu-sub">Cargando horarios…</p>
      ) : !slots || slots.length === 0 ? (
        <p className="hu-err">Esta agenda no tiene horarios configurados para ese día.</p>
      ) : (
        <div className="hu-slots">
          {slots.map((s) => (
            <button
              type="button"
              key={s.hora}
              className={`hu-slot${hora === s.hora ? ' sel' : ''}`}
              disabled={!s.disponible}
              onClick={() => onHora(s.hora)}
            >
              {s.hora}
            </button>
          ))}
        </div>
      )}
    </Field>
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
    agendaId?: string; estado?: 'solicitado' | 'confirmado';
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
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [agendaId, setAgendaId] = useState('');

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
    listarAgendas().then(setAgendas).catch(() => setAgendas([]));
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
    // Todo animal identificado en Huella tiene que tener un dueño — no existe
    // el paciente "suelto".
    if (!duenoSel) { setErr('Elegí un dueño para el paciente (o creá uno nuevo).'); return; }
    if (duenoSel === '__nuevo__' && (!dNombre.trim() || !dApellido.trim())) {
      setErr('Para crear un dueño nuevo, nombre y apellido son obligatorios.'); return;
    }
    setErr(null); setCreando(true);
    try {
      const res = await crearPacienteRapido({
        nombre: nNombre.trim(),
        especieId: nEspecieId,
        personaId: duenoSel !== '__nuevo__' ? duenoSel : undefined,
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
              <select value={duenoSel} onChange={e => setDuenoSel(e.target.value)} required>
                <option value="" disabled>Elegí un dueño…</option>
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

      <Field label="Agenda">
        <select value={agendaId} onChange={e => { setAgendaId(e.target.value); setHora(''); }}>
          <option value="">Sin agenda (horario libre)</option>
          {agendas.filter(a => a.activa).map(a => (
            <option key={a.id} value={a.id}>{a.nombre}{a.usuarioNombre ? ` · ${a.usuarioNombre}` : ''}</option>
          ))}
        </select>
        {agendas.length === 0 && (
          <p className="hu-sub">Todavía no hay agendas configuradas — el turno queda con horario libre. Se crean desde "⚙ Agendas".</p>
        )}
      </Field>

      <Field label="Motivo">
        <input type="text" value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Motivo de la consulta" />
      </Field>

      {agendaId ? (
        <>
          <Field label="Fecha"><input type="date" value={fecha} onChange={e => { setFecha(e.target.value); setHora(''); }} /></Field>
          <SelectorHorarioAgenda agendaId={agendaId} fecha={fecha} hora={hora} onHora={setHora} />
        </>
      ) : (
        <div className="hu-row2">
          <Field label="Fecha"><input type="date" value={fecha} onChange={e => setFecha(e.target.value)} /></Field>
          <Field label="Hora"><input type="time" value={hora} onChange={e => setHora(e.target.value)} /></Field>
        </div>
      )}

      <div className="hu-mactions">
        <button className="hu-btn ghost" onClick={onClose}>Cancelar</button>
        <button className="hu-btn primary" disabled={!sel || !hora}
          onClick={() => sel && onOk({
            animalId: sel.id, motivo: motivo || 'Consulta', fecha, hora,
            agendaId: agendaId || undefined, estado: 'confirmado',
            paciente: sel.nombre, especie: sel.especie, dueno: sel.dueno,
          })}>
          Crear turno
        </button>
      </div>
    </Overlay>
  );
}


// ── Estilos (CSS propio, autocontenido) ───────────────────────────────────────
const CSS = `
.hu-agenda { /* Paleta de la solución Huella — kit de marca 2026-09-10 (docs/Kit_Marca_Huella.html). */
  --hu-teal:#0e7c6b; --hu-teal-d:#0a5c4f; --hu-bg:#f6f5f1; --hu-card:#fff;
  --hu-border:#e2dfd6; --hu-text:#1e2a23; --hu-muted:#6c6650;
  width: 100%; color: var(--hu-text);
  flex: 1; min-height: 0; display: flex; flex-direction: column; }

.hu-agenda h2 { margin: 0 0 2px; font-size: 1.15rem; }

/* Layout de contenido: columna principal (¾) + columna accesoria (¼). Las dos
   columnas estiran a la misma altura (la del espacio disponible) y la última
   tarjeta de cada una crece para llegar hasta el borde inferior, aunque su
   contenido no la llene. */
.hu-layout { display:grid; grid-template-columns: 3fr 1fr; gap:16px; align-items:stretch; flex:1; min-height:0; }
.hu-col-main { display:flex; flex-direction:column; gap:16px; min-width:0; min-height:0; }
.hu-col-side { display:flex; flex-direction:column; gap:16px; min-height:0; }
.hu-card-block { background:var(--hu-card); border:1px solid var(--hu-border); border-radius:12px; padding:14px 16px; }
.hu-tablecard { display:flex; flex-direction:column; flex:1; min-height:280px; }
.hu-tablebody { flex:1; min-height:0; overflow-y:auto; }
.hu-dispcard { display:flex; flex-direction:column; flex:1; min-height:220px; }
.hu-dispbody { flex:1; min-height:0; overflow-y:auto; }

/* Filtros de fecha */
.hu-daterow { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.hu-daterow input[type=date] { width:auto; padding:.5rem .6rem; border:1px solid var(--hu-border);
  border-radius:8px; background:#fff; color:var(--hu-text); }
.hu-nav { width:34px; height:34px; border-radius:8px; border:1px solid var(--hu-border);
  background:#fff; font-size:1.2rem; line-height:1; cursor:pointer; color:var(--hu-text); flex:0 0 auto; }
.hu-nav:hover { background:#f0f3f2; }
.hu-datelabel { font-weight:600; text-transform:capitalize; min-width:150px; }
.hu-rango { display:flex; align-items:center; gap:6px; margin-left:auto; }
.hu-rango-sep { color:var(--hu-muted); font-size:.85rem; }
.hu-tfecha { display:block; font-size:.72rem; font-weight:600; color:var(--hu-muted); text-transform:uppercase; }

/* Calendario del mes (ocupa todo el ancho de la columna accesoria) */
.hu-cal { background:var(--hu-card); border:1px solid var(--hu-border); border-radius:12px;
  padding:10px 12px; width:100%; }
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
.hu-btn-full { flex:1; }

/* KPIs 2x2 + columna de acciones (misma tarjeta) */
.hu-kpigrid { display:grid; grid-template-columns:1fr 1fr auto; grid-template-rows:1fr 1fr; gap:10px; }
.hu-kpi-a { grid-column:1; grid-row:1; }
.hu-kpi-b { grid-column:2; grid-row:1; }
.hu-kpi-c { grid-column:1; grid-row:2; }
.hu-kpi-d { grid-column:2; grid-row:2; }
.hu-kpi-actions { grid-column:3; grid-row:1 / 3; display:flex; flex-direction:column; gap:8px;
  justify-content:center; min-width:160px; }
.hu-stat { background:var(--hu-bg); border:1px solid var(--hu-border); border-radius:10px;
  padding:12px 14px; display:flex; flex-direction:column; justify-content:center; gap:2px; }
.hu-stat b { font-size:1.6rem; line-height:1; }
.hu-stat span { font-size:.75rem; color:var(--hu-muted); text-transform:uppercase; letter-spacing:.03em; }

/* Disponibilidad del día por agenda (columna accesoria) */
.hu-disp-titulo { margin:0 0 10px; font-size:.85rem; font-weight:700; }
.hu-disp { display:flex; flex-direction:column; gap:14px; }
.hu-disp-legend { display:flex; gap:12px; font-size:.7rem; color:var(--hu-muted); }
.hu-disp-legend span { display:flex; align-items:center; gap:4px; }
.hu-disp-dot { width:8px; height:8px; border-radius:2px; display:inline-block; }
.hu-disp-dot.libre { background:var(--hu-teal); }
.hu-disp-dot.ocupado { background:#c7cdd0; }
.hu-disp-fila { display:flex; flex-direction:column; gap:4px; }
.hu-disp-nombre { font-size:.8rem; font-weight:600; }
.hu-disp-barra { display:flex; flex-wrap:wrap; gap:2px; }
.hu-disp-seg { width:10px; height:16px; border-radius:3px; background:#c7cdd0; }
.hu-disp-seg.libre { background:var(--hu-teal); }
.hu-disp-caption { font-size:.7rem; color:var(--hu-muted); }

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
.hu-thora { font-variant-numeric:tabular-nums; font-weight:700; font-size:1rem; width:58px; color:var(--hu-teal); }
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
.hu-modal-ancho { max-width:640px; }
.hu-modal h2 { margin:0 0 2px; }
.hu-sub { color:var(--hu-muted); font-size:.85rem; margin:0 0 12px; }
.hu-card { background:#fbfcfb; border:1px solid var(--hu-border); border-radius:10px; padding:12px; }
.hu-check { font-size:.85rem; color:var(--hu-text); }
.hu-check input { width:auto; }

/* Campos */
.hu-field { display:block; font-size:.8rem; color:var(--hu-muted); margin-bottom:12px; }
.hu-field > span { display:block; margin-bottom:4px; }
.hu-field input, .hu-field select { display:block; width:100%; padding:.55rem .65rem; font-size:.95rem;
  color:var(--hu-text); background:#fff; border:1px solid var(--hu-border); border-radius:8px; }
.hu-field input:focus, .hu-field select:focus { outline:none; border-color:var(--hu-teal);
  box-shadow:0 0 0 3px rgba(92,138,78,.15); }
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
.hu-slots { display:flex; flex-wrap:wrap; gap:6px; }
.hu-slot { padding:.4rem .7rem; font-size:.85rem; border:1px solid var(--hu-border); border-radius:8px;
  background:#fff; color:var(--hu-text); cursor:pointer; }
.hu-slot:hover:not(:disabled) { border-color:var(--hu-teal); }
.hu-slot.sel { background:var(--hu-teal); border-color:var(--hu-teal); color:#fff; font-weight:600; }
.hu-slot:disabled { opacity:.35; text-decoration:line-through; cursor:not-allowed; }

/* Toast */
.hu-toast { position:fixed; bottom:24px; left:50%; transform:translateX(-50%);
  background:var(--hu-text); color:#fff; padding:.6rem 1rem; border-radius:10px; font-size:.9rem;
  box-shadow:0 10px 30px rgba(0,0,0,.3); z-index:60; }

@media (max-width:900px) {
  .hu-layout { grid-template-columns:1fr; }
}
@media (max-width:560px) {
  .hu-kpigrid { grid-template-columns:1fr 1fr; grid-template-rows:auto auto auto; }
  .hu-kpi-actions { grid-column:1 / 3; grid-row:3; flex-direction:row; min-width:0; }
  .hu-turno { flex-wrap:wrap; }
  .hu-tacts { width:100%; }
}
`;

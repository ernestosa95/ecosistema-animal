// apps/web/src/pages/RecordatoriosPage.tsx
// Pestaña del personal: a quién contactar por vacunas por vencer/vencidas y
// qué turnos se vienen. El contacto del dueño se resuelve en el cliente
// (el endpoint de recordatorios no lo trae).
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import type {
  Sesion, Animal, Persona, Turno, RecordatorioVacuna,
} from '../api/types';

interface Props {
  sesion: Sesion;
  /** Abrir la ficha del paciente (para registrar la aplicación o gestionar). */
  onAbrirPaciente?: (animal: Animal) => void;
}

const VENTANAS = [30, 60, 90] as const;

// Helpers de fecha
const soloDia = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);
const parse = (v?: string | null) => (v ? new Date(soloDia(v) ? `${v}T00:00:00` : v) : null);
const fmtFecha = (v?: string | null) => { const d = parse(v); return d && !isNaN(d.getTime()) ? d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'; };
const fmtHora = (iso: string) => { const d = new Date(iso); return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }); };
const diasHasta = (v?: string | null) => { const d = parse(v); return d ? Math.ceil((d.getTime() - Date.now()) / 86_400_000) : null; };
const soloDigitos = (t?: string | null) => (t ?? '').replace(/\D/g, '');

export default function RecordatoriosPage({ sesion, onAbrirPaciente }: Props) {
  const [dias, setDias] = useState<number>(30);
  const [vacunas, setVacunas] = useState<RecordatorioVacuna[]>([]);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [animales, setAnimales] = useState<Animal[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const animalPorId = useMemo(() => new Map(animales.map((a) => [a.id, a])), [animales]);
  const personaPorId = useMemo(() => new Map(personas.map((p) => [p.id, p])), [personas]);
  const duenoDe = (animalId: string): Persona | undefined => {
    const a = animalPorId.get(animalId);
    return a?.personaId ? personaPorId.get(a.personaId) : undefined;
  };

  async function cargar() {
    setCargando(true); setError(null);
    try {
      const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
      const hasta = new Date(hoy); hasta.setDate(hasta.getDate() + dias); hasta.setHours(23, 59, 59, 999);
      const [vac, tur, ans, pers] = await Promise.all([
        api.recordatoriosVacunas(sesion, dias),
        api.turnos(sesion, hoy.toISOString(), hasta.toISOString()),
        animales.length ? Promise.resolve(animales) : api.animales(sesion),
        personas.length ? Promise.resolve(personas) : api.personas(sesion),
      ]);
      setVacunas(vac);
      setTurnos([...tur].filter((t) => t.estado !== 'cancelado' && t.estado !== 'atendido')
        .sort((a, b) => a.fechaHora.localeCompare(b.fechaHora)));
      setAnimales(ans); setPersonas(pers);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los recordatorios');
    } finally {
      setCargando(false);
    }
  }
  useEffect(() => { cargar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [dias]);

  const abrir = (animalId: string) => { const a = animalPorId.get(animalId); if (a) onAbrirPaciente?.(a); };

  return (
    <div className="rc-wrap">
      <style>{CSS}</style>

      <div className="rc-head">
        <div>
          <h1 className="rc-title">Recordatorios</h1>
          <p className="rc-sub">Clientes a contactar por vacunas y turnos próximos.</p>
        </div>
        <div className="rc-ventana">
          <span>Ventana:</span>
          {VENTANAS.map((v) => (
            <button key={v} className={`rc-chip ${dias === v ? 'active' : ''}`} onClick={() => setDias(v)}>{v} días</button>
          ))}
        </div>
      </div>

      {error && <div className="rc-alerta">{error}</div>}

      {cargando ? (
        <div className="rc-empty">Cargando…</div>
      ) : (
        <>
          {/* Vacunas */}
          <h2 className="rc-h2">Vacunas por vencer o vencidas <span className="rc-count">{vacunas.length}</span></h2>
          <div className="rc-card">
            {vacunas.length === 0 ? (
              <div className="rc-muted">No hay vacunas pendientes en esta ventana.</div>
            ) : (
              vacunas.map((v) => {
                const d = diasHasta(v.proximaDosis);
                const vencida = d !== null && d < 0;
                const dueno = duenoDe(v.animalId);
                const tel = soloDigitos(dueno?.celular ?? dueno?.telefono);
                const msg = encodeURIComponent(
                  `Hola${dueno ? ' ' + dueno.nombre : ''}, te escribimos de la veterinaria: ${v.animalNombre} tiene la vacuna ${v.producto} ${vencida ? 'vencida' : 'próxima a vencer'} (${fmtFecha(v.proximaDosis)}). ¿Coordinamos un turno?`,
                );
                return (
                  <div key={v.id} className="rc-row">
                    <button className="rc-pac" onClick={() => abrir(v.animalId)} title="Abrir ficha">
                      {v.animalNombre}
                      {dueno && <span className="rc-due"> · {dueno.nombre} {dueno.apellido}</span>}
                      <div className="rc-motivo">{v.producto} · vence {fmtFecha(v.proximaDosis)}</div>
                    </button>
                    <span className={`rc-badge ${vencida ? 'venc' : 'prox'}`}>
                      {vencida ? `Vencida hace ${Math.abs(d as number)}d` : `En ${d}d`}
                    </span>
                    <div className="rc-contacto">
                      {tel ? (
                        <>
                          <a className="rc-btn wa" href={`https://wa.me/${tel}?text=${msg}`} target="_blank" rel="noreferrer">WhatsApp</a>
                          <a className="rc-btn ghost" href={`tel:${tel}`}>Llamar</a>
                        </>
                      ) : (
                        <span className="rc-muted rc-sincontacto">Sin teléfono</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Turnos próximos */}
          <h2 className="rc-h2">Próximos turnos <span className="rc-count">{turnos.length}</span></h2>
          <div className="rc-card">
            {turnos.length === 0 ? (
              <div className="rc-muted">No hay turnos en esta ventana.</div>
            ) : (
              turnos.map((t) => {
                const a = animalPorId.get(t.animalId);
                const dueno = duenoDe(t.animalId);
                const tel = soloDigitos(dueno?.celular ?? dueno?.telefono);
                return (
                  <div key={t.id} className="rc-row">
                    <button className="rc-pac" onClick={() => abrir(t.animalId)} title="Abrir ficha">
                      {a?.nombre ?? 'Animal'}
                      {dueno && <span className="rc-due"> · {dueno.nombre} {dueno.apellido}</span>}
                      <div className="rc-motivo">{fmtFecha(t.fechaHora)} · {fmtHora(t.fechaHora)} · {t.motivo || 'Sin motivo'}</div>
                    </button>
                    <span className="rc-badge estado">{t.estado}</span>
                    <div className="rc-contacto">
                      {tel ? (
                        <a className="rc-btn ghost" href={`tel:${tel}`}>Llamar</a>
                      ) : (
                        <span className="rc-muted rc-sincontacto">Sin teléfono</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}

const CSS = `
.rc-wrap { max-width: 900px; margin: 0 auto; }
.rc-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 1rem; flex-wrap: wrap; margin-bottom: 1rem; }
.rc-title { margin: 0; font-size: 1.3rem; }
.rc-sub { margin: .2rem 0 0; color: #7a857f; font-size: .85rem; }
.rc-ventana { display: flex; align-items: center; gap: .4rem; font-size: .82rem; color: #5a655f; }
.rc-chip { border: 1px solid #d9ddd7; background: #fff; border-radius: 999px; padding: .25rem .7rem; cursor: pointer; font-size: .8rem; }
.rc-chip.active { background: #0E7C6B; color: #fff; border-color: #0E7C6B; }
.rc-h2 { font-size: 1rem; margin: 1.4rem .2rem .5rem; display: flex; align-items: center; gap: .5rem; }
.rc-count { background: #eef4f2; color: #0E7C6B; font-size: .72rem; font-weight: 700; border-radius: 999px; padding: .05rem .5rem; }
.rc-card { background: #fff; border: 1px solid #e5e8e4; border-radius: 12px; overflow: hidden; }
.rc-row { display: flex; align-items: center; gap: .75rem; padding: .7rem .9rem; border-top: 1px solid #f0f1ee; flex-wrap: wrap; }
.rc-row:first-child { border-top: none; }
.rc-pac { flex: 1; min-width: 12rem; text-align: left; background: none; border: none; cursor: pointer; padding: 0; font: inherit; color: #26302c; font-weight: 600; }
.rc-due { color: #7a857f; font-weight: 400; }
.rc-motivo { font-size: .8rem; color: #7a857f; font-weight: 400; margin-top: .15rem; }
.rc-badge { font-size: .72rem; font-weight: 700; border-radius: 999px; padding: .12rem .55rem; white-space: nowrap; border: 1px solid; }
.rc-badge.venc { color: #C0492F; border-color: #C0492F; background: #fdecea; }
.rc-badge.prox { color: #E9A23B; border-color: #E9A23B; background: #fdf5e8; }
.rc-badge.estado { color: #0E7C6B; border-color: #cfe6e0; background: #eef7f4; text-transform: capitalize; }
.rc-contacto { display: flex; gap: .35rem; align-items: center; }
.rc-btn { border-radius: 8px; padding: .32rem .7rem; font-size: .8rem; font-weight: 600; text-decoration: none; border: 1px solid transparent; }
.rc-btn.wa { background: #25D366; color: #fff; }
.rc-btn.ghost { background: #fff; border-color: #d9ddd7; color: #46514d; }
.rc-sincontacto { font-size: .78rem; }
.rc-muted { color: #7a857f; font-size: .85rem; padding: .3rem 0; }
.rc-alerta { background: #fdeceb; color: #b4423a; border: 1px solid #f2b8b3; border-radius: 8px; padding: .5rem .7rem; margin-bottom: .75rem; font-size: .88rem; }
.rc-empty { text-align: center; color: #7a857f; padding: 2.5rem; }
`;

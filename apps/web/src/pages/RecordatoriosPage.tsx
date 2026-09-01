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
    <div className="layout-2col">
      <div className="layout-main">
        <div className="page-head">
          <div>
            <h1>Recordatorios</h1>
            <p className="muted">Clientes a contactar por vacunas y turnos próximos.</p>
          </div>
          <div className="recordatorios-ventana">
            <span className="muted">Ventana:</span>
            {VENTANAS.map((v) => (
              <button key={v} className={dias === v ? 'btn' : 'btn-ghost'} onClick={() => setDias(v)}>
                {v} días
              </button>
            ))}
          </div>
        </div>

        {error && <div className="alerta">{error}</div>}

        {cargando ? (
          <p className="muted">Cargando…</p>
        ) : (
          <>
            <div className="recordatorios-seccion">
              <div className="recordatorios-seccion-titulo">
                <h2 className="form-titulo">Vacunas por vencer o vencidas</h2>
                <span className="chip">{vacunas.length}</span>
              </div>
              <div className="card">
                {vacunas.length === 0 ? (
                  <p className="muted">No hay vacunas pendientes en esta ventana.</p>
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
                            <span className="muted rc-sincontacto">Sin teléfono</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="recordatorios-seccion">
              <div className="recordatorios-seccion-titulo">
                <h2 className="form-titulo">Próximos turnos</h2>
                <span className="chip">{turnos.length}</span>
              </div>
              <div className="card">
                {turnos.length === 0 ? (
                  <p className="muted">No hay turnos en esta ventana.</p>
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
                            <span className="muted rc-sincontacto">Sin teléfono</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="layout-side" />
    </div>
  );
}

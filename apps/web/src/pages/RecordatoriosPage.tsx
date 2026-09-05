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
  const [generandoPortalId, setGenerandoPortalId] = useState<string | null>(null);
  const [copiadoPortalId, setCopiadoPortalId] = useState<string | null>(null);
  const [descartandoId, setDescartandoId] = useState<string | null>(null);
  const [filtroAnimalId, setFiltroAnimalId] = useState<string>('');

  /**
   * Genera el acceso al portal para el dueño y lo manda. Con teléfono, abre
   * WhatsApp con el link precargado (mismo patrón que el mensaje de vacunas
   * de acá abajo); sin teléfono, lo copia al portapapeles. La ventana se abre
   * ANTES del await (con `about:blank`) porque abrirla después de un `await`
   * suele quedar bloqueada por el popup blocker al no ser ya un gesto directo del click.
   */
  async function enviarAccesoPortal(filaId: string, personaId: string, tel: string, nombreAnimal: string, nombreDueno?: string) {
    setGenerandoPortalId(filaId); setError(null); setCopiadoPortalId(null);
    const ventana = tel ? window.open('', '_blank') : null;
    try {
      const { portalUrl } = await api.generarAccesoPortal(sesion, personaId);
      api.registrarEvento(sesion, 'accion', 'portal-generar-acceso');
      const msg = `Hola${nombreDueno ? ' ' + nombreDueno : ''}, te compartimos el acceso al portal de ${nombreAnimal}: podés ver su historia clínica, vacunas y turnos acá → ${portalUrl}`;
      if (tel && ventana) {
        ventana.location.href = `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`;
      } else {
        await navigator.clipboard.writeText(portalUrl);
        setCopiadoPortalId(filaId);
      }
    } catch (e) {
      ventana?.close();
      setError(e instanceof Error ? e.message : 'No se pudo generar el acceso al portal');
    } finally {
      setGenerandoPortalId(null);
    }
  }

  async function descartar(id: string) {
    setDescartandoId(id); setError(null);
    try {
      await api.descartarRecordatorioVacuna(sesion, id);
      setVacunas((vs) => vs.filter((v) => v.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo descartar el recordatorio');
    } finally {
      setDescartandoId(null);
    }
  }

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

  const animalesConRecordatorio = useMemo(() => {
    const vistos = new Map<string, string>();
    for (const v of vacunas) if (!vistos.has(v.animalId)) vistos.set(v.animalId, v.animalNombre);
    return [...vistos.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [vacunas]);
  const vacunasFiltradas = useMemo(
    () => (filtroAnimalId ? vacunas.filter((v) => v.animalId === filtroAnimalId) : vacunas),
    [vacunas, filtroAnimalId],
  );

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
                <span className="chip">{vacunasFiltradas.length}</span>
                {animalesConRecordatorio.length > 1 && (
                  <select
                    className="rc-filtro-animal"
                    value={filtroAnimalId}
                    onChange={(e) => setFiltroAnimalId(e.target.value)}
                  >
                    <option value="">Todos los animales</option>
                    {animalesConRecordatorio.map(([id, nombre]) => (
                      <option key={id} value={id}>{nombre}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="card">
                {vacunasFiltradas.length === 0 ? (
                  <p className="muted">{filtroAnimalId ? 'Sin recordatorios para este animal en esta ventana.' : 'No hay vacunas pendientes en esta ventana.'}</p>
                ) : (
                  vacunasFiltradas.map((v) => {
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
                          {dueno && (
                            <button
                              type="button"
                              className="rc-btn ghost"
                              disabled={generandoPortalId === v.id}
                              onClick={() => enviarAccesoPortal(v.id, dueno.id, tel, v.animalNombre, dueno.nombre)}
                            >
                              {generandoPortalId === v.id ? 'Generando…' : copiadoPortalId === v.id ? 'Link copiado ✓' : tel ? 'Enviar portal' : 'Copiar link portal'}
                            </button>
                          )}
                          <button
                            type="button"
                            className="rc-btn ghost"
                            disabled={descartandoId === v.id}
                            title="Ya no mostrar este recordatorio"
                            onClick={() => descartar(v.id)}
                          >
                            {descartandoId === v.id ? 'Descartando…' : 'Descartar'}
                          </button>
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
                          {dueno && (
                            <button
                              type="button"
                              className="rc-btn ghost"
                              disabled={generandoPortalId === t.id}
                              onClick={() => enviarAccesoPortal(t.id, dueno.id, tel, a?.nombre ?? 'tu mascota', dueno.nombre)}
                            >
                              {generandoPortalId === t.id ? 'Generando…' : copiadoPortalId === t.id ? 'Link copiado ✓' : tel ? 'Enviar portal' : 'Copiar link portal'}
                            </button>
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

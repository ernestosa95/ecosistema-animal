// apps/web/src/pages/PortalDuenoPage.tsx
// Portal público del dueño: muestra el resumen de UN animal, identificado por
// el código legible del QR/carnet. Página autocontenida (estilos propios).
import { useEffect, useState } from 'react';
import {
  obtenerResumen, codigoDeUrl, fmtFecha, fmtHora, estadoVacuna,
  type PortalResumen, type EstadoVacuna,
} from '../api/portal';

const VAC_COLOR: Record<EstadoVacuna, string> = { al_dia: '#2E9E5B', proxima: '#E9A23B', vencida: '#C0492F' };
const VAC_LABEL: Record<EstadoVacuna, string> = { al_dia: 'Al día', proxima: 'Próxima', vencida: 'Vencida' };

export default function PortalDuenoPage() {
  const [codigo] = useState<string>(() => codigoDeUrl());
  const [data, setData] = useState<PortalResumen | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!codigo) { setError('Enlace inválido. Escaneá el QR del carnet o pedile el código a tu veterinaria.'); setCargando(false); return; }
    obtenerResumen(codigo)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'No se pudo cargar la información.'))
      .finally(() => setCargando(false));
  }, [codigo]);

  return (
    <div className="pd-page">
      <style>{CSS}</style>
      <header className="pd-top">
        <span className="pd-logo">🐾 Huella</span>
        <span className="pd-top-sub">Portal del dueño</span>
      </header>

      <main className="pd-main">
        {cargando ? (
          <div className="pd-empty">Cargando…</div>
        ) : error ? (
          <div className="pd-empty pd-err">{error}</div>
        ) : data ? (
          <Resumen data={data} />
        ) : null}
      </main>

      <footer className="pd-foot">Datos provistos por tu veterinaria a través de Huella.</footer>
    </div>
  );
}

function Resumen({ data }: { data: PortalResumen }) {
  const a = data.animal;
  return (
    <>
      <div className="pd-card pd-hero">
        <div className="pd-avatar">🐾</div>
        <div className="pd-hero-info">
          <div className="pd-name">{a.nombre}</div>
          <div className="pd-sub">{[a.especie, a.raza, a.sexo].filter((x) => x && x !== '—').join(' · ')}</div>
          <div className="pd-meta">
            {a.nacimiento && <span>Nac. {fmtFecha(a.nacimiento)}</span>}
            <span className="pd-code">{a.codigoLegible}</span>
          </div>
          {a.microchip && <div className="pd-micro">Microchip {a.microchip}</div>}
          <div className="pd-dueno">Responsable: {a.dueno}</div>
        </div>
      </div>

      {/* Próximos turnos */}
      <h3 className="pd-h3">Próximos turnos</h3>
      <div className="pd-card">
        {data.turnos.length === 0 ? (
          <div className="pd-muted">No hay turnos programados.</div>
        ) : (
          data.turnos.map((t, i) => (
            <div key={i} className="pd-row">
              <div className="pd-row-main">
                <b>{fmtFecha(t.fechaHora)} · {fmtHora(t.fechaHora)}</b>
                <span className="pd-muted">{t.motivo || 'Sin motivo'}</span>
              </div>
              <span className="pd-tag">{t.estado}</span>
            </div>
          ))
        )}
      </div>

      {/* Vacunas */}
      <h3 className="pd-h3">Vacunas</h3>
      <div className="pd-card">
        {data.vacunas.length === 0 ? (
          <div className="pd-muted">Sin vacunaciones registradas.</div>
        ) : (
          data.vacunas.map((v, i) => {
            const est = estadoVacuna(v.proximaDosis);
            return (
              <div key={i} className="pd-row">
                <div className="pd-row-main">
                  <b>{v.producto}</b>
                  <span className="pd-muted">
                    Aplicada {fmtFecha(v.fecha)}{v.proximaDosis ? ` · próxima ${fmtFecha(v.proximaDosis)}` : ''}
                  </span>
                </div>
                <span className="pd-badge" style={{ color: VAC_COLOR[est], borderColor: VAC_COLOR[est] }}>
                  {VAC_LABEL[est]}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Historia clínica */}
      <h3 className="pd-h3">Historia clínica</h3>
      <div className="pd-card">
        {data.consultas.length === 0 ? (
          <div className="pd-muted">Todavía no hay consultas registradas.</div>
        ) : (
          data.consultas.map((c, i) => (
            <div key={i} className="pd-consulta">
              <div className="pd-consulta-fecha">{fmtFecha(c.fecha)}</div>
              <div className="pd-consulta-cuerpo">
                <b>{c.motivo || 'Consulta'}</b>
                {c.diagnostico && <div className="pd-muted">{c.diagnostico}</div>}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

const CSS = `
.pd-page { min-height: 100vh; background: #f4f6f4; color: #26302c; font-family: ui-sans-serif, system-ui, sans-serif; display: flex; flex-direction: column; }
.pd-top { background: #0E7C6B; color: #fff; padding: .9rem 1.1rem; display: flex; align-items: baseline; gap: .6rem; }
.pd-logo { font-weight: 800; font-size: 1.1rem; }
.pd-top-sub { font-size: .8rem; opacity: .85; }
.pd-main { flex: 1; width: 100%; max-width: 640px; margin: 0 auto; padding: 1rem; box-sizing: border-box; }
.pd-foot { text-align: center; font-size: .75rem; color: #7a857f; padding: 1rem; }
.pd-empty { text-align: center; color: #7a857f; padding: 3rem 1rem; }
.pd-err { color: #C0492F; }
.pd-card { background: #fff; border: 1px solid #e5e8e4; border-radius: 12px; padding: 1rem; margin-bottom: 1rem; }
.pd-hero { display: flex; gap: 1rem; align-items: center; }
.pd-avatar { width: 56px; height: 56px; border-radius: 14px; background: #eafaf6; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; flex-shrink: 0; }
.pd-name { font-size: 1.3rem; font-weight: 800; }
.pd-sub { color: #5a655f; font-size: .9rem; }
.pd-meta { display: flex; gap: .6rem; align-items: center; flex-wrap: wrap; margin-top: .3rem; font-size: .8rem; color: #7a857f; }
.pd-code { font-family: ui-monospace, monospace; background: #f0f3f1; padding: .1rem .4rem; border-radius: 6px; }
.pd-micro { font-size: .78rem; color: #7a857f; margin-top: .2rem; font-family: ui-monospace, monospace; }
.pd-dueno { font-size: .82rem; color: #5a655f; margin-top: .4rem; }
.pd-h3 { font-size: .95rem; margin: 1.2rem .2rem .5rem; }
.pd-row { display: flex; justify-content: space-between; align-items: center; gap: .75rem; padding: .55rem 0; border-top: 1px solid #f0f1ee; }
.pd-row:first-child { border-top: none; }
.pd-row-main { display: flex; flex-direction: column; min-width: 0; }
.pd-muted { color: #7a857f; font-size: .82rem; }
.pd-tag { font-size: .72rem; background: #eef4f2; color: #0E7C6B; padding: .15rem .5rem; border-radius: 999px; text-transform: capitalize; white-space: nowrap; }
.pd-badge { font-size: .72rem; font-weight: 700; border: 1px solid; border-radius: 999px; padding: .12rem .55rem; white-space: nowrap; }
.pd-consulta { display: flex; gap: .8rem; padding: .6rem 0; border-top: 1px solid #f0f1ee; }
.pd-consulta:first-child { border-top: none; }
.pd-consulta-fecha { font-size: .78rem; color: #7a857f; width: 5.2rem; flex-shrink: 0; }
.pd-consulta-cuerpo { min-width: 0; }
`;

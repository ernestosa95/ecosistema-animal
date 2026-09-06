// apps/web/src/pages/PortalDuenoPage.tsx
// Portal público del dueño: muestra el resumen de UN animal, identificado por
// el código legible del QR/carnet. Página autocontenida (estilos propios).
import { useEffect, useState } from 'react';
import {
  obtenerResumen, codigoDeUrl, fmtFecha, fmtHora, estadoVacuna,
  type PortalResumen, type EstadoVacuna,
} from '../api/portal';
import { CSS_PORTAL } from './portalEstilos';

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
      <style>{CSS_PORTAL}</style>
      <header className="pd-top">
        {data?.organizacion.logoUrl ? (
          <img src={data.organizacion.logoUrl} alt={data.organizacion.nombre} className="pd-logo-img" />
        ) : (
          <span className="pd-logo">🐾 Huella</span>
        )}
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
        <div className="pd-avatar">
          {a.fotoUrl ? <img src={a.fotoUrl} alt={a.nombre} /> : '🐾'}
        </div>
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

      {/* Plan de tratamiento (§8.1) */}
      {data.tratamientos.length > 0 && (
        <>
          <h3 className="pd-h3">Plan de tratamiento</h3>
          <div className="pd-card">
            {data.tratamientos.map((t, i) => (
              <div key={i} className="pd-row">
                <div className="pd-row-main">
                  <b>{t.farmaco}</b>
                  <span className="pd-muted">
                    {[t.dosis, t.frecuencia, t.duracionDias ? `${t.duracionDias} días` : null]
                      .filter(Boolean)
                      .join(' · ') || 'Sin detalle de dosis'}
                  </span>
                </div>
                <span className="pd-tag" style={!t.activo ? { opacity: 0.5 } : undefined}>
                  {t.activo ? 'Vigente' : 'Finalizado'}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

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


// apps/web/src/pages/PortalAccesoPage.tsx
// Portal del dueño vía magic-link: muestra TODAS sus mascotas (a diferencia del
// portal público por código, que muestra una sola) y permite solicitar un turno.
import { useEffect, useState } from 'react';
import {
  obtenerResumenPortal, solicitarTurnoPortal, tokenDeUrl, fmtFecha,
  type ResumenPortalDueno, type AnimalPortal,
} from '../api/portalAcceso';

export default function PortalAccesoPage() {
  const [token] = useState<string>(() => tokenDeUrl());
  const [data, setData] = useState<ResumenPortalDueno | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Enlace inválido. Pedile a tu veterinaria que te lo vuelva a enviar.');
      setCargando(false);
      return;
    }
    obtenerResumenPortal(token)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'No se pudo cargar la información.'))
      .finally(() => setCargando(false));
  }, [token]);

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
          <Contenido token={token} data={data} />
        ) : null}
      </main>

      <footer className="pd-foot">Datos provistos por tu veterinaria a través de Huella.</footer>
    </div>
  );
}

function Contenido({ token, data }: { token: string; data: ResumenPortalDueno }) {
  return (
    <>
      <div className="pd-card pd-hero">
        <div className="pd-avatar">👤</div>
        <div className="pd-hero-info">
          <div className="pd-name">{data.dueno.nombre}</div>
          <div className="pd-sub">
            {data.animales.length === 0
              ? 'Sin mascotas asociadas.'
              : `${data.animales.length} mascota${data.animales.length === 1 ? '' : 's'}`}
          </div>
        </div>
      </div>

      {data.animales.map((a) => (
        <AnimalCard key={a.id} token={token} animal={a} />
      ))}
    </>
  );
}

function AnimalCard({ token, animal }: { token: string; animal: AnimalPortal }) {
  const [mostrarForm, setMostrarForm] = useState(false);

  return (
    <div className="pd-card">
      <div className="pd-hero" style={{ marginBottom: '0.75rem' }}>
        <div className="pd-avatar">🐾</div>
        <div className="pd-hero-info">
          <div className="pd-name">{animal.nombre}</div>
          <div className="pd-sub">{[animal.especie?.nombre, animal.sexo].filter(Boolean).join(' · ')}</div>
          <div className="pd-meta">
            {animal.fechaNacimiento && <span>Nac. {fmtFecha(animal.fechaNacimiento)}</span>}
            {animal.codigoLegible && <span className="pd-code">{animal.codigoLegible}</span>}
          </div>
        </div>
      </div>

      <h4 className="pd-h4">Próximos turnos</h4>
      {animal.turnos.length === 0 ? (
        <div className="pd-muted">No hay turnos programados.</div>
      ) : (
        animal.turnos.map((t, i) => (
          <div key={i} className="pd-row">
            <div className="pd-row-main">
              <b>{fmtFecha(t.fecha)} · {t.hora}</b>
              <span className="pd-muted">{t.motivo || 'Sin motivo'}</span>
            </div>
            <span className="pd-tag">{t.estado}</span>
          </div>
        ))
      )}

      <h4 className="pd-h4">Vacunas</h4>
      {animal.vacunaciones.length === 0 ? (
        <div className="pd-muted">Sin vacunaciones registradas.</div>
      ) : (
        animal.vacunaciones.map((v, i) => (
          <div key={i} className="pd-row">
            <div className="pd-row-main">
              <b>{v.nombre ?? 'Vacuna'}</b>
              <span className="pd-muted">
                Aplicada {fmtFecha(v.fechaAplicacion)}
                {v.proximaDosis ? ` · próxima ${fmtFecha(v.proximaDosis)}` : ''}
              </span>
            </div>
          </div>
        ))
      )}

      {animal.tratamientos.length > 0 && (
        <>
          <h4 className="pd-h4">Plan de tratamiento</h4>
          {animal.tratamientos.map((t, i) => (
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
        </>
      )}

      <h4 className="pd-h4">Historia clínica reciente</h4>
      {animal.consultas.length === 0 ? (
        <div className="pd-muted">Todavía no hay consultas registradas.</div>
      ) : (
        animal.consultas.map((c, i) => (
          <div key={i} className="pd-consulta">
            <div className="pd-consulta-fecha">{fmtFecha(c.fecha)}</div>
            <div className="pd-consulta-cuerpo">
              <b>{c.motivo || 'Consulta'}</b>
              {c.diagnostico && <div className="pd-muted">{c.diagnostico}</div>}
            </div>
          </div>
        ))
      )}

      <div className="pd-turno-accion">
        <button className="pd-btn" onClick={() => setMostrarForm((v) => !v)}>
          {mostrarForm ? 'Cerrar' : 'Solicitar turno'}
        </button>
      </div>
      {mostrarForm && (
        <SolicitarTurnoForm
          token={token}
          animalId={animal.id}
          onListo={() => setMostrarForm(false)}
        />
      )}
    </div>
  );
}

function SolicitarTurnoForm({
  token,
  animalId,
  onListo,
}: {
  token: string;
  animalId: string;
  onListo: () => void;
}) {
  const [motivo, setMotivo] = useState('');
  const [fecha, setFecha] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [ok, setOk] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!fecha) {
      setError('Elegí una fecha preferida.');
      return;
    }
    setError(null);
    setEnviando(true);
    try {
      await solicitarTurnoPortal(token, { animalId, motivo: motivo || undefined, fechaPreferida: fecha });
      setOk(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar la solicitud');
    } finally {
      setEnviando(false);
    }
  }

  if (ok) {
    return (
      <div className="pd-turno-ok">
        Solicitud enviada. La veterinaria la va a confirmar a la brevedad.
        <button className="pd-btn pd-btn-ghost" onClick={onListo} style={{ marginTop: '0.5rem' }}>
          Cerrar
        </button>
      </div>
    );
  }

  return (
    <form className="pd-turno-form" onSubmit={enviar}>
      <label>
        Fecha preferida
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
      </label>
      <label>
        Motivo (opcional)
        <input type="text" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej: control anual" />
      </label>
      {error && <div className="pd-err-inline">{error}</div>}
      <button className="pd-btn" type="submit" disabled={enviando}>
        {enviando ? 'Enviando…' : 'Enviar solicitud'}
      </button>
    </form>
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
.pd-h4 { font-size: .82rem; text-transform: uppercase; letter-spacing: .03em; color: #7a857f; margin: 1rem 0 .4rem; }
.pd-row { display: flex; justify-content: space-between; align-items: center; gap: .75rem; padding: .5rem 0; border-top: 1px solid #f0f1ee; }
.pd-row:first-child { border-top: none; }
.pd-row-main { display: flex; flex-direction: column; min-width: 0; }
.pd-muted { color: #7a857f; font-size: .82rem; }
.pd-tag { font-size: .72rem; background: #eef4f2; color: #0E7C6B; padding: .15rem .5rem; border-radius: 999px; text-transform: capitalize; white-space: nowrap; }
.pd-consulta { display: flex; gap: .8rem; padding: .55rem 0; border-top: 1px solid #f0f1ee; }
.pd-consulta:first-child { border-top: none; }
.pd-consulta-fecha { font-size: .78rem; color: #7a857f; width: 5.2rem; flex-shrink: 0; }
.pd-consulta-cuerpo { min-width: 0; }
.pd-turno-accion { margin-top: 1rem; padding-top: .75rem; border-top: 1px solid #f0f1ee; }
.pd-btn { border: none; background: #0E7C6B; color: #fff; font-weight: 700; font-size: .85rem; padding: .55rem 1rem; border-radius: 8px; cursor: pointer; }
.pd-btn-ghost { background: transparent; color: #0E7C6B; border: 1px solid #cfe6e0; }
.pd-turno-form { margin-top: .75rem; display: flex; flex-direction: column; gap: .6rem; }
.pd-turno-form label { font-size: .8rem; color: #5a655f; display: block; }
.pd-turno-form input { display: block; width: 100%; margin-top: .25rem; padding: .5rem .6rem; border: 1px solid #e2e8e5; border-radius: 8px; font-size: .9rem; box-sizing: border-box; }
.pd-turno-ok { margin-top: .75rem; font-size: .88rem; color: #0E7C6B; background: #eafaf6; border: 1px solid #cfe6e0; border-radius: 8px; padding: .75rem; }
.pd-err-inline { color: #C0492F; font-size: .82rem; }
`;

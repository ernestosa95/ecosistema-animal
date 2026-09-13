// apps/web/src/pages/PortalAccesoPage.tsx
// Portal del dueño vía magic-link: muestra TODAS sus mascotas (a diferencia del
// portal público por código, que muestra una sola) y permite solicitar un turno.
import { useEffect, useRef, useState } from 'react';
import {
  obtenerResumenPortal, solicitarTurnoPortal, subirFotoPortal, tokenDeUrl, fmtFecha,
  type ResumenPortalDueno, type AnimalPortal,
} from '../api/portalAcceso';
import { comprimirImagen } from '../utils/comprimirImagen';
import { CSS_PORTAL } from './portalEstilos';

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
          <Contenido token={token} data={data} />
        ) : null}
      </main>

      <footer className="pd-foot">Datos provistos por tu veterinaria a través de Huella.</footer>
    </div>
  );
}

// Exportado para que PortalCodigoPage.tsx (acceso por DNI + código) lo reuse
// tal cual una vez que canjea el código — misma vista, sólo cambia cómo se
// consiguió el token.
export function Contenido({ token, data }: { token: string; data: ResumenPortalDueno }) {
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
  const [fotoUrl, setFotoUrl] = useState(animal.fotoUrl ?? null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);
  const inputFotoRef = useRef<HTMLInputElement>(null);

  async function elegirFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    setErrorFoto(null);
    setSubiendoFoto(true);
    try {
      const comprimida = await comprimirImagen(archivo);
      const r = await subirFotoPortal(token, animal.id, comprimida);
      setFotoUrl(r.fotoUrl);
    } catch (err) {
      setErrorFoto(err instanceof Error ? err.message : 'No se pudo subir la foto');
    } finally {
      setSubiendoFoto(false);
    }
  }

  return (
    <div className="pd-card">
      <div className="pd-hero" style={{ marginBottom: '0.75rem' }}>
        <div className="pd-avatar">
          {fotoUrl ? <img src={fotoUrl} alt={animal.nombre} /> : '🐾'}
        </div>
        <div className="pd-hero-info">
          <div className="pd-name">{animal.nombre}</div>
          <div className="pd-sub">{[animal.especie?.nombre, animal.sexo].filter(Boolean).join(' · ')}</div>
          <div className="pd-meta">
            {animal.fechaNacimiento && <span>Nac. {fmtFecha(animal.fechaNacimiento)}</span>}
            {animal.codigoLegible && <span className="pd-code">{animal.codigoLegible}</span>}
          </div>
          <div style={{ marginTop: '0.4rem' }}>
            <input ref={inputFotoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={elegirFoto} />
            <button
              type="button"
              className="pd-btn pd-btn-ghost"
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem' }}
              disabled={subiendoFoto}
              onClick={() => inputFotoRef.current?.click()}
            >
              {subiendoFoto ? 'Subiendo…' : fotoUrl ? 'Cambiar foto' : '+ Agregar foto'}
            </button>
            {errorFoto && <div className="pd-err-inline">{errorFoto}</div>}
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


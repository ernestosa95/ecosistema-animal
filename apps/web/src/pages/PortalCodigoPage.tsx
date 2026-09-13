// apps/web/src/pages/PortalCodigoPage.tsx
// Portal del dueño vía DNI + código corto — tercera vía de acceso, para
// cuando el dueño no tiene a mano el link/QR que ya le dieron. El código lo
// emite el staff (ver PersonasPage.tsx/RecordatoriosPage.tsx "Generar
// código"), es reutilizable y se cierra sólo por inactividad (15 min sin
// canjearse — ver PortalCodigoService en el backend); acá sólo se canjea por
// el mismo token que emite el magic-link y se reusa la vista de
// PortalAccesoPage.tsx tal cual.
//
// A propósito sin persistencia (ni localStorage ni la URL): esta página
// siempre arranca mostrando el form ("home"). Si el dueño recarga o vuelve
// más tarde, tiene que volver a tipear DNI + código — el mismo código sigue
// sirviendo mientras no haya pasado la ventana de inactividad, así que no
// hace falta "recordar" nada entre visitas para que siga funcionando.
import { useState } from 'react';
import { canjearCodigoPortal, obtenerResumenPortal, type ResumenPortalDueno } from '../api/portalAcceso';
import { Contenido } from './PortalAccesoPage';
import { CSS_PORTAL } from './portalEstilos';

export default function PortalCodigoPage() {
  const [token, setToken] = useState<string | null>(null);
  const [data, setData] = useState<ResumenPortalDueno | null>(null);

  function salir() {
    setToken(null);
    setData(null);
  }

  return (
    <div className="pd-page">
      <style>{CSS_PORTAL}</style>
      <header className="pd-top">
        {data?.organizacion.logoUrl ? (
          <img src={data.organizacion.logoUrl} alt={data.organizacion.nombre} className="pd-logo-img" />
        ) : (
          <span className="pd-logo">🐾 Huella</span>
        )}
        <span className="pd-top-sub">{data ? data.organizacion.nombre : 'Portal del dueño'}</span>
        {token && data && (
          <button
            type="button"
            className="pd-btn pd-btn-ghost"
            style={{ marginLeft: 'auto', padding: '.35rem .7rem', fontSize: '.78rem' }}
            onClick={salir}
          >
            Salir
          </button>
        )}
      </header>

      <main className="pd-main">
        {token && data ? <Contenido token={token} data={data} /> : <FormCodigo onListo={(t, d) => { setToken(t); setData(d); }} />}
      </main>

      <footer className="pd-foot">Datos provistos por tu veterinaria a través de Huella.</footer>
    </div>
  );
}

function FormCodigo({ onListo }: { onListo: (token: string, data: ResumenPortalDueno) => void }) {
  const [dni, setDni] = useState('');
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const { token } = await canjearCodigoPortal(dni.trim(), codigo.trim());
      const data = await obtenerResumenPortal(token);
      onListo(token, data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo validar el acceso');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="pd-card">
      <div className="pd-h3">Ingresá con tu código</div>
      <div className="pd-muted" style={{ marginBottom: '.5rem' }}>
        Pedile el código a tu veterinaria si todavía no lo tenés. Se cierra solo si pasan 15 minutos sin usarlo.
      </div>
      <form className="pd-turno-form" onSubmit={enviar}>
        <label>
          DNI
          <input
            type="text"
            inputMode="numeric"
            value={dni}
            onChange={(e) => setDni(e.target.value)}
            placeholder="Sin puntos ni espacios"
            required
          />
        </label>
        <label>
          Código
          <input
            type="text"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            placeholder="Ej: 7K4PQX9M"
            required
          />
        </label>
        {error && <div className="pd-err-inline">{error}</div>}
        <button className="pd-btn" type="submit" disabled={enviando}>
          {enviando ? 'Validando…' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
}

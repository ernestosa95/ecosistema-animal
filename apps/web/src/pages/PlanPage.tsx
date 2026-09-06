import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { MiPlan, PagoOrganizacion } from '../api/client';
import type { Sesion } from '../api/types';
import { rolInfoDe } from '../config/rolesInfo';

function fechaLegible(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const ESTADO_CHIP: Record<PagoOrganizacion['estado'], { texto: string; bg: string; color: string }> = {
  pendiente: { texto: 'Pendiente de revisión', bg: 'var(--advertencia-bg)', color: 'var(--advertencia)' },
  confirmado: { texto: 'Confirmado', bg: 'rgba(92, 138, 78, 0.14)', color: 'var(--verde-dark)' },
  rechazado: { texto: 'Rechazado', bg: 'var(--danger-bg)', color: 'var(--danger)' },
};

/**
 * "Mi plan" — mini panel para el propietario/admin de la organización (nav
 * dropdown, mismo lugar que "Usuarios"): recuerda hasta cuándo tiene
 * habilitada la cuenta, qué plan/características tiene, y deja registrar un
 * pago. Por ahora la única vía es transferencia, así que "registrar pago"
 * es subir el comprobante — queda `pendiente` hasta que el super-admin lo
 * revisa desde /admin (ver AdminPage.tsx → Home → "Pagos pendientes").
 */
export function PlanPage({ sesion }: { sesion: Sesion }) {
  const [miPlan, setMiPlan] = useState<MiPlan | null>(null);
  const [pagos, setPagos] = useState<PagoOrganizacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function cargar() {
    setCargando(true);
    setError(null);
    Promise.all([api.miPlan(sesion), api.misPagos(sesion)])
      .then(([p, pg]) => { setMiPlan(p); setPagos(pg); })
      .catch((e) => setError(e instanceof Error ? e.message : 'No se pudo cargar el plan'))
      .finally(() => setCargando(false));
  }
  useEffect(cargar, [sesion]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="page-head">
        <h1>Mi plan</h1>
      </div>
      <p className="muted">Estado del plan y de los pagos de tu organización.</p>

      {error && <div className="alerta">{error}</div>}

      {cargando ? (
        <p className="muted">Cargando…</p>
      ) : miPlan && (
        <>
          <div className="card" style={{ marginBottom: '1rem' }}>
            <h4 className="form-titulo">Logo de tu organización</h4>
            <p className="muted" style={{ marginTop: 0 }}>
              Aparece en el carnet, la ficha del paciente y el portal del dueño — es lo que ve tu cliente, no el
              staff. Sin logo propio, esos documentos muestran la marca de Huella.
            </p>
            <FormLogo sesion={sesion} logoActual={miPlan.logoUrl} nombreOrganizacion={miPlan.nombre} onCargado={cargar} />
          </div>

          <div className="card ficha-datos" style={{ marginBottom: '1rem' }}>
            <div className="dato">
              <span className="dato-label">Plan</span>
              <strong>{miPlan.plan?.nombre ?? 'Sin plan asignado'}</strong>
            </div>
            <div className="dato">
              <span className="dato-label">Próximo vencimiento</span>
              <strong>{fechaLegible(miPlan.proximoVencimiento)}</strong>
            </div>
            <div className="dato">
              <span className="dato-label">Estado de la cuenta</span>
              <strong>
                <span className="chip" style={miPlan.activo ? undefined : { background: 'var(--danger-bg)', color: 'var(--danger)' }}>
                  {miPlan.activo ? 'Activa' : 'Inactiva'}
                </span>
              </strong>
            </div>
            <div className="dato">
              <span className="dato-label">¿Pagó este mes?</span>
              <strong>
                <span className="chip" style={miPlan.pagoEsteMes ? undefined : { background: 'var(--advertencia-bg)', color: 'var(--advertencia)' }}>
                  {miPlan.pagoEsteMes ? 'Sí' : 'Todavía no'}
                </span>
              </strong>
            </div>
            {miPlan.accesoHasta && (
              <div className="dato">
                <span className="dato-label">Acceso habilitado hasta</span>
                <strong>{fechaLegible(miPlan.accesoHasta)}</strong>
              </div>
            )}
          </div>

          {miPlan.plan && (
            <div className="card" style={{ marginBottom: '1rem' }}>
              <h4 className="form-titulo">Tu plan incluye</h4>
              {miPlan.plan.descripcion && <p className="muted" style={{ marginTop: 0 }}>{miPlan.plan.descripcion}</p>}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {miPlan.plan.precioMensual && (
                  <span className="chip">${Number(miPlan.plan.precioMensual).toLocaleString('es-AR')}/mes</span>
                )}
                {miPlan.plan.precioAnual && (
                  <span className="chip">${Number(miPlan.plan.precioAnual).toLocaleString('es-AR')}/año</span>
                )}
                {Object.entries(miPlan.plan.limitesRoles ?? {})
                  .filter(([, n]) => n > 0)
                  .map(([rol, n]) => (
                    <span key={rol} className="chip">{n} × {rolInfoDe(rol)?.label ?? rol}</span>
                  ))}
              </div>
            </div>
          )}

          <div className="card" style={{ marginBottom: '1rem' }}>
            <h4 className="form-titulo">Registrar pago</h4>
            {miPlan.tienePagoPendiente ? (
              <p className="muted">
                Ya tenés un pago cargado esperando revisión — te va a figurar acá abajo como "Confirmado" apenas
                se apruebe. Si necesitás cargar otro, esperá a que este se resuelva.
              </p>
            ) : (
              <FormRegistrarPago sesion={sesion} montoSugerido={miPlan.plan?.precioMensual ?? null} onCargado={cargar} />
            )}
          </div>
        </>
      )}

      <div className="card">
        <h4 className="form-titulo">Historial de pagos</h4>
        {pagos.length === 0 ? (
          <p className="muted">Todavía no hay pagos cargados.</p>
        ) : (
          <table className="tabla">
            <thead>
              <tr>
                <th>Período</th>
                <th>Monto</th>
                <th>Estado</th>
                <th>Comprobante</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {pagos.map((p) => {
                const chip = ESTADO_CHIP[p.estado];
                return (
                  <tr key={p.id}>
                    <td>{fechaLegible(p.periodo)}</td>
                    <td>${Number(p.monto).toLocaleString('es-AR')}</td>
                    <td>
                      <span className="chip" style={{ background: chip.bg, color: chip.color }}>{chip.texto}</span>
                      {p.estado === 'rechazado' && p.motivoRechazo && (
                        <div className="muted" style={{ fontSize: '0.78rem', marginTop: '0.2rem' }}>{p.motivoRechazo}</div>
                      )}
                    </td>
                    <td>
                      {p.comprobanteUrl ? (
                        <a href={p.comprobanteUrl} target="_blank" rel="noreferrer">Ver</a>
                      ) : '—'}
                    </td>
                    <td>{fechaLegible(p.fechaPago)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function FormLogo({ sesion, logoActual, nombreOrganizacion, onCargado }: {
  sesion: Sesion; logoActual: string | null; nombreOrganizacion: string; onCargado: () => void;
}) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function subir() {
    if (!archivo) return;
    setError(null);
    setGuardando(true);
    try {
      await api.subirLogoOrganizacion(sesion, archivo);
      api.registrarEvento(sesion, 'accion', 'organizacion-logo-subir');
      setArchivo(null);
      onCargado();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir el logo');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
      <div
        style={{
          width: 64, height: 64, borderRadius: 8, border: '1px solid var(--border)',
          background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0,
        }}
      >
        {logoActual ? (
          <img src={logoActual} alt={nombreOrganizacion} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        ) : (
          <span className="muted" style={{ fontSize: '0.7rem', textAlign: 'center' }}>Sin logo</span>
        )}
      </div>
      <div style={{ flex: '1 1 220px' }}>
        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
        {error && <div className="alerta" style={{ marginTop: '0.5rem' }}>{error}</div>}
        <div style={{ marginTop: '0.5rem' }}>
          <button className="btn-ghost" disabled={!archivo || guardando} onClick={subir}>
            {guardando ? 'Subiendo…' : logoActual ? 'Reemplazar logo' : 'Subir logo'}
          </button>
        </div>
      </div>
    </div>
  );
}

function FormRegistrarPago({ sesion, montoSugerido, onCargado }: {
  sesion: Sesion; montoSugerido: string | null; onCargado: () => void;
}) {
  const [monto, setMonto] = useState(montoSugerido ?? '');
  const [observaciones, setObservaciones] = useState('');
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [guardando, setGuardando] = useState(false);

  async function enviar() {
    setError(null);
    if (!monto || Number(monto) <= 0) { setError('Ingresá el monto transferido'); return; }
    if (!comprobante) { setError('Adjuntá el comprobante de la transferencia'); return; }
    setGuardando(true);
    try {
      await api.registrarPagoTransferencia(sesion, {
        monto: Number(monto),
        observaciones: observaciones.trim() || undefined,
        comprobante,
      });
      api.registrarEvento(sesion, 'accion', 'pago-registrar');
      setEnviado(true);
      onCargado();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el pago');
    } finally {
      setGuardando(false);
    }
  }

  if (enviado) {
    return <p className="muted">Pago cargado — queda pendiente de revisión.</p>;
  }

  return (
    <div>
      <p className="muted" style={{ marginTop: 0 }}>
        Por ahora los pagos se registran por transferencia: subí el comprobante y el super-admin lo revisa antes
        de confirmarlo.
      </p>
      <div className="form-grid">
        <label>
          Monto transferido
          <input type="number" min={0} value={monto} onChange={(e) => setMonto(e.target.value)} />
        </label>
        <label>
          Comprobante (imagen o PDF)
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setComprobante(e.target.files?.[0] ?? null)}
          />
        </label>
        <label className="span-2">
          Observaciones (opcional)
          <input value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
        </label>
      </div>
      {error && <div className="alerta">{error}</div>}
      <button className="btn" disabled={guardando} onClick={enviar}>
        {guardando ? 'Enviando…' : 'Registrar pago'}
      </button>
    </div>
  );
}

// apps/web/src/pages/PortalDuenoPage.tsx
import { useEffect, useState } from 'react';
import {
  obtenerResumen, solicitarTurno, tokenDeUrl, USAR_MOCK,
  type PortalResumen, type AnimalPortal, type EstadoVacuna,
} from '../api/portal';

const ESPECIES: Record<string, string> = {
  Canino: '🐕', Felino: '🐈', Equino: '🐎', Bovino: '🐄', Ave: '🦜', Conejo: '🐇',
};
const VAC_COLOR: Record<EstadoVacuna, string> = { al_dia: '#2E9E5B', proxima: '#E9A23B', vencida: '#C0492F' };
const VAC_LABEL: Record<EstadoVacuna, string> = { al_dia: 'Al día', proxima: 'Próxima', vencida: 'Vencida' };

export default function PortalDuenoPage() {
  const [data, setData] = useState<PortalResumen | null>(null);
  const [sel, setSel] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<AnimalPortal | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!USAR_MOCK && !tokenDeUrl()) { setError('Enlace inválido o vencido. Pedile a tu veterinaria un nuevo acceso.'); setCargando(false); return; }
    obtenerResumen()
      .then(r => setData(r))
      .catch(e => setError(e.message ?? 'No se pudo cargar tu información'))
      .finally(() => setCargando(false));
  }, []);

  function avisar(m: string) { setToast(m); setTimeout(() => setToast(null), 3000); }

  if (cargando) return <Shell><div className="pd-empty">Cargando…</div></Shell>;
  if (error) return <Shell><div className="pd-empty pd-err">{error}</div></Shell>;
  if (!data || data.animales.length === 0) return <Shell><div className="pd-empty">No hay mascotas asociadas a este acceso.</div></Shell>;

  const animal = data.animales[sel];

  return (
    <Shell>
      <p className="pd-hola">Hola, <b>{data.dueno.nombre}</b> 👋</p>

      {data.animales.length > 1 && (
        <div className="pd-tabs">
          {data.animales.map((a, i) => (
            <button key={a.id} className={`pd-tab ${i === sel ? 'active' : ''}`} onClick={() => setSel(i)}>
              {ESPECIES[a.especie] || '🐾'} {a.nombre}
            </button>
          ))}
        </div>
      )}

      {/* Identidad */}
      <div className="pd-card pd-hero">
        <div className="pd-avatar">{ESPECIES[animal.especie] || '🐾'}</div>
        <div>
          <div className="pd-name">{animal.nombre}</div>
          <div className="pd-sub">{animal.especie} · {animal.raza} · {animal.sexo}</div>
          <div className="pd-code">{animal.codigoLegible}</div>
          {animal.microchip && <div className="pd-chip">Microchip {animal.microchip}</div>}
        </div>
      </div>

      {/* Vacunas */}
      <h3 className="pd-h3">Vacunas</h3>
      <div className="pd-card">
        {animal.vacunas.length === 0 ? <div className="pd-none">Sin vacunas registradas.</div> :
          animal.vacunas.map((v, i) => (
            <div key={i} className="pd-vac">
              <span className="pd-vdot" style={{ background: VAC_COLOR[v.estado] }} />
              <div className="pd-vmain">
                <div className="pd-vname">{v.nombre}</div>
                <div className="pd-vmeta">Aplicada {v.aplicada} · Próxima {v.proxima}</div>
              </div>
              <span className="pd-vbadge" style={{ color: VAC_COLOR[v.estado], background: VAC_COLOR[v.estado] + '1a' }}>
                {VAC_LABEL[v.estado]}
              </span>
            </div>
          ))}
      </div>

      {/* Próximos turnos */}
      <h3 className="pd-h3">Próximos turnos</h3>
      <div className="pd-card">
        {animal.turnos.length === 0 ? <div className="pd-none">No tenés turnos agendados.</div> :
          animal.turnos.map((t, i) => (
            <div key={i} className="pd-turno">
              <div className="pd-tfecha">{t.fecha}<small>{t.hora}</small></div>
              <div className="pd-tmain"><div>{t.motivo}</div><span className="pd-testado">{t.estado}</span></div>
            </div>
          ))}
        <button className="pd-btn primary" style={{ marginTop: 10, width: '100%' }} onClick={() => setModal(animal)}>
          Solicitar turno
        </button>
      </div>

      {/* Historia (solo lectura) */}
      <h3 className="pd-h3">Últimas consultas</h3>
      <div className="pd-card">
        {animal.consultas.length === 0 ? <div className="pd-none">Sin consultas registradas.</div> :
          animal.consultas.map((c, i) => (
            <div key={i} className="pd-cons">
              <div className="pd-cfecha">{c.fecha}</div>
              <div className="pd-cmain"><div className="pd-cmotivo">{c.motivo}</div><div className="pd-cdiag">{c.diagnostico}</div></div>
            </div>
          ))}
      </div>

      <p className="pd-foot">🐾 Huella · Portal del dueño</p>

      {modal && (
        <ModalSolicitar animal={modal} onClose={() => setModal(null)}
          onOk={async (motivo, fecha) => {
            setModal(null);
            try { await solicitarTurno({ animalId: modal.id, motivo, fechaPreferida: fecha }); avisar('¡Solicitud enviada! La veterinaria te va a confirmar.'); }
            catch (e: any) { avisar(e.message ?? 'No se pudo enviar la solicitud'); }
          }} />
      )}
      {toast && <div className="pd-toast">{toast}</div>}
    </Shell>
  );
}

function ModalSolicitar({ animal, onClose, onOk }: { animal: AnimalPortal; onClose: () => void; onOk: (motivo: string, fecha: string) => void }) {
  const [motivo, setMotivo] = useState('');
  const [fecha, setFecha] = useState('');
  return (
    <div className="pd-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pd-modal">
        <h2>Solicitar turno</h2>
        <p className="pd-msub">para {ESPECIES[animal.especie] || '🐾'} {animal.nombre}</p>
        <div className="pd-field"><label>¿Qué necesitás?</label><input type="text" value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ej: control, vacuna, no come bien…" /></div>
        <div className="pd-field"><label>Fecha preferida</label><input type="date" value={fecha} onChange={e => setFecha(e.target.value)} /></div>
        <div className="pd-mactions">
          <button className="pd-btn ghost" onClick={onClose}>Cancelar</button>
          <button className="pd-btn primary" disabled={!motivo || !fecha} onClick={() => onOk(motivo, fecha)}>Enviar solicitud</button>
        </div>
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="pd-root">
      <style>{CSS}</style>
      <div className="pd-topbar">
        <svg width="24" height="24" viewBox="0 0 100 100"><g fill="#fff">
          <ellipse cx="50" cy="66" rx="22" ry="18" /><ellipse cx="24" cy="44" rx="8.5" ry="11" />
          <ellipse cx="41" cy="30" rx="8.5" ry="12" /><ellipse cx="59" cy="30" rx="8.5" ry="12" />
          <ellipse cx="76" cy="44" rx="8.5" ry="11" /></g></svg>
        <span>Huella</span>
      </div>
      <div className="pd-wrap">{children}</div>
    </div>
  );
}

const CSS = `
.pd-root{--teal:#0E7C6B;--teal-dark:#0A5C50;--ink:#17302C;--muted:#6B807B;--line:#DCE6E3;--bg:#F3F8F6;--accent:#E9A23B;
  min-height:100vh;background:var(--bg);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
.pd-root *{box-sizing:border-box}
.pd-topbar{background:var(--teal);color:#fff;padding:14px 16px;display:flex;align-items:center;gap:8px;font-weight:800;font-size:18px;position:sticky;top:0;z-index:10}
.pd-wrap{max-width:520px;margin:0 auto;padding:16px 14px 60px}
.pd-hola{font-size:17px;margin:4px 2px 14px}
.pd-tabs{display:flex;gap:8px;overflow-x:auto;margin-bottom:12px;padding-bottom:4px}
.pd-tab{white-space:nowrap;border:1px solid var(--line);background:#fff;border-radius:999px;padding:8px 14px;font-size:14px;cursor:pointer;color:var(--muted);font-weight:600}
.pd-tab.active{background:var(--ink);color:#fff;border-color:var(--ink)}
.pd-card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px;margin-bottom:8px}
.pd-hero{display:flex;gap:14px;align-items:center;margin-bottom:14px}
.pd-avatar{width:58px;height:58px;border-radius:16px;background:var(--bg);display:flex;align-items:center;justify-content:center;font-size:30px;flex-shrink:0}
.pd-name{font-size:22px;font-weight:800;line-height:1.1}
.pd-sub{color:var(--muted);font-size:13px;margin-top:3px}
.pd-code{color:var(--teal-dark);font-weight:800;font-size:14px;letter-spacing:.5px;margin-top:6px}
.pd-chip{color:var(--muted);font-size:11px;margin-top:2px}
.pd-h3{font-size:13px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin:18px 2px 8px}
.pd-vac{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--bg)}
.pd-vac:last-child{border-bottom:none}
.pd-vdot{width:9px;height:9px;border-radius:50%;flex-shrink:0}
.pd-vmain{flex:1;min-width:0}
.pd-vname{font-weight:700;font-size:14px}
.pd-vmeta{color:var(--muted);font-size:11.5px;margin-top:1px}
.pd-vbadge{font-size:10.5px;font-weight:800;padding:3px 9px;border-radius:999px;text-transform:uppercase;letter-spacing:.4px}
.pd-turno{display:flex;gap:12px;padding:8px 0;border-bottom:1px solid var(--bg)}
.pd-turno:last-of-type{border-bottom:none}
.pd-tfecha{font-weight:800;font-size:14px;min-width:78px}
.pd-tfecha small{display:block;color:var(--muted);font-weight:600;font-size:11px}
.pd-tmain{flex:1;display:flex;justify-content:space-between;gap:8px;align-items:flex-start;font-size:13.5px}
.pd-testado{font-size:10.5px;text-transform:uppercase;color:var(--teal);font-weight:800;letter-spacing:.4px}
.pd-cons{display:flex;gap:12px;padding:8px 0;border-bottom:1px solid var(--bg)}
.pd-cons:last-child{border-bottom:none}
.pd-cfecha{font-weight:700;font-size:12.5px;color:var(--muted);min-width:78px;padding-top:1px}
.pd-cmotivo{font-weight:700;font-size:14px}
.pd-cdiag{color:var(--muted);font-size:12.5px;margin-top:1px}
.pd-none{color:var(--muted);font-size:13px;text-align:center;padding:6px 0}
.pd-btn{border:none;border-radius:12px;padding:12px 16px;font-size:14px;font-weight:700;cursor:pointer}
.pd-btn.primary{background:var(--teal);color:#fff}
.pd-btn.primary:hover{background:var(--teal-dark)}
.pd-btn.primary:disabled{opacity:.5;cursor:not-allowed}
.pd-btn.ghost{background:#fff;border:1px solid var(--line);color:var(--ink)}
.pd-foot{text-align:center;color:var(--muted);font-size:12px;margin-top:22px}
.pd-empty{text-align:center;color:var(--muted);padding:60px 20px;font-size:15px}
.pd-err{color:#C0492F}
.pd-overlay{position:fixed;inset:0;background:rgba(23,48,44,.5);display:flex;align-items:flex-end;justify-content:center;z-index:40}
@media(min-width:600px){.pd-overlay{align-items:center;padding:16px}}
.pd-modal{background:#fff;border-radius:18px 18px 0 0;width:100%;max-width:460px;padding:22px}
@media(min-width:600px){.pd-modal{border-radius:18px}}
.pd-modal h2{margin:0 0 2px;font-size:19px}
.pd-msub{color:var(--muted);font-size:13px;margin:0 0 16px}
.pd-field{margin-bottom:12px}
.pd-field label{display:block;font-size:12px;font-weight:700;color:var(--muted);margin-bottom:5px;text-transform:uppercase;letter-spacing:.5px}
.pd-field input{width:100%;border:1px solid var(--line);border-radius:12px;padding:12px;font-size:15px;background:#fff;color:var(--ink)}
.pd-field input:focus{outline:none;border-color:var(--teal)}
.pd-mactions{display:flex;gap:8px;margin-top:8px}.pd-mactions .pd-btn{flex:1}
.pd-toast{position:fixed;left:50%;transform:translateX(-50%);bottom:24px;background:var(--ink);color:#fff;padding:13px 20px;border-radius:14px;font-size:13.5px;z-index:60;box-shadow:0 4px 16px rgba(23,48,44,.25);max-width:90%;text-align:center}
`;

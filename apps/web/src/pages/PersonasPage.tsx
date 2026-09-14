import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import type { Sesion, Persona, Animal } from '../api/types';

export function PersonasPage({ sesion, personaIdInicial }: { sesion: Sesion; personaIdInicial?: string }) {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mostrarNuevo, setMostrarNuevo] = useState(false);
  const [editando, setEditando] = useState<Persona | null>(null);
  const [expandida, setExpandida] = useState<string | null>(personaIdInicial ?? null);
  const [busqueda, setBusqueda] = useState('');

  // Viene del Omnibox con una persona ya elegida: la deja expandida y
  // visible en el filtro apenas se cargó la lista.
  useEffect(() => {
    if (!personaIdInicial || personas.length === 0) return;
    const p = personas.find((x) => x.id === personaIdInicial);
    if (p) {
      setExpandida(p.id);
      setBusqueda(`${p.nombre} ${p.apellido}`.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personaIdInicial, personas.length]);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return personas;
    return personas.filter((p) =>
      `${p.nombre} ${p.apellido}`.toLowerCase().includes(q) ||
      (p.dni ?? '').toLowerCase().includes(q),
    );
  }, [personas, busqueda]);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      setPersonas(await api.personas(sesion));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="page-head">
        <h1>Dueños</h1>
        <button
          className="btn"
          onClick={() => {
            setEditando(null);
            setMostrarNuevo((v) => !v);
          }}
        >
          {mostrarNuevo ? 'Cerrar' : '+ Nuevo dueño'}
        </button>
      </div>

      {(mostrarNuevo || editando) && (
        <DuenoForm
          sesion={sesion}
          inicial={editando}
          onGuardado={() => {
            setMostrarNuevo(false);
            setEditando(null);
            cargar();
          }}
          onCancelar={() => {
            setMostrarNuevo(false);
            setEditando(null);
          }}
        />
      )}

      {error && <div className="alerta">{error}</div>}

      {!cargando && personas.length > 0 && (
        <input
          placeholder="Buscar por nombre o DNI…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            margin: '0 0 12px',
            border: '1px solid #DCE6E3',
            borderRadius: '10px',
            fontSize: '14px',
          }}
        />
      )}

      {cargando ? (
        <p className="muted">Cargando…</p>
      ) : personas.length === 0 ? (
        <p className="muted">Todavía no hay dueños. Creá el primero con “Nuevo dueño”.</p>
      ) : (
        <div className="card">
          <table className="tabla">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>DNI</th>
                <th>Contacto</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtradas.length === 0 ? (
                <tr>
                  <td colSpan={4} className="muted" style={{ textAlign: 'center', padding: '16px' }}>
                    Sin resultados para “{busqueda}”.
                  </td>
                </tr>
              ) : filtradas.map((p) => (
                <PersonaFila
                  key={p.id}
                  sesion={sesion}
                  persona={p}
                  abierta={expandida === p.id}
                  onToggle={() => setExpandida(expandida === p.id ? null : p.id)}
                  onEditar={() => {
                    setMostrarNuevo(false);
                    setEditando(p);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PersonaFila({
  sesion,
  persona,
  abierta,
  onToggle,
  onEditar,
}: {
  sesion: Sesion;
  persona: Persona;
  abierta: boolean;
  onToggle: () => void;
  onEditar: () => void;
}) {
  const [animales, setAnimales] = useState<Animal[] | null>(null);
  const [copiadoPortal, setCopiadoPortal] = useState(false);
  const [codigoPortal, setCodigoPortal] = useState<{ codigo: string; expiraEnMinutos: number } | null>(null);
  const [generandoCodigo, setGenerandoCodigo] = useState(false);
  const [errorCodigo, setErrorCodigo] = useState<string | null>(null);
  const [generando, setGenerando] = useState(false);
  const [errorPortal, setErrorPortal] = useState<string | null>(null);

  useEffect(() => {
    if (abierta && animales === null) {
      api.animalesDePersona(sesion, persona.id).then(setAnimales).catch(() => setAnimales([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierta]);

  const contacto = persona.celular || persona.telefono || persona.email || '—';

  // Con teléfono, manda el link directo por WhatsApp en vez de mostrar el
  // JWT larguísimo en pantalla para copiar a mano; sin teléfono, lo copia al
  // portapapeles. Mismo patrón que RecordatoriosPage.tsx. La ventana se abre
  // ANTES del await porque abrirla después suele quedar bloqueada por el
  // popup blocker al dejar de ser un gesto directo del click.
  async function generarAcceso() {
    setErrorPortal(null);
    setGenerando(true);
    setCopiadoPortal(false);
    const tel = persona.celular || persona.telefono || '';
    const ventana = tel ? window.open('', '_blank') : null;
    try {
      const r = await api.generarAccesoPortal(sesion, persona.id);
      api.registrarEvento(sesion, 'accion', 'portal-generar-acceso');
      const msg = `Hola${persona.nombre ? ' ' + persona.nombre : ''}, te compartimos el acceso al portal de tus mascotas: podés ver su historia clínica, vacunas y turnos acá → ${r.portalUrl}`;
      if (tel && ventana) {
        ventana.location.href = `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`;
      } else {
        await navigator.clipboard.writeText(r.portalUrl);
        setCopiadoPortal(true);
      }
    } catch (err) {
      ventana?.close();
      setErrorPortal(err instanceof Error ? err.message : 'No se pudo generar el acceso');
    } finally {
      setGenerando(false);
    }
  }

  async function generarCodigo() {
    setErrorCodigo(null);
    setGenerandoCodigo(true);
    try {
      const r = await api.generarCodigoPortal(sesion, persona.id);
      setCodigoPortal(r);
      api.registrarEvento(sesion, 'accion', 'portal-generar-codigo');
    } catch (err) {
      setErrorCodigo(err instanceof Error ? err.message : 'No se pudo generar el código');
    } finally {
      setGenerandoCodigo(false);
    }
  }

  return (
    <>
      <tr>
        <td>
          {persona.nombre} {persona.apellido}
        </td>
        <td className="mono">{persona.dni ?? '—'}</td>
        <td>{contacto}</td>
        <td className="acciones">
          <button className="link" onClick={onEditar}>
            Editar
          </button>
          <button className="link" onClick={onToggle}>
            {abierta ? 'Ocultar' : 'Ver mascotas'}
          </button>
        </td>
      </tr>
      {abierta && (
        <tr>
          <td colSpan={4}>
            {animales === null ? (
              <span className="muted">Cargando…</span>
            ) : animales.length === 0 ? (
              <span className="muted">Sin mascotas asociadas.</span>
            ) : (
              <div className="mascotas">
                {animales.map((a) => (
                  <span key={a.id} className="chip">
                    {a.nombre}
                    {a.codigoLegible ? ` · ${a.codigoLegible}` : ''}
                  </span>
                ))}
              </div>
            )}

            <div style={{ marginTop: '0.75rem', paddingTop: '0.6rem', borderTop: '1px solid #f0f1ee' }}>
              <button className="btn-ghost" onClick={generarAcceso} disabled={generando}>
                {generando
                  ? 'Generando…'
                  : copiadoPortal
                    ? 'Link copiado ✓'
                    : (persona.celular || persona.telefono)
                      ? 'Enviar portal'
                      : 'Copiar link portal'}
              </button>
              {errorPortal && <div className="alerta">{errorPortal}</div>}
            </div>

            <div style={{ marginTop: '0.5rem', paddingTop: '0.6rem', borderTop: '1px solid #f0f1ee' }}>
              {codigoPortal ? (
                <div className="dato">
                  <span className="dato-label">
                    Código de acceso a huella.app/portal (se cierra a los {codigoPortal.expiraEnMinutos} minutos sin uso, se puede volver a ingresar) — decíselo o anotáselo al dueño
                  </span>
                  <span className="mono" style={{ fontSize: '1.1rem', letterSpacing: '0.08em' }}>{codigoPortal.codigo}</span>
                </div>
              ) : (
                <button
                  className="btn-ghost"
                  onClick={generarCodigo}
                  disabled={generandoCodigo || !persona.dni}
                  title={!persona.dni ? 'Cargá el DNI del dueño primero' : undefined}
                >
                  {generandoCodigo ? 'Generando…' : 'Generar código'}
                </button>
              )}
              {errorCodigo && <div className="alerta">{errorCodigo}</div>}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function DuenoForm({
  sesion,
  inicial,
  onGuardado,
  onCancelar,
}: {
  sesion: Sesion;
  inicial?: Persona | null;
  onGuardado: () => void;
  onCancelar: () => void;
}) {
  const esEdicion = !!inicial;
  const [dni, setDni] = useState(inicial?.dni ?? '');
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [apellido, setApellido] = useState(inicial?.apellido ?? '');
  const [sexo, setSexo] = useState(inicial?.sexo ?? '');
  const [fechaNacimiento, setFechaNacimiento] = useState(inicial?.fechaNacimiento ?? '');
  const [celular, setCelular] = useState(inicial?.celular ?? '');
  const [email, setEmail] = useState(inicial?.email ?? '');
  const [domicilio, setDomicilio] = useState(inicial?.domicilio ?? '');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    if (!dni.trim() || !celular.trim()) {
      setError('DNI y celular son obligatorios');
      setGuardando(false);
      return;
    }
    try {
      const data: Record<string, unknown> = { nombre, apellido, dni: dni.trim(), celular: celular.trim() };
      data.sexo = sexo || undefined;
      data.fechaNacimiento = fechaNacimiento || undefined;
      data.email = email || undefined;
      data.domicilio = domicilio || undefined;
      if (esEdicion && inicial) {
        await api.actualizarPersona(sesion, inicial.id, data);
        api.registrarEvento(sesion, 'accion', 'dueno-editar');
      } else {
        await api.crearPersona(sesion, data);
        api.registrarEvento(sesion, 'accion', 'dueno-crear');
      }
      onGuardado();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="card form-grid" onSubmit={guardar}>
      <div className="form-titulo span-2">{esEdicion ? 'Editar dueño' : 'Nuevo dueño'}</div>
      <label>
        Nombre
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
      </label>
      <label>
        Apellido
        <input value={apellido} onChange={(e) => setApellido(e.target.value)} required />
      </label>
      <label>
        DNI
        <input value={dni} onChange={(e) => setDni(e.target.value)} required />
      </label>
      <label>
        Sexo
        <select value={sexo} onChange={(e) => setSexo(e.target.value)}>
          <option value="">—</option>
          <option value="masculino">Masculino</option>
          <option value="femenino">Femenino</option>
          <option value="otro">Otro</option>
        </select>
      </label>
      <label>
        Fecha de nacimiento
        <input type="date" value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} />
      </label>
      <label>
        Celular
        <input value={celular} onChange={(e) => setCelular(e.target.value)} required />
      </label>
      <label className="span-2">
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="span-2">
        Domicilio
        <input value={domicilio} onChange={(e) => setDomicilio(e.target.value)} placeholder="Calle, número, localidad…" />
      </label>
      {error && <div className="alerta span-2">{error}</div>}
      <div className="span-2 acciones">
        <button className="btn" type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Guardar dueño'}
        </button>
        <button className="btn-ghost" type="button" onClick={onCancelar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

// apps/web/src/pages/AdminPage.tsx
import { useEffect, useState } from 'react';
import {
  login, getToken, clearToken,
  listarOrganizaciones, crearOrganizacion, listarMiembros, agregarMiembro,
  setOrgActivo, eliminarOrg, exportarOrg, quitarMiembro, setMiembroActivo, setMiembroRoles,
  setAcceso,
  listarGrupos, crearGrupo, actualizarGrupo, eliminarGrupo,
  listarPlanes, crearPlan, actualizarPlan, eliminarPlan,
  listarMensajesAdmin, crearMensaje, eliminarMensaje,
  type Organizacion, type Miembro, type Grupo, type Plan, type MensajeAdmin, type DestinatarioTipo,
} from '../api/admin';
import { listarSolicitudes, aprobarSolicitud, rechazarSolicitud, type Solicitud } from '../api/solicitudes';

const ROLES: Array<{ v: string; label: string }> = [
  { v: 'veterinario', label: 'Veterinario' },
  { v: 'recepcion', label: 'Administrativa / Recepción' },
  { v: 'admin', label: 'Administrador' },
  { v: 'capataz', label: 'Capataz' },
  { v: 'propietario', label: 'Propietario' },
];
const rolLabel = (v: string) => ROLES.find((r) => r.v === v)?.label ?? v;

export default function AdminPage() {
  const [logueado, setLogueado] = useState(!!getToken());

  if (!logueado) return <Login onOk={() => setLogueado(true)} />;
  return <Panel onSalir={() => { clearToken(); setLogueado(false); }} />;
}

// ── Login ───────────────────────────────────────────────────────────────
function Login({ onOk }: { onOk: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function entrar() {
    setCargando(true); setError(null);
    try { await login(email.trim(), password); onOk(); }
    catch (e: any) { setError(e.message ?? 'No se pudo iniciar sesión'); }
    finally { setCargando(false); }
  }

  return (
    <Shell>
      <div className="adm-loginbox">
        <h2>Administración de plataforma</h2>
        <p className="adm-sub">Ingresá con tu cuenta de super-admin.</p>
        <div className="adm-field"><label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="adm-field"><label>Contraseña</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && entrar()} /></div>
        {error && <div className="adm-error">{error}</div>}
        <button className="adm-btn primary" style={{ width: '100%' }} disabled={cargando} onClick={entrar}>
          {cargando ? 'Ingresando…' : 'Ingresar'}
        </button>
      </div>
    </Shell>
  );
}

// ── Panel principal ───────────────────────────────────────────────────────
type Seccion = 'veterinarias' | 'planes' | 'grupos' | 'mensajes';

function Panel({ onSalir }: { onSalir: () => void }) {
  const [seccion, setSeccion] = useState<Seccion>('veterinarias');
  const [orgs, setOrgs] = useState<Organizacion[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [sel, setSel] = useState<Organizacion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  async function cargarOrgs() {
    setCargando(true); setError(null);
    try { setOrgs(await listarOrganizaciones()); }
    catch (e: any) {
      setError(e.message?.includes('403') || /super/i.test(e.message)
        ? 'Tu cuenta no es super-admin de plataforma.'
        : (e.message ?? 'Error al cargar'));
    } finally { setCargando(false); }
  }
  useEffect(() => {
    cargarOrgs();
    listarGrupos().then(setGrupos).catch(() => {});
    listarPlanes().then(setPlanes).catch(() => {});
  }, []);

  return (
    <Shell onSalir={onSalir}>
      <div className="adm-secnav">
        {(['veterinarias', 'planes', 'grupos', 'mensajes'] as const).map((s) => (
          <button
            key={s}
            className={`adm-secbtn ${seccion === s ? 'active' : ''}`}
            onClick={() => setSeccion(s)}
          >
            {s === 'veterinarias' ? 'Veterinarias' : s === 'planes' ? 'Planes' : s === 'grupos' ? 'Grupos' : 'Mensajes'}
          </button>
        ))}
      </div>

      {error && <div className="adm-error" style={{ marginBottom: 12 }}>{error}</div>}

      {seccion === 'veterinarias' && (
        <>
          <Solicitudes orgs={orgs} />
          <div className="adm-cols">
            <div className="adm-col">
              <h3>Veterinarias</h3>
              {cargando ? <p className="adm-muted">Cargando…</p> : (
                <>
                  <div className="adm-list">
                    {orgs.length === 0 && <p className="adm-muted">Todavía no hay veterinarias.</p>}
                    {orgs.map((o) => (
                      <button key={o.id} className={`adm-item ${sel?.id === o.id ? 'active' : ''}`} onClick={() => setSel(o)}>
                        <b>{o.nombre}</b><span>{o.activo === false ? 'inactiva' : o.tipo}</span>
                      </button>
                    ))}
                  </div>
                  <NuevaOrg onCreada={(o) => { setOrgs((prev) => [...prev, o].sort((a, b) => a.nombre.localeCompare(b.nombre))); setSel(o); }} />
                </>
              )}
            </div>

            <div className="adm-col">
              {sel ? (
                <Miembros
                  org={sel}
                  grupos={grupos}
                  planes={planes}
                  onOrgActualizada={cargarOrgs}
                  onOrgEliminada={() => { cargarOrgs(); setSel(null); }}
                />
              ) : <p className="adm-muted">Elegí una veterinaria para ver y agregar sus miembros.</p>}
            </div>
          </div>
        </>
      )}

      {seccion === 'planes' && <Planes planes={planes} onCambio={() => listarPlanes().then(setPlanes)} />}
      {seccion === 'grupos' && <Grupos grupos={grupos} onCambio={() => listarGrupos().then(setGrupos)} />}
      {seccion === 'mensajes' && <Mensajes orgs={orgs} grupos={grupos} />}
    </Shell>
  );
}

// ── Nueva veterinaria ─────────────────────────────────────────────────────
function NuevaOrg({ onCreada }: { onCreada: (o: Organizacion) => void }) {
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('clinica');
  const [cuit, setCuit] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function crear() {
    if (nombre.trim().length < 2) { setError('Poné un nombre'); return; }
    setCargando(true); setError(null);
    try {
      const o = await crearOrganizacion({ nombre: nombre.trim(), tipo, cuit: cuit.trim() || undefined });
      setNombre(''); setCuit(''); onCreada(o);
    } catch (e: any) { setError(e.message ?? 'No se pudo crear'); }
    finally { setCargando(false); }
  }

  return (
    <div className="adm-formcard">
      <h4>Nueva veterinaria</h4>
      <div className="adm-field"><label>Nombre</label>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Veterinaria San Roque" /></div>
      <div className="adm-row2">
        <div className="adm-field"><label>Tipo</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="clinica">Clínica</option>
            <option value="establecimiento">Establecimiento</option>
            <option value="mixta">Mixta</option>
          </select></div>
        <div className="adm-field"><label>CUIT (opcional)</label>
          <input value={cuit} onChange={(e) => setCuit(e.target.value)} /></div>
      </div>
      {error && <div className="adm-error">{error}</div>}
      <button className="adm-btn primary" disabled={cargando} onClick={crear}>
        {cargando ? 'Creando…' : 'Crear veterinaria'}
      </button>
    </div>
  );
}

// ── Miembros de una veterinaria ───────────────────────────────────────────
function Miembros({ org, grupos, planes, onOrgActualizada, onOrgEliminada }: {
  org: Organizacion;
  grupos: Grupo[];
  planes: Plan[];
  onOrgActualizada: () => void;
  onOrgEliminada: () => void;
}) {
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accion, setAccion] = useState<string | null>(null);
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);
  const [editandoRoles, setEditandoRoles] = useState<string | null>(null);

  async function cargar() {
    setCargando(true); setError(null);
    try { setMiembros(await listarMiembros(org.id)); }
    catch (e: any) { setError(e.message ?? 'Error al cargar miembros'); }
    finally { setCargando(false); }
  }
  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [org.id]);

  const activa = org.activo !== false;

  async function toggleActivo() {
    setAccion('activo'); setError(null);
    try { await setOrgActivo(org.id, !activa); onOrgActualizada(); }
    catch (e: any) { setError(e.message ?? 'No se pudo cambiar el estado'); }
    finally { setAccion(null); }
  }
  async function exportar() {
    setAccion('export'); setError(null);
    try { await exportarOrg(org.id, org.nombre); }
    catch (e: any) { setError(e.message ?? 'No se pudo exportar'); }
    finally { setAccion(null); }
  }
  async function toggleMiembro(m: Miembro) {
    setError(null);
    try { await setMiembroActivo(org.id, m.membresiaId, !m.activo); cargar(); }
    catch (e: any) { setError(e.message ?? 'No se pudo actualizar el miembro'); }
  }
  async function quitar(m: Miembro) {
    setError(null);
    try { await quitarMiembro(org.id, m.membresiaId); cargar(); }
    catch (e: any) { setError(e.message ?? 'No se pudo quitar el miembro'); }
  }
  async function guardarRoles(m: Miembro, roles: string[]) {
    setError(null);
    try { await setMiembroRoles(org.id, m.membresiaId, roles); setEditandoRoles(null); cargar(); }
    catch (e: any) { setError(e.message ?? 'No se pudieron actualizar los roles'); }
  }

  return (
    <>
      <h3>{org.nombre} {!activa && <span className="adm-tag-off">inactiva</span>}</h3>

      <div className="adm-lifebar">
        <button className="adm-btn ghost" disabled={accion === 'activo'} onClick={toggleActivo}>
          {activa ? 'Desactivar' : 'Reactivar'}
        </button>
        <button className="adm-btn ghost" disabled={accion === 'export'} onClick={exportar}>
          {accion === 'export' ? 'Exportando…' : 'Exportar datos'}
        </button>
        <button className="adm-btn danger" onClick={() => setConfirmarEliminar(true)}>Eliminar</button>
      </div>

      {error && <div className="adm-error">{error}</div>}

      <AccesoOrg org={org} grupos={grupos} planes={planes} onActualizada={onOrgActualizada} />

      <h4 className="adm-h4">Miembros</h4>
      {cargando ? <p className="adm-muted">Cargando…</p> : (
        <div className="adm-list">
          {miembros.length === 0 && <p className="adm-muted">Sin miembros todavía.</p>}
          {miembros.map((m) => (
            <div key={m.membresiaId} className="adm-miembro-block">
              <div className="adm-miembro">
                <div>
                  <b>
                    {[m.nombre, m.apellido].filter(Boolean).join(' ') || m.email}
                    {!m.activo && <span className="adm-tag-off"> inactivo</span>}
                  </b>
                  <span>{m.email}</span>
                </div>
                <div className="adm-miembro-acc">
                  {m.roles.map((r) => <span key={r} className="adm-rol">{rolLabel(r)}</span>)}
                  <button className="adm-mini" onClick={() => setEditandoRoles(editandoRoles === m.membresiaId ? null : m.membresiaId)}>
                    {editandoRoles === m.membresiaId ? 'Cancelar' : 'Editar roles'}
                  </button>
                  <button className="adm-mini" onClick={() => toggleMiembro(m)}>{m.activo ? 'Desactivar' : 'Activar'}</button>
                  <button className="adm-mini danger" onClick={() => quitar(m)}>Quitar</button>
                </div>
              </div>
              {editandoRoles === m.membresiaId && (
                <RolesCheckboxes valorInicial={m.roles} onGuardar={(roles) => guardarRoles(m, roles)} />
              )}
            </div>
          ))}
        </div>
      )}

      <AgregarMiembroForm org={org} onAgregado={cargar} />

      {confirmarEliminar && (
        <EliminarModal
          org={org}
          onClose={() => setConfirmarEliminar(false)}
          onEliminada={() => { setConfirmarEliminar(false); onOrgEliminada(); }}
        />
      )}
    </>
  );
}

function EliminarModal({ org, onClose, onEliminada }: {
  org: Organizacion; onClose: () => void; onEliminada: () => void;
}) {
  const [texto, setTexto] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [borrando, setBorrando] = useState(false);
  const coincide = texto.trim() === org.nombre.trim();

  async function eliminar() {
    if (!coincide) return;
    setBorrando(true); setError(null);
    try { await eliminarOrg(org.id); onEliminada(); }
    catch (e: any) { setError(e.message ?? 'No se pudo eliminar'); setBorrando(false); }
  }

  return (
    <div className="adm-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="adm-modal">
        <h2>Eliminar veterinaria</h2>
        <p className="adm-sub">
          Esto borra <b>{org.nombre}</b> y <b>todos</b> sus registros (dueños, animales,
          historia, turnos). No se puede deshacer. Exportá los datos antes si los necesitás.
        </p>
        <div className="adm-field">
          <label>Escribí el nombre para confirmar</label>
          <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={org.nombre} />
        </div>
        {error && <div className="adm-error">{error}</div>}
        <div className="adm-mactions">
          <button className="adm-btn ghost" onClick={onClose}>Cancelar</button>
          <button className="adm-btn danger" disabled={!coincide || borrando} onClick={eliminar}>
            {borrando ? 'Eliminando…' : 'Eliminar definitivamente'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Checkboxes de roles apilables (controlado), reusado en alta de miembro y edición de roles existentes. */
function RolesFieldset({ roles, onToggle }: { roles: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="adm-roles-checks">
      {ROLES.map((r) => (
        <label key={r.v} className="adm-check">
          <input type="checkbox" checked={roles.includes(r.v)} onChange={() => onToggle(r.v)} />
          {r.label}
        </label>
      ))}
    </div>
  );
}

/** Editor inline de los roles de una membresía existente (checkboxes + guardar). */
function RolesCheckboxes({ valorInicial, onGuardar, textoBoton = 'Guardar roles' }: {
  valorInicial: string[];
  onGuardar: (roles: string[]) => void;
  textoBoton?: string;
}) {
  const [roles, setRoles] = useState<string[]>(valorInicial);
  const toggle = (v: string) => setRoles((prev) => (prev.includes(v) ? prev.filter((r) => r !== v) : [...prev, v]));

  return (
    <div className="adm-formcard">
      <RolesFieldset roles={roles} onToggle={toggle} />
      <button className="adm-btn primary" disabled={roles.length === 0} onClick={() => onGuardar(roles)}>
        {textoBoton}
      </button>
    </div>
  );
}

function AgregarMiembroForm({ org, onAgregado }: { org: Organizacion; onAgregado: () => void }) {
  const [email, setEmail] = useState('');
  const [roles, setRoles] = useState<string[]>(['veterinario']);
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const toggleRol = (v: string) => setRoles((prev) => (prev.includes(v) ? prev.filter((r) => r !== v) : [...prev, v]));

  async function agregar() {
    if (roles.length === 0) { setError('Elegí al menos un rol'); return; }
    setCargando(true); setError(null); setMsg(null);
    try {
      const r = await agregarMiembro(org.id, {
        email: email.trim(), roles,
        nombre: nombre.trim() || undefined,
        apellido: apellido.trim() || undefined,
        password: password || undefined,
      });
      setMsg(r.creado ? 'Usuario creado y asignado ✓' : 'Usuario existente asignado ✓');
      setEmail(''); setNombre(''); setApellido(''); setPassword('');
      onAgregado();
    } catch (e: any) { setError(e.message ?? 'No se pudo agregar'); }
    finally { setCargando(false); }
  }

  return (
    <div className="adm-formcard">
      <h4>Agregar miembro</h4>
      <div className="adm-field"><label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vet@ejemplo.com" /></div>
      <div className="adm-field">
        <label>Roles <span className="adm-hint">(puede tener más de uno)</span></label>
        <RolesFieldset roles={roles} onToggle={toggleRol} />
      </div>
      <div className="adm-row2">
        <div className="adm-field"><label>Nombre</label>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} /></div>
        <div className="adm-field"><label>Apellido</label>
          <input value={apellido} onChange={(e) => setApellido(e.target.value)} /></div>
      </div>
      <div className="adm-field">
        <label>Contraseña <span className="adm-hint">(solo si el usuario es nuevo)</span></label>
        <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="mínimo 6 caracteres" />
      </div>
      {error && <div className="adm-error">{error}</div>}
      {msg && <div className="adm-ok">{msg}</div>}
      <button className="adm-btn primary" disabled={cargando || !email} onClick={agregar}>
        {cargando ? 'Agregando…' : 'Agregar a la veterinaria'}
      </button>
    </div>
  );
}

// ── Acceso: grupo, plan, vencimiento/demo ──────────────────────────────────
function AccesoOrg({ org, grupos, planes, onActualizada }: {
  org: Organizacion; grupos: Grupo[]; planes: Plan[]; onActualizada: () => void;
}) {
  const [grupoId, setGrupoId] = useState(org.grupoId ?? '');
  const [planId, setPlanId] = useState(org.planId ?? '');
  const [accesoHasta, setAccesoHasta] = useState(org.accesoHasta ? org.accesoHasta.slice(0, 10) : '');
  const [esDemo, setEsDemo] = useState(!!org.esDemo);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [ok, setOk] = useState(false);

  // Si se selecciona otra organización, resetear el formulario a sus valores.
  useEffect(() => {
    setGrupoId(org.grupoId ?? '');
    setPlanId(org.planId ?? '');
    setAccesoHasta(org.accesoHasta ? org.accesoHasta.slice(0, 10) : '');
    setEsDemo(!!org.esDemo);
    setOk(false);
  }, [org.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const vencido = accesoHasta ? new Date(accesoHasta) < new Date() : false;

  async function guardar() {
    setGuardando(true); setError(null); setOk(false);
    try {
      await setAcceso(org.id, {
        grupoId: grupoId || null,
        planId: planId || null,
        accesoHasta: accesoHasta ? new Date(accesoHasta).toISOString() : null,
        esDemo,
      });
      setOk(true);
      onActualizada();
    } catch (e: any) { setError(e.message ?? 'No se pudo guardar el acceso'); }
    finally { setGuardando(false); }
  }

  function extender(dias: number) {
    const base = accesoHasta && new Date(accesoHasta) > new Date() ? new Date(accesoHasta) : new Date();
    base.setDate(base.getDate() + dias);
    setAccesoHasta(base.toISOString().slice(0, 10));
  }

  return (
    <div className="adm-formcard">
      <h4>Acceso</h4>
      <div className="adm-row2">
        <div className="adm-field"><label>Grupo</label>
          <select value={grupoId} onChange={(e) => setGrupoId(e.target.value)}>
            <option value="">Sin grupo</option>
            {grupos.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
          </select></div>
        <div className="adm-field"><label>Plan</label>
          <select value={planId} onChange={(e) => setPlanId(e.target.value)}>
            <option value="">Sin plan</option>
            {planes.map((p) => <option key={p.id} value={p.id}>{p.nombre}{p.precio ? ` — $${p.precio}` : ''}</option>)}
          </select></div>
      </div>
      <div className="adm-row2">
        <div className="adm-field">
          <label>Acceso habilitado hasta {vencido && <span className="adm-tag-off"> vencido</span>}</label>
          <input type="date" value={accesoHasta} onChange={(e) => setAccesoHasta(e.target.value)} />
        </div>
        <div className="adm-field">
          <label>Es demo</label>
          <select value={esDemo ? '1' : '0'} onChange={(e) => setEsDemo(e.target.value === '1')}>
            <option value="0">No</option>
            <option value="1">Sí</option>
          </select>
        </div>
      </div>
      <div className="adm-lifebar">
        <button className="adm-btn ghost" onClick={() => extender(7)}>+7 días</button>
        <button className="adm-btn ghost" onClick={() => extender(30)}>+30 días</button>
        <button className="adm-btn ghost" onClick={() => setAccesoHasta('')}>Sin vencimiento</button>
      </div>
      {error && <div className="adm-error">{error}</div>}
      {ok && <div className="adm-ok">Acceso actualizado ✓</div>}
      <button className="adm-btn primary" disabled={guardando} onClick={guardar}>
        {guardando ? 'Guardando…' : 'Guardar acceso'}
      </button>
    </div>
  );
}

// ── Planes ─────────────────────────────────────────────────────────────
function Planes({ planes, onCambio }: { planes: Plan[]; onCambio: () => void }) {
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function crear() {
    if (nombre.trim().length < 2) { setError('Poné un nombre'); return; }
    setCargando(true); setError(null);
    try {
      await crearPlan({ nombre: nombre.trim(), precio: precio ? Number(precio) : undefined, descripcion: descripcion.trim() || undefined });
      setNombre(''); setPrecio(''); setDescripcion(''); onCambio();
    } catch (e: any) { setError(e.message ?? 'No se pudo crear'); }
    finally { setCargando(false); }
  }
  async function toggleActivo(p: Plan) {
    try { await actualizarPlan(p.id, { activo: !p.activo }); onCambio(); }
    catch (e: any) { setError(e.message ?? 'No se pudo actualizar'); }
  }
  async function eliminar(p: Plan) {
    try { await eliminarPlan(p.id); onCambio(); }
    catch (e: any) { setError(e.message ?? 'No se pudo eliminar'); }
  }

  return (
    <div>
      <h3>Planes</h3>
      {error && <div className="adm-error">{error}</div>}
      <div className="adm-list">
        {planes.length === 0 && <p className="adm-muted">Todavía no hay planes.</p>}
        {planes.map((p) => (
          <div key={p.id} className="adm-miembro">
            <div>
              <b>{p.nombre} {!p.activo && <span className="adm-tag-off">inactivo</span>}</b>
              <span>{p.precio ? `$${p.precio}` : 'Sin precio'}{p.descripcion ? ` · ${p.descripcion}` : ''}</span>
            </div>
            <div className="adm-miembro-acc">
              <button className="adm-mini" onClick={() => toggleActivo(p)}>{p.activo ? 'Desactivar' : 'Activar'}</button>
              <button className="adm-mini danger" onClick={() => eliminar(p)}>Eliminar</button>
            </div>
          </div>
        ))}
      </div>
      <div className="adm-formcard">
        <h4>Nuevo plan</h4>
        <div className="adm-row2">
          <div className="adm-field"><label>Nombre</label>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Plan Básico" /></div>
          <div className="adm-field"><label>Precio (opcional)</label>
            <input type="number" value={precio} onChange={(e) => setPrecio(e.target.value)} /></div>
        </div>
        <div className="adm-field"><label>Descripción (opcional)</label>
          <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} /></div>
        <button className="adm-btn primary" disabled={cargando} onClick={crear}>
          {cargando ? 'Creando…' : 'Crear plan'}
        </button>
      </div>
    </div>
  );
}

// ── Grupos de organizaciones ──────────────────────────────────────────────
function Grupos({ grupos, onCambio }: { grupos: Grupo[]; onCambio: () => void }) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function crear() {
    if (nombre.trim().length < 2) { setError('Poné un nombre'); return; }
    setCargando(true); setError(null);
    try {
      await crearGrupo({ nombre: nombre.trim(), descripcion: descripcion.trim() || undefined });
      setNombre(''); setDescripcion(''); onCambio();
    } catch (e: any) { setError(e.message ?? 'No se pudo crear'); }
    finally { setCargando(false); }
  }
  async function eliminar(g: Grupo) {
    try { await eliminarGrupo(g.id); onCambio(); }
    catch (e: any) { setError(e.message ?? 'No se pudo eliminar'); }
  }

  return (
    <div>
      <h3>Grupos de organizaciones</h3>
      <p className="adm-sub">Sirven para agrupar organizaciones (ej. "cadena de veterinarias") y poder dirigirles mensajes en conjunto.</p>
      {error && <div className="adm-error">{error}</div>}
      <div className="adm-list">
        {grupos.length === 0 && <p className="adm-muted">Todavía no hay grupos.</p>}
        {grupos.map((g) => (
          <div key={g.id} className="adm-miembro">
            <div>
              <b>{g.nombre}</b>
              {g.descripcion && <span>{g.descripcion}</span>}
            </div>
            <div className="adm-miembro-acc">
              <button className="adm-mini danger" onClick={() => eliminar(g)}>Eliminar</button>
            </div>
          </div>
        ))}
      </div>
      <div className="adm-formcard">
        <h4>Nuevo grupo</h4>
        <div className="adm-field"><label>Nombre</label>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Cadena de veterinarias" /></div>
        <div className="adm-field"><label>Descripción (opcional)</label>
          <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} /></div>
        <button className="adm-btn primary" disabled={cargando} onClick={crear}>
          {cargando ? 'Creando…' : 'Crear grupo'}
        </button>
      </div>
    </div>
  );
}

// ── Mensajes de la plataforma ─────────────────────────────────────────────
function Mensajes({ orgs, grupos }: { orgs: Organizacion[]; grupos: Grupo[] }) {
  const [items, setItems] = useState<MensajeAdmin[]>([]);
  const [titulo, setTitulo] = useState('');
  const [cuerpo, setCuerpo] = useState('');
  const [destinatarioTipo, setDestinatarioTipo] = useState<DestinatarioTipo>('todas');
  const [organizacionId, setOrganizacionId] = useState('');
  const [grupoId, setGrupoId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function cargar() {
    try { setItems(await listarMensajesAdmin()); }
    catch (e: any) { setError(e.message ?? 'Error al cargar mensajes'); }
  }
  useEffect(() => { cargar(); }, []);

  async function enviar() {
    if (titulo.trim().length < 2 || cuerpo.trim().length < 2) { setError('Completá título y cuerpo'); return; }
    if (destinatarioTipo === 'organizacion' && !organizacionId) { setError('Elegí la organización destino'); return; }
    if (destinatarioTipo === 'grupo' && !grupoId) { setError('Elegí el grupo destino'); return; }
    setCargando(true); setError(null);
    try {
      await crearMensaje({
        titulo: titulo.trim(), cuerpo: cuerpo.trim(), destinatarioTipo,
        organizacionId: destinatarioTipo === 'organizacion' ? organizacionId : undefined,
        grupoId: destinatarioTipo === 'grupo' ? grupoId : undefined,
      });
      setTitulo(''); setCuerpo('');
      cargar();
    } catch (e: any) { setError(e.message ?? 'No se pudo enviar'); }
    finally { setCargando(false); }
  }
  async function eliminar(m: MensajeAdmin) {
    try { await eliminarMensaje(m.id); cargar(); }
    catch (e: any) { setError(e.message ?? 'No se pudo eliminar'); }
  }

  function destinoLabel(m: MensajeAdmin) {
    if (m.destinatarioTipo === 'todas') return 'Todas las organizaciones';
    if (m.destinatarioTipo === 'organizacion') return orgs.find((o) => o.id === m.organizacionId)?.nombre ?? 'Organización';
    return grupos.find((g) => g.id === m.grupoId)?.nombre ?? 'Grupo';
  }

  return (
    <div>
      <h3>Mensajes de la plataforma</h3>
      <p className="adm-sub">Anuncios (no chat) que se muestran como banner al loguearse — ej. avisos de precio o de funcionalidades nuevas.</p>
      {error && <div className="adm-error">{error}</div>}

      <div className="adm-formcard">
        <h4>Nuevo mensaje</h4>
        <div className="adm-field"><label>Título</label>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} /></div>
        <div className="adm-field"><label>Cuerpo</label>
          <input value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} /></div>
        <div className="adm-row2">
          <div className="adm-field"><label>Destinatario</label>
            <select value={destinatarioTipo} onChange={(e) => setDestinatarioTipo(e.target.value as DestinatarioTipo)}>
              <option value="todas">Todas las organizaciones</option>
              <option value="organizacion">Una organización</option>
              <option value="grupo">Un grupo</option>
            </select></div>
          {destinatarioTipo === 'organizacion' && (
            <div className="adm-field"><label>Organización</label>
              <select value={organizacionId} onChange={(e) => setOrganizacionId(e.target.value)}>
                <option value="">Elegir…</option>
                {orgs.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
              </select></div>
          )}
          {destinatarioTipo === 'grupo' && (
            <div className="adm-field"><label>Grupo</label>
              <select value={grupoId} onChange={(e) => setGrupoId(e.target.value)}>
                <option value="">Elegir…</option>
                {grupos.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
              </select></div>
          )}
        </div>
        <button className="adm-btn primary" disabled={cargando} onClick={enviar}>
          {cargando ? 'Enviando…' : 'Enviar'}
        </button>
      </div>

      <h4 className="adm-h4">Enviados</h4>
      <div className="adm-list">
        {items.length === 0 && <p className="adm-muted">Todavía no se envió ningún mensaje.</p>}
        {items.map((m) => (
          <div key={m.id} className="adm-miembro">
            <div>
              <b>{m.titulo}</b>
              <span>{destinoLabel(m)} · {new Date(m.publicadoEn).toLocaleDateString()}</span>
            </div>
            <div className="adm-miembro-acc">
              <button className="adm-mini danger" onClick={() => eliminar(m)}>Eliminar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Bandeja de solicitudes ────────────────────────────────────────────────
function Solicitudes({ orgs }: { orgs: Organizacion[] }) {
  const [items, setItems] = useState<Solicitud[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function cargar() {
    setCargando(true); setError(null);
    try { setItems(await listarSolicitudes('pendiente')); }
    catch (e: any) { setError(e.message ?? 'Error al cargar solicitudes'); }
    finally { setCargando(false); }
  }
  useEffect(() => { cargar(); }, []);

  if (cargando) return null;
  if (error) return <div className="adm-error" style={{ marginBottom: 12 }}>{error}</div>;
  if (items.length === 0) return null;

  return (
    <div className="adm-solbox">
      <h3>Solicitudes pendientes <span className="adm-badge">{items.length}</span></h3>
      <div className="adm-list">
        {items.map((s) => <SolicitudCard key={s.id} s={s} orgs={orgs} onResuelta={cargar} />)}
      </div>
    </div>
  );
}

function SolicitudCard({ s, orgs, onResuelta }: { s: Solicitud; orgs: Organizacion[]; onResuelta: () => void }) {
  const [orgId, setOrgId] = useState('');
  const [rol, setRol] = useState('veterinario');
  const [error, setError] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);

  async function aprobar() {
    if (s.tipo === 'unirse' && !orgId) { setError('Elegí la veterinaria destino'); return; }
    setTrabajando(true); setError(null);
    try {
      await aprobarSolicitud(s.id, s.tipo === 'unirse' ? { organizacionId: orgId, rol } : {});
      onResuelta();
    } catch (e: any) { setError(e.message ?? 'No se pudo aprobar'); setTrabajando(false); }
  }
  async function rechazar() {
    setTrabajando(true); setError(null);
    try { await rechazarSolicitud(s.id); onResuelta(); }
    catch (e: any) { setError(e.message ?? 'No se pudo rechazar'); setTrabajando(false); }
  }

  return (
    <div className="adm-solcard">
      <div className="adm-solhead">
        <div>
          <b>{s.nombre} {s.apellido}</b>
          <span>{s.email}{s.telefono ? ` · ${s.telefono}` : ''}</span>
        </div>
        <span className="adm-rol">{s.tipo === 'crear' ? 'Crear' : 'Unirse'}</span>
      </div>
      <div className="adm-soldesc">
        {s.tipo === 'crear'
          ? <>Quiere crear <b>{s.nombreOrganizacion}</b> ({s.tipoOrganizacion})</>
          : <>Quiere unirse a <b>{s.organizacionSolicitada}</b></>}
      </div>

      {s.tipo === 'unirse' && (
        <div className="adm-row2" style={{ marginTop: 8 }}>
          <div className="adm-field" style={{ margin: 0 }}>
            <label>Veterinaria destino</label>
            <select value={orgId} onChange={(e) => setOrgId(e.target.value)}>
              <option value="">Elegir…</option>
              {orgs.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
            </select>
          </div>
          <div className="adm-field" style={{ margin: 0 }}>
            <label>Rol</label>
            <select value={rol} onChange={(e) => setRol(e.target.value)}>
              <option value="veterinario">Veterinario</option>
              <option value="recepcion">Administrativa / Recepción</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
        </div>
      )}

      {error && <div className="adm-error">{error}</div>}
      <div className="adm-solactions">
        <button className="adm-btn ghost" disabled={trabajando} onClick={rechazar}>Rechazar</button>
        <button className="adm-btn primary" disabled={trabajando} onClick={aprobar}>Aprobar</button>
      </div>
    </div>
  );
}

// ── Shell + estilos ───────────────────────────────────────────────────────
function Shell({ children, onSalir }: { children: React.ReactNode; onSalir?: () => void }) {
  return (
    <div className="adm-root">
      <style>{CSS}</style>
      <div className="adm-topbar">
        <svg width="24" height="24" viewBox="0 0 100 100"><g fill="#fff">
          <ellipse cx="50" cy="66" rx="22" ry="18" /><ellipse cx="24" cy="44" rx="8.5" ry="11" />
          <ellipse cx="41" cy="30" rx="8.5" ry="12" /><ellipse cx="59" cy="30" rx="8.5" ry="12" />
          <ellipse cx="76" cy="44" rx="8.5" ry="11" /></g></svg>
        <span>Huella · Administración</span>
        {onSalir && <button className="adm-salir" onClick={onSalir}>Salir</button>}
      </div>
      <div className="adm-wrap">{children}</div>
    </div>
  );
}

const CSS = `
.adm-root{--teal:#0E7C6B;--teal-dark:#0A5C50;--ink:#17302C;--muted:#6B807B;--line:#DCE6E3;--bg:#F3F8F6;
  min-height:100vh;background:var(--bg);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
.adm-root *{box-sizing:border-box}
.adm-topbar{background:var(--teal);color:#fff;padding:14px 18px;display:flex;align-items:center;gap:8px;font-weight:800;font-size:17px;position:sticky;top:0;z-index:10}
.adm-salir{margin-left:auto;background:rgba(255,255,255,.15);color:#fff;border:none;border-radius:9px;padding:7px 13px;font-size:13px;font-weight:600;cursor:pointer}
.adm-wrap{max-width:960px;margin:0 auto;padding:18px 14px 60px}
.adm-cols{display:flex;gap:16px;align-items:flex-start}
@media(max-width:760px){.adm-cols{flex-direction:column}}
.adm-col{flex:1;min-width:0;width:100%}
.adm-col h3{margin:6px 0 10px;font-size:16px}
.adm-h4{margin:14px 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:var(--muted)}
.adm-list{display:flex;flex-direction:column;gap:8px;margin-bottom:14px}
.adm-item{display:flex;justify-content:space-between;align-items:center;background:#fff;border:1px solid var(--line);border-radius:11px;padding:11px 13px;cursor:pointer;text-align:left;color:var(--ink)}
.adm-item:hover{border-color:var(--teal)}
.adm-item.active{border-color:var(--teal);box-shadow:0 0 0 1px var(--teal)}
.adm-item span{font-size:12px;color:var(--muted);text-transform:capitalize}
.adm-miembro{display:flex;justify-content:space-between;align-items:center;background:#fff;border:1px solid var(--line);border-radius:11px;padding:10px 13px}
.adm-miembro b{display:block;font-size:14px}
.adm-miembro span{font-size:12px;color:var(--muted)}
.adm-rol{font-size:11px;font-weight:800;color:var(--teal);background:#0E7C6B1a;padding:3px 9px;border-radius:999px;text-transform:uppercase;letter-spacing:.4px}
.adm-formcard{background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px;margin-top:8px}
.adm-formcard h4{margin:0 0 10px;font-size:14px}
.adm-loginbox{background:#fff;border:1px solid var(--line);border-radius:16px;padding:22px;max-width:400px;margin:8vh auto 0}
.adm-loginbox h2{margin:0 0 4px;font-size:19px}
.adm-sub{color:var(--muted);font-size:13px;margin:0 0 16px}
.adm-field{margin-bottom:11px}
.adm-field label{display:block;font-size:12px;font-weight:700;color:var(--muted);margin-bottom:5px;text-transform:uppercase;letter-spacing:.4px}
.adm-hint{text-transform:none;font-weight:400;letter-spacing:0}
.adm-field input,.adm-field select{width:100%;border:1px solid var(--line);border-radius:10px;padding:10px 12px;font-size:14px;background:#fff;color:var(--ink)}
.adm-field input:focus,.adm-field select:focus{outline:none;border-color:var(--teal)}
.adm-row2{display:flex;gap:10px}.adm-row2>*{flex:1}
.adm-btn{border:none;border-radius:11px;padding:11px 15px;font-size:14px;font-weight:700;cursor:pointer}
.adm-btn.primary{background:var(--teal);color:#fff;margin-top:4px}
.adm-btn.primary:hover{background:var(--teal-dark)}
.adm-btn.primary:disabled{opacity:.5;cursor:not-allowed}
.adm-muted{color:var(--muted);font-size:13px}
.adm-error{background:#C0492F14;color:#C0492F;border-radius:9px;padding:9px 11px;font-size:13px;margin:6px 0}
.adm-ok{background:#2E9E5B14;color:#2E9E5B;border-radius:9px;padding:9px 11px;font-size:13px;margin:6px 0}
.adm-btn.ghost{background:#fff;border:1px solid var(--line);color:var(--ink)}
.adm-solbox{margin-bottom:16px}
.adm-solbox h3{display:flex;align-items:center;gap:8px;margin:6px 0 10px}
.adm-badge{background:#E9A23B;color:#fff;font-size:12px;font-weight:800;border-radius:999px;padding:1px 9px}
.adm-solcard{background:#fff;border:1px solid var(--line);border-radius:12px;padding:12px 13px;margin-bottom:8px}
.adm-solhead{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}
.adm-solhead b{display:block;font-size:14px}
.adm-solhead span{font-size:12px;color:var(--muted)}
.adm-soldesc{font-size:13px;margin-top:6px}
.adm-solactions{display:flex;gap:8px;justify-content:flex-end;margin-top:10px}
.adm-solactions .adm-btn{padding:8px 14px;margin-top:0}
.adm-lifebar{display:flex;gap:8px;flex-wrap:wrap;margin:2px 0 8px}
.adm-lifebar .adm-btn{margin-top:0}
.adm-tag-off{font-size:11px;font-weight:800;color:#C0492F;background:#C0492F14;padding:2px 8px;border-radius:999px;text-transform:uppercase;letter-spacing:.4px}
.adm-btn.danger{background:#C0492F;color:#fff}
.adm-btn.danger:hover{background:#a53c26}
.adm-btn.danger:disabled{opacity:.5;cursor:not-allowed}
.adm-miembro-acc{display:flex;align-items:center;gap:6px}
.adm-mini{border:1px solid var(--line);background:#fff;border-radius:8px;padding:4px 9px;font-size:11.5px;cursor:pointer;color:var(--ink);font-weight:600}
.adm-mini:hover{border-color:var(--teal)}
.adm-mini.danger:hover{border-color:#C0492F;color:#C0492F}
.adm-overlay{position:fixed;inset:0;background:rgba(23,48,44,.5);display:flex;align-items:center;justify-content:center;z-index:50;padding:16px}
.adm-modal{background:#fff;border-radius:16px;max-width:440px;width:100%;padding:20px}
.adm-modal h2{margin:0 0 4px;font-size:18px}
.adm-sub{color:var(--muted);font-size:13px;margin:0 0 14px}
.adm-mactions{display:flex;gap:8px;margin-top:8px}
.adm-mactions .adm-btn{flex:1;margin-top:0}
.adm-secnav{display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap}
.adm-secbtn{border:1px solid var(--line);background:#fff;color:var(--ink);border-radius:999px;padding:7px 14px;font-size:13px;font-weight:700;cursor:pointer}
.adm-secbtn.active{background:var(--teal);border-color:var(--teal);color:#fff}
.adm-roles-checks{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:10px}
.adm-check{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--ink);text-transform:none;letter-spacing:0}
.adm-check input{width:auto}
.adm-miembro-block{margin-bottom:8px}
.adm-miembro-block .adm-miembro{margin-bottom:0}
.adm-miembro-block .adm-formcard{margin-top:6px}
`;

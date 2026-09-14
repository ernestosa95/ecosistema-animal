import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import type { Sesion, Animal, Especie, Persona } from '../api/types';
import { CamposEspecie } from '../components/CamposEspecie';
import { useFormularioPersistente, hayBorrador } from '../hooks/useFormularioPersistente';

export function PacientesPage({
  sesion,
  onAbrir,
}: {
  sesion: Sesion;
  onAbrir: (animal: Animal) => void;
}) {
  const [animales, setAnimales] = useState<Animal[]>([]);
  const [especies, setEspecies] = useState<Especie[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(() => hayBorrador('paciente-nuevo'));
  const [busqueda, setBusqueda] = useState('');

  const especiesPorId = useMemo(
    () => Object.fromEntries(especies.map((e) => [e.id, e.nombre])),
    [especies],
  );
  const personasPorId = useMemo(
    () => Object.fromEntries(personas.map((p) => [p.id, `${p.nombre} ${p.apellido}`])),
    [personas],
  );

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return animales;
    return animales.filter((a) => {
      const especie = (especiesPorId[a.especieId] ?? '').toLowerCase();
      const dueno = (a.personaId ? personasPorId[a.personaId] ?? '' : '').toLowerCase();
      return (
        a.nombre.toLowerCase().includes(q) ||
        especie.includes(q) ||
        dueno.includes(q)
      );
    });
  }, [animales, busqueda, especiesPorId, personasPorId]);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const [a, e, p] = await Promise.all([
        api.animales(sesion),
        api.especies(sesion),
        api.personas(sesion),
      ]);
      setAnimales(a);
      setEspecies(e);
      setPersonas(p);
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
        <h1>Animales</h1>
        <button className="btn" data-tour="animales-nuevo" onClick={() => setMostrarForm((v) => !v)}>
          {mostrarForm ? 'Cerrar' : '+ Nuevo animal'}
        </button>
      </div>

      {mostrarForm && (
        <NuevoPacienteForm
          sesion={sesion}
          especies={especies}
          personas={personas}
          onCreado={() => {
            setMostrarForm(false);
            cargar();
          }}
        />
      )}

      {error && <div className="alerta">{error}</div>}

      {!cargando && animales.length > 0 && (
        <input
          placeholder="Buscar por nombre, tipo de animal o dueño…"
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
      ) : animales.length === 0 ? (
        <p className="muted">Todavía no hay animales. Creá el primero con “Nuevo animal”.</p>
      ) : (
        <div className="card">
          <table className="tabla">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Especie</th>
                <th>Dueño</th>
                <th>Código</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted" style={{ textAlign: 'center', padding: '16px' }}>
                    Sin resultados para “{busqueda}”.
                  </td>
                </tr>
              ) : filtrados.map((a) => (
                <tr key={a.id}>
                  <td>{a.nombre}</td>
                  <td>{especiesPorId[a.especieId] ?? '—'}</td>
                  <td>{a.personaId ? personasPorId[a.personaId] ?? '—' : '—'}</td>
                  <td className="mono">{a.codigoLegible ?? '—'}</td>
                  <td>
                    <span className="chip">{a.estado}</span>
                  </td>
                  <td>
                    <button className="link" onClick={() => onAbrir(a)}>
                      Ver ficha →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function NuevoPacienteForm({
  sesion,
  especies,
  personas,
  onCreado,
}: {
  sesion: Sesion;
  especies: Especie[];
  personas: Persona[];
  onCreado: () => void;
}) {
  const [form, setForm, limpiarBorrador] = useFormularioPersistente('paciente-nuevo', {
    nombre: '', especieId: '', personaId: '',
    dNombre: '', dApellido: '', dCelular: '', dDni: '',
    sexo: '', fechaNacimiento: '', microchip: '',
    datosEspecificos: {} as Record<string, unknown>,
  });
  const campo = <K extends keyof typeof form>(k: K) => (v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  const { nombre, especieId, personaId, dNombre, dApellido, dCelular, dDni, sexo, fechaNacimiento, microchip, datosEspecificos } = form;
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const especieSel = especies.find((e) => e.id === especieId) ?? null;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    // Todo animal identificado en Huella tiene que tener un dueño — no existe
    // el paciente "suelto". El <select required> ya lo exige, esto es sólo
    // el resguardo si de alguna forma se llega a este punto sin elegir uno.
    if (!personaId) {
      setError('Elegí un dueño para el paciente (o creá uno nuevo)');
      return;
    }
    if (personaId === '__nuevo__' && (!dNombre.trim() || !dApellido.trim() || !dCelular.trim() || !dDni.trim())) {
      setError('Completá nombre, apellido, celular y DNI del dueño nuevo');
      return;
    }
    setGuardando(true);
    try {
      let duenoId = personaId !== '__nuevo__' ? personaId : undefined;
      if (personaId === '__nuevo__') {
        const dueno = await api.crearPersona(sesion, {
          nombre: dNombre.trim(),
          apellido: dApellido.trim(),
          celular: dCelular.trim(),
          dni: dDni.trim(),
        });
        duenoId = dueno.id;
      }
      const data: Record<string, unknown> = { nombre, especieId, personaId: duenoId };
      if (sexo) data.sexo = sexo;
      if (fechaNacimiento) data.fechaNacimiento = fechaNacimiento;
      if (microchip) data.microchip = microchip;
      if (Object.keys(datosEspecificos).length > 0) data.datosEspecificos = datosEspecificos;
      await api.crearAnimal(sesion, data);
      api.registrarEvento(sesion, 'accion', 'animal-crear');
      limpiarBorrador();
      onCreado();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="card form-grid" onSubmit={guardar}>
      <label>
        Nombre
        <input value={nombre} onChange={(e) => campo('nombre')(e.target.value)} required />
      </label>
      <label>
        Especie
        <select value={especieId} onChange={(e) => campo('especieId')(e.target.value)} required>
          <option value="">Elegir…</option>
          {especies.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre}
            </option>
          ))}
        </select>
      </label>
      <label className="span-2">
        Dueño
        <select value={personaId} onChange={(e) => campo('personaId')(e.target.value)} required>
          <option value="" disabled>Elegí un dueño…</option>
          <option value="__nuevo__">＋ Crear dueño nuevo…</option>
          {personas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre} {p.apellido}
              {p.dni ? ` · ${p.dni}` : ''}
            </option>
          ))}
        </select>
      </label>

      {personaId === '__nuevo__' && (
        <div className="span-2 subform">
          <div className="form-titulo">Datos del dueño nuevo</div>
          <label>
            Nombre del dueño
            <input value={dNombre} onChange={(e) => campo('dNombre')(e.target.value)} required />
          </label>
          <label>
            Apellido del dueño
            <input value={dApellido} onChange={(e) => campo('dApellido')(e.target.value)} required />
          </label>
          <label>
            Celular del dueño
            <input value={dCelular} onChange={(e) => campo('dCelular')(e.target.value)} required />
          </label>
          <label>
            DNI del dueño
            <input value={dDni} onChange={(e) => campo('dDni')(e.target.value)} required />
          </label>
        </div>
      )}

      <label>
        Sexo
        <select value={sexo} onChange={(e) => campo('sexo')(e.target.value)}>
          <option value="">—</option>
          <option value="macho">Macho</option>
          <option value="hembra">Hembra</option>
          <option value="indefinido">Indefinido</option>
        </select>
      </label>
      <label>
        Fecha de nacimiento
        <input type="date" value={fechaNacimiento} onChange={(e) => campo('fechaNacimiento')(e.target.value)} />
      </label>
      <label className="span-2">
        Microchip (ISO, opcional)
        <input value={microchip} onChange={(e) => campo('microchip')(e.target.value)} />
      </label>

      <CamposEspecie especie={especieSel} valores={datosEspecificos} onChange={campo('datosEspecificos')} />

      {error && <div className="alerta span-2">{error}</div>}
      <div className="span-2">
        <button className="btn" type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar paciente'}
        </button>
      </div>
    </form>
  );
}

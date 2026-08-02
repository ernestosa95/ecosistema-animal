import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import type { Sesion, Animal, Especie, Persona } from '../api/types';

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
  const [mostrarForm, setMostrarForm] = useState(false);

  const especiesPorId = useMemo(
    () => Object.fromEntries(especies.map((e) => [e.id, e.nombre])),
    [especies],
  );
  const personasPorId = useMemo(
    () => Object.fromEntries(personas.map((p) => [p.id, `${p.nombre} ${p.apellido}`])),
    [personas],
  );

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
        <h1>Pacientes</h1>
        <button className="btn" onClick={() => setMostrarForm((v) => !v)}>
          {mostrarForm ? 'Cerrar' : '+ Nuevo paciente'}
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
      {cargando ? (
        <p className="muted">Cargando…</p>
      ) : animales.length === 0 ? (
        <p className="muted">Todavía no hay pacientes. Creá el primero con “Nuevo paciente”.</p>
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
              {animales.map((a) => (
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
  const [nombre, setNombre] = useState('');
  const [especieId, setEspecieId] = useState('');
  const [personaId, setPersonaId] = useState('');
  const [sexo, setSexo] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [microchip, setMicrochip] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      const data: Record<string, unknown> = { nombre, especieId };
      if (personaId) data.personaId = personaId;
      if (sexo) data.sexo = sexo;
      if (fechaNacimiento) data.fechaNacimiento = fechaNacimiento;
      if (microchip) data.microchip = microchip;
      await api.crearAnimal(sesion, data);
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
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
      </label>
      <label>
        Especie
        <select value={especieId} onChange={(e) => setEspecieId(e.target.value)} required>
          <option value="">Elegir…</option>
          {especies.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre}
            </option>
          ))}
        </select>
      </label>
      <label className="span-2">
        Dueño (opcional)
        <select value={personaId} onChange={(e) => setPersonaId(e.target.value)}>
          <option value="">Sin dueño asignado</option>
          {personas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre} {p.apellido}
              {p.dni ? ` · ${p.dni}` : ''}
            </option>
          ))}
        </select>
      </label>
      <label>
        Sexo
        <select value={sexo} onChange={(e) => setSexo(e.target.value)}>
          <option value="">—</option>
          <option value="macho">Macho</option>
          <option value="hembra">Hembra</option>
          <option value="indefinido">Indefinido</option>
        </select>
      </label>
      <label>
        Fecha de nacimiento
        <input type="date" value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} />
      </label>
      <label className="span-2">
        Microchip (ISO, opcional)
        <input value={microchip} onChange={(e) => setMicrochip(e.target.value)} />
      </label>
      {error && <div className="alerta span-2">{error}</div>}
      <div className="span-2">
        <button className="btn" type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar paciente'}
        </button>
      </div>
    </form>
  );
}

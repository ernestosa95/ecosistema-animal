import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import type { Sesion, Animal, Especie, Consulta, Persona } from '../api/types';

export function PacienteDetallePage({
  sesion,
  animal: animalInicial,
  onVolver,
}: {
  sesion: Sesion;
  animal: Animal;
  onVolver: () => void;
}) {
  const [animal, setAnimal] = useState<Animal>(animalInicial);
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [especies, setEspecies] = useState<Especie[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mostrarConsulta, setMostrarConsulta] = useState(false);
  const [editando, setEditando] = useState(false);

  const especieNombre = useMemo(
    () => especies.find((e) => e.id === animal.especieId)?.nombre ?? '—',
    [especies, animal.especieId],
  );
  const duenoNombre = useMemo(() => {
    if (!animal.personaId) return '—';
    const p = personas.find((x) => x.id === animal.personaId);
    return p ? `${p.nombre} ${p.apellido}` : '—';
  }, [personas, animal.personaId]);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const [c, e, p] = await Promise.all([
        api.consultasDeAnimal(sesion, animal.id),
        api.especies(sesion),
        api.personas(sesion),
      ]);
      setConsultas(c);
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
  }, [animal.id]);

  const identificador = animal.microchip || animal.codigoLegible || '—';

  return (
    <div>
      <button className="link" onClick={onVolver}>
        ← Volver a pacientes
      </button>

      <div className="page-head">
        <h1>{animal.nombre}</h1>
        <div className="acciones">
          <span className="chip">{animal.estado}</span>
          <button className="btn-ghost" onClick={() => setEditando((v) => !v)}>
            {editando ? 'Cerrar' : 'Editar'}
          </button>
        </div>
      </div>

      {editando ? (
        <EditarPacienteForm
          sesion={sesion}
          animal={animal}
          especies={especies}
          personas={personas}
          onGuardado={(actualizado) => {
            setAnimal(actualizado);
            setEditando(false);
          }}
          onCancelar={() => setEditando(false)}
        />
      ) : (
        <div className="card ficha-datos">
          <Dato etiqueta="Especie" valor={especieNombre} />
          <Dato etiqueta="Dueño" valor={duenoNombre} />
          <Dato etiqueta="Sexo" valor={animal.sexo ?? '—'} />
          <Dato etiqueta="Nacimiento" valor={animal.fechaNacimiento ?? '—'} />
          <Dato etiqueta="Código" valor={animal.codigoLegible ?? '—'} mono />
          <Dato etiqueta="Microchip" valor={animal.microchip ?? '—'} mono />
          <Dato etiqueta="Identificador" valor={identificador} mono />
        </div>
      )}

      <div className="page-head">
        <h2>Historia clínica</h2>
        <button className="btn" onClick={() => setMostrarConsulta((v) => !v)}>
          {mostrarConsulta ? 'Cerrar' : '+ Nueva consulta'}
        </button>
      </div>

      {mostrarConsulta && (
        <NuevaConsultaForm
          sesion={sesion}
          animalId={animal.id}
          onCreada={() => {
            setMostrarConsulta(false);
            cargar();
          }}
        />
      )}

      {error && <div className="alerta">{error}</div>}
      {cargando ? (
        <p className="muted">Cargando…</p>
      ) : consultas.length === 0 ? (
        <p className="muted">Todavía no hay consultas registradas para este paciente.</p>
      ) : (
        <div className="card">
          <table className="tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Motivo</th>
                <th>Diagnóstico</th>
                <th>Tratamiento</th>
                <th>Peso</th>
              </tr>
            </thead>
            <tbody>
              {consultas.map((c) => (
                <tr key={c.id}>
                  <td>{new Date(c.fecha).toLocaleDateString()}</td>
                  <td>{c.motivo ?? '—'}</td>
                  <td>{c.diagnostico ?? '—'}</td>
                  <td>{c.tratamiento ?? '—'}</td>
                  <td>{c.pesoKg ? `${c.pesoKg} kg` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Dato({ etiqueta, valor, mono }: { etiqueta: string; valor: string; mono?: boolean }) {
  return (
    <div className="dato">
      <span className="dato-label">{etiqueta}</span>
      <span className={mono ? 'mono' : undefined}>{valor}</span>
    </div>
  );
}

function EditarPacienteForm({
  sesion,
  animal,
  especies,
  personas,
  onGuardado,
  onCancelar,
}: {
  sesion: Sesion;
  animal: Animal;
  especies: Especie[];
  personas: Persona[];
  onGuardado: (a: Animal) => void;
  onCancelar: () => void;
}) {
  const [nombre, setNombre] = useState(animal.nombre);
  const [especieId, setEspecieId] = useState(animal.especieId);
  const [personaId, setPersonaId] = useState(animal.personaId ?? '');
  const [sexo, setSexo] = useState(animal.sexo ?? '');
  const [fechaNacimiento, setFechaNacimiento] = useState(animal.fechaNacimiento ?? '');
  const [microchip, setMicrochip] = useState(animal.microchip ?? '');
  const [estado, setEstado] = useState(animal.estado);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      const data: Record<string, unknown> = {
        nombre,
        especieId,
        estado,
        personaId: personaId || undefined,
        sexo: sexo || undefined,
        fechaNacimiento: fechaNacimiento || undefined,
        microchip: microchip || undefined,
      };
      const actualizado = await api.actualizarAnimal(sesion, animal.id, data);
      onGuardado(actualizado);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="card form-grid" onSubmit={guardar}>
      <div className="form-titulo span-2">Editar paciente</div>
      <label>
        Nombre
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
      </label>
      <label>
        Especie
        <select value={especieId} onChange={(e) => setEspecieId(e.target.value)} required>
          {especies.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre}
            </option>
          ))}
        </select>
      </label>
      <label className="span-2">
        Dueño
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
        Estado
        <select value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
          <option value="fallecido">Fallecido</option>
        </select>
      </label>
      <label>
        Fecha de nacimiento
        <input type="date" value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} />
      </label>
      <label>
        Microchip (ISO)
        <input value={microchip} onChange={(e) => setMicrochip(e.target.value)} />
      </label>
      {error && <div className="alerta span-2">{error}</div>}
      <div className="span-2 acciones">
        <button className="btn" type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </button>
        <button className="btn-ghost" type="button" onClick={onCancelar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

function NuevaConsultaForm({
  sesion,
  animalId,
  onCreada,
}: {
  sesion: Sesion;
  animalId: string;
  onCreada: () => void;
}) {
  const [motivo, setMotivo] = useState('');
  const [diagnostico, setDiagnostico] = useState('');
  const [tratamiento, setTratamiento] = useState('');
  const [pesoKg, setPesoKg] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      const data: Record<string, unknown> = { animalId };
      if (motivo) data.motivo = motivo;
      if (diagnostico) data.diagnostico = diagnostico;
      if (tratamiento) data.tratamiento = tratamiento;
      if (observaciones) data.observaciones = observaciones;
      if (pesoKg) data.pesoKg = Number(pesoKg);
      await api.crearConsulta(sesion, data);
      onCreada();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="card form-grid" onSubmit={guardar}>
      <label className="span-2">
        Motivo
        <input value={motivo} onChange={(e) => setMotivo(e.target.value)} />
      </label>
      <label>
        Diagnóstico
        <input value={diagnostico} onChange={(e) => setDiagnostico(e.target.value)} />
      </label>
      <label>
        Tratamiento
        <input value={tratamiento} onChange={(e) => setTratamiento(e.target.value)} />
      </label>
      <label>
        Peso (kg)
        <input
          type="number"
          step="0.1"
          min="0"
          value={pesoKg}
          onChange={(e) => setPesoKg(e.target.value)}
        />
      </label>
      <label className="span-2">
        Observaciones
        <input value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
      </label>
      {error && <div className="alerta span-2">{error}</div>}
      <div className="span-2">
        <button className="btn" type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar consulta'}
        </button>
      </div>
    </form>
  );
}

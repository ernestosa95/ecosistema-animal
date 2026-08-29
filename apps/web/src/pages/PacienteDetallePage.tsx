import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import type {
  Sesion, Animal, Especie, Consulta, Persona, Vacunacion, Producto, MovimientoStock,
  Macro, CategoriaMacro, Indicacion, OrigenIndicacion,
} from '../api/types';
import { camposDeEspecie } from '../config/especieDatos';
import { CamposEspecie } from '../components/CamposEspecie';
import { useFormularioPersistente, hayBorrador } from '../hooks/useFormularioPersistente';

export function PacienteDetallePage({
  sesion,
  animal: animalInicial,
  onVolver,
  abrirConsulta = false,
}: {
  sesion: Sesion;
  animal: Animal;
  onVolver: () => void;
  abrirConsulta?: boolean;
}) {
  const [animal, setAnimal] = useState<Animal>(animalInicial);
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [vacunaciones, setVacunaciones] = useState<Vacunacion[]>([]);
  const [especies, setEspecies] = useState<Especie[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [macros, setMacros] = useState<Macro[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mostrarConsulta, setMostrarConsulta] = useState(
    () => !!abrirConsulta || hayBorrador(`consulta-${animalInicial.id}-nueva`),
  );
  const [editandoConsultaId, setEditandoConsultaId] = useState<string | null>(null);
  const [dispensandoConsultaId, setDispensandoConsultaId] = useState<string | null>(null);
  const [indicandoConsultaId, setIndicandoConsultaId] = useState<string | null>(null);
  const [mostrarVacuna, setMostrarVacuna] = useState(false);
  const [editando, setEditando] = useState(false);
  const [generandoCarnet, setGenerandoCarnet] = useState(false);
  const [itemLinea, setItemLinea] = useState<ItemLinea | null>(null);

  const especieNombre = useMemo(
    () => especies.find((e) => e.id === animal.especieId)?.nombre ?? '—',
    [especies, animal.especieId],
  );
  const especieActual = useMemo(
    () => especies.find((e) => e.id === animal.especieId) ?? null,
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
      const [c, v, e, p, pr, m] = await Promise.all([
        api.consultasDeAnimal(sesion, animal.id),
        api.vacunacionesDeAnimal(sesion, animal.id),
        api.especies(sesion),
        api.personas(sesion),
        api.productos(sesion),
        api.macros(sesion),
      ]);
      setConsultas(c);
      setVacunaciones(v);
      setEspecies(e);
      setPersonas(p);
      setProductos(pr);
      setMacros(m);
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

  // Abre el carnet PDF del animal (GET /animales/:id/carnet.pdf) con la sesión.
  async function onCarnet() {
    setGenerandoCarnet(true);
    try {
      const API = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000';
      const res = await fetch(`${API}/animales/${animal.id}/carnet.pdf`, {
        headers: {
          ...(sesion.token ? { Authorization: `Bearer ${sesion.token}` } : {}),
          ...(sesion.organizacionId ? { 'X-Organizacion-Id': sesion.organizacionId } : {}),
        },
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      alert('No se pudo generar el carnet: ' + (e instanceof Error ? e.message : 'error'));
    } finally {
      setGenerandoCarnet(false);
    }
  }

  async function borrarConsulta(id: string) {
    if (!confirm('¿Borrar esta consulta? No se puede deshacer.')) return;
    try {
      await api.eliminarConsulta(sesion, id);
      if (editandoConsultaId === id) setEditandoConsultaId(null);
      cargar();
    } catch (e) {
      alert('No se pudo borrar la consulta: ' + (e instanceof Error ? e.message : 'error'));
    }
  }

  const identificador = animal.microchip || animal.codigoLegible || '—';

  return (
    <div>
      <button className="link" onClick={onVolver}>
        ← Volver a animales
      </button>

      <div className="page-head">
        <h1>{animal.nombre}</h1>
        <div className="acciones">
          <span className="chip">{animal.estado}</span>
          <button className="btn-ghost" onClick={onCarnet} disabled={generandoCarnet}>
            {generandoCarnet ? 'Generando…' : 'Descargar carnet'}
          </button>
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

          {camposDeEspecie(especieActual).map((c) => {
            const v = animal.datosEspecificos?.[c.clave];
            const texto =
              c.tipo === 'checkbox'
                ? v ? 'Sí' : 'No'
                : v === undefined || v === null || v === ''
                ? '—'
                : String(v);
            return <Dato key={c.clave} etiqueta={c.etiqueta} valor={texto} />;
          })}
        </div>
      )}

      <div className="page-head">
        <h2>Historia clínica</h2>
        <button
          className="btn"
          onClick={() => {
            setEditandoConsultaId(null);
            setMostrarConsulta((v) => !v);
          }}
        >
          {mostrarConsulta ? 'Cerrar' : '+ Nueva consulta'}
        </button>
      </div>

      {mostrarConsulta && (
        <ConsultaForm
          sesion={sesion}
          animalId={animal.id}
          macros={macros}
          previa={consultas[0]}
          onGuardada={() => {
            setMostrarConsulta(false);
            cargar();
          }}
        />
      )}

      {!cargando && (consultas.length > 0 || vacunaciones.length > 0) && (
        <HistoriaTimeline consultas={consultas} vacunaciones={vacunaciones} onSeleccionar={setItemLinea} />
      )}
      {itemLinea && <DrawerItemLinea item={itemLinea} onCerrar={() => setItemLinea(null)} />}

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
                <th />
              </tr>
            </thead>
            <tbody>
              {consultas.map((c) =>
                editandoConsultaId === c.id ? (
                  <tr key={c.id}>
                    <td colSpan={6}>
                      <ConsultaForm
                        sesion={sesion}
                        animalId={animal.id}
                        consulta={c}
                        macros={macros}
                        onGuardada={() => {
                          setEditandoConsultaId(null);
                          cargar();
                        }}
                        onCancelar={() => setEditandoConsultaId(null)}
                      />
                    </td>
                  </tr>
                ) : (
                  <>
                    <tr key={c.id}>
                      <td>{new Date(c.fecha).toLocaleDateString()}</td>
                      <td>{c.motivo ?? '—'}</td>
                      <td>{c.diagnostico ?? '—'}</td>
                      <td>{c.tratamiento ?? '—'}</td>
                      <td>{c.pesoKg ? `${c.pesoKg} kg` : '—'}</td>
                      <td>
                        <button
                          className="link"
                          onClick={() =>
                            setDispensandoConsultaId(dispensandoConsultaId === c.id ? null : c.id)
                          }
                        >
                          {dispensandoConsultaId === c.id ? 'Cerrar' : 'Dispensar'}
                        </button>{' '}
                        <button
                          className="link"
                          onClick={() =>
                            setIndicandoConsultaId(indicandoConsultaId === c.id ? null : c.id)
                          }
                        >
                          {indicandoConsultaId === c.id ? 'Cerrar' : 'Indicación'}
                        </button>{' '}
                        <button
                          className="link"
                          onClick={() => {
                            setMostrarConsulta(false);
                            setEditandoConsultaId(c.id);
                          }}
                        >
                          Editar
                        </button>{' '}
                        <button className="link" onClick={() => borrarConsulta(c.id)}>
                          Borrar
                        </button>
                      </td>
                    </tr>
                    {dispensandoConsultaId === c.id && (
                      <tr key={`${c.id}-dispensa`}>
                        <td colSpan={6}>
                          <DispensaPanel sesion={sesion} consultaId={c.id} productos={productos} />
                        </td>
                      </tr>
                    )}
                    {indicandoConsultaId === c.id && (
                      <tr key={`${c.id}-indicacion`}>
                        <td colSpan={6}>
                          <IndicacionesPanel
                            sesion={sesion}
                            consultaId={c.id}
                            pesoKgConsulta={c.pesoKg}
                            productos={productos}
                          />
                        </td>
                      </tr>
                    )}
                  </>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="page-head">
        <h2>Vacunaciones</h2>
        <button className="btn" onClick={() => setMostrarVacuna((v) => !v)}>
          {mostrarVacuna ? 'Cerrar' : '+ Nueva vacuna'}
        </button>
      </div>

      {mostrarVacuna && (
        <NuevaVacunacionForm
          sesion={sesion}
          animalId={animal.id}
          onCreada={() => {
            setMostrarVacuna(false);
            cargar();
          }}
        />
      )}

      {!cargando && (
        vacunaciones.length === 0 ? (
          <p className="muted">Todavía no hay vacunas registradas para este paciente.</p>
        ) : (
          <div className="card">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Producto</th>
                  <th>Próxima dosis</th>
                  <th>Lote</th>
                </tr>
              </thead>
              <tbody>
                {vacunaciones.map((v) => (
                  <tr key={v.id}>
                    <td>{v.fecha}</td>
                    <td>{v.producto ?? '—'}</td>
                    <td>{v.proximaDosis ?? '—'}</td>
                    <td>{v.loteProducto ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
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
  const [datosEspecificos, setDatosEspecificos] = useState<Record<string, unknown>>(
    animal.datosEspecificos ?? {},
  );
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const especieSel = especies.find((e) => e.id === especieId) ?? null;

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
        datosEspecificos,
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

      <CamposEspecie especie={especieSel} valores={datosEspecificos} onChange={setDatosEspecificos} />

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

/** Alta (sin `consulta`) o edición (con `consulta`) de una consulta clínica. */
function ConsultaForm({
  sesion,
  animalId,
  consulta,
  macros = [],
  previa,
  onGuardada,
  onCancelar,
}: {
  sesion: Sesion;
  animalId: string;
  consulta?: Consulta;
  macros?: Macro[];
  /** Consulta anterior del mismo animal, para precargar constantes vitales (delta editing, §3.1). */
  previa?: Consulta;
  onGuardada: () => void;
  onCancelar?: () => void;
}) {
  // Persistencia local: clave separada por paciente+consulta (una consulta
  // en edición no pisa el borrador de "consulta nueva" de otra sesión, ni
  // viceversa). Al dar de alta (sin `consulta`), peso/temperatura arrancan
  // con el valor de la visita anterior si no hay un borrador guardado ya —
  // sólo se edita lo que cambió (delta editing, §3.1).
  const [form, setForm, limpiarBorrador] = useFormularioPersistente(
    `consulta-${animalId}-${consulta?.id ?? 'nueva'}`,
    {
      motivo: consulta?.motivo ?? '',
      anamnesis: consulta?.anamnesis ?? '',
      examenFisico: consulta?.examenFisico ?? '',
      diagnostico: consulta?.diagnostico ?? '',
      tratamiento: consulta?.tratamiento ?? '',
      pesoKg: consulta?.pesoKg ?? previa?.pesoKg ?? '',
      temperaturaC: consulta?.temperaturaC ?? previa?.temperaturaC ?? '',
      observaciones: consulta?.observaciones ?? '',
    },
  );
  const campo = <K extends keyof typeof form>(k: K) => (v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  const { motivo, anamnesis, examenFisico, diagnostico, tratamiento, pesoKg, temperaturaC, observaciones } = form;
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      const data: Record<string, unknown> = consulta ? {} : { animalId };
      if (motivo) data.motivo = motivo;
      if (anamnesis) data.anamnesis = anamnesis;
      if (examenFisico) data.examenFisico = examenFisico;
      if (diagnostico) data.diagnostico = diagnostico;
      if (tratamiento) data.tratamiento = tratamiento;
      if (observaciones) data.observaciones = observaciones;
      if (pesoKg) data.pesoKg = Number(pesoKg);
      if (temperaturaC) data.temperaturaC = Number(temperaturaC);
      if (consulta) {
        await api.actualizarConsulta(sesion, consulta.id, data);
      } else {
        await api.crearConsulta(sesion, data);
      }
      limpiarBorrador();
      onGuardada();
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
        <input value={motivo} onChange={(e) => campo('motivo')(e.target.value)} />
      </label>
      <label className="span-2">
        Anamnesis
        <MacroPicker categoria="anamnesis" macros={macros} onInsertar={(t) => campo('anamnesis')(anamnesis ? `${anamnesis}\n${t}` : t)} />
        <textarea rows={2} value={anamnesis} onChange={(e) => campo('anamnesis')(e.target.value)} />
      </label>
      <label className="span-2">
        Examen físico
        <MacroPicker categoria="examenFisico" macros={macros} onInsertar={(t) => campo('examenFisico')(examenFisico ? `${examenFisico}\n${t}` : t)} />
        <textarea rows={2} value={examenFisico} onChange={(e) => campo('examenFisico')(e.target.value)} />
      </label>
      <label>
        Diagnóstico
        <MacroPicker categoria="diagnostico" macros={macros} onInsertar={(t) => campo('diagnostico')(t)} />
        <input value={diagnostico} onChange={(e) => campo('diagnostico')(e.target.value)} />
      </label>
      <label>
        Tratamiento
        <MacroPicker categoria="tratamiento" macros={macros} onInsertar={(t) => campo('tratamiento')(t)} />
        <input value={tratamiento} onChange={(e) => campo('tratamiento')(e.target.value)} />
      </label>
      <label>
        Peso (kg)
        <input
          type="number"
          step="0.1"
          min="0"
          value={pesoKg}
          onChange={(e) => campo('pesoKg')(e.target.value)}
        />
        {!consulta && previa?.pesoKg && (
          <span className="muted hint-previo">Anterior: {previa.pesoKg} kg</span>
        )}
      </label>
      <label>
        Temperatura (°C)
        <input
          type="number"
          step="0.1"
          min="0"
          value={temperaturaC}
          onChange={(e) => campo('temperaturaC')(e.target.value)}
        />
        {!consulta && previa?.temperaturaC && (
          <span className="muted hint-previo">Anterior: {previa.temperaturaC} °C</span>
        )}
      </label>
      <label className="span-2">
        Observaciones
        <input value={observaciones} onChange={(e) => campo('observaciones')(e.target.value)} />
      </label>
      {error && <div className="alerta span-2">{error}</div>}
      <div className="span-2 acciones">
        <button className="btn" type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : consulta ? 'Guardar cambios' : 'Guardar consulta'}
        </button>
        {onCancelar && (
          <button className="btn-ghost" type="button" onClick={onCancelar}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

/**
 * Selector de macros (§3.1): bloques de texto predefinidos por categoría.
 * Insertar sólo agrega/reemplaza el texto del macro elegido — no borra lo
 * que el usuario ya haya tipeado en el campo (el caller decide cómo combinar
 * vía `onInsertar`, distinto para textarea vs. input de una línea).
 */
function MacroPicker({
  categoria,
  macros,
  onInsertar,
}: {
  categoria: CategoriaMacro;
  macros: Macro[];
  onInsertar: (texto: string) => void;
}) {
  const opciones = macros.filter((m) => m.categoria === categoria);
  if (opciones.length === 0) return null;
  return (
    <select
      className="macro-picker"
      value=""
      onChange={(e) => {
        const macro = opciones.find((m) => m.id === e.target.value);
        if (macro) onInsertar(macro.texto);
        e.target.value = '';
      }}
    >
      <option value="">＋ Insertar macro…</option>
      {opciones.map((m) => (
        <option key={m.id} value={m.id}>
          {m.tag}
        </option>
      ))}
    </select>
  );
}

/**
 * Dispensa de fármacos ligada a una consulta (F4.3): lista lo ya dispensado
 * (movimientos de stock tipo 'uso' con esta consultaId) y permite cargar uno
 * nuevo, que descuenta stock vía el mismo endpoint que usa Farmacia.
 */
function DispensaPanel({
  sesion,
  consultaId,
  productos,
}: {
  sesion: Sesion;
  consultaId: string;
  productos: Producto[];
}) {
  const [dispensas, setDispensas] = useState<MovimientoStock[]>([]);
  const [cargando, setCargando] = useState(true);
  const [productoId, setProductoId] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function cargar() {
    setCargando(true);
    try {
      const d = await api.movimientosStock(sesion, undefined, consultaId);
      setDispensas(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar dispensas');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultaId]);

  function nombreProducto(id: string) {
    return productos.find((p) => p.id === id)?.nombre ?? '—';
  }

  async function dispensar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      await api.crearMovimientoStock(sesion, {
        productoId,
        tipo: 'uso',
        cantidad: Number(cantidad),
        consultaId,
        observaciones: observaciones || undefined,
      });
      setProductoId('');
      setCantidad('');
      setObservaciones('');
      cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo dispensar');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="card">
      <div className="form-titulo">Dispensa de fármacos</div>
      {cargando ? (
        <p className="muted">Cargando…</p>
      ) : dispensas.length === 0 ? (
        <p className="muted">Todavía no se dispensó nada en esta consulta.</p>
      ) : (
        <table className="tabla">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Observaciones</th>
            </tr>
          </thead>
          <tbody>
            {dispensas.map((d) => (
              <tr key={d.id}>
                <td>{nombreProducto(d.productoId)}</td>
                <td>{d.cantidad}</td>
                <td>{d.observaciones ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <form className="form-grid" onSubmit={dispensar} style={{ marginTop: '0.75rem' }}>
        <label>
          Producto
          <select value={productoId} onChange={(e) => setProductoId(e.target.value)} required>
            <option value="">Seleccionar…</option>
            {productos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          Cantidad
          <input
            type="number"
            min="1"
            step="1"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            required
          />
        </label>
        <label className="span-2">
          Observaciones
          <input value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
        </label>
        {error && <div className="alerta span-2">{error}</div>}
        <div className="span-2">
          <button className="btn" type="submit" disabled={guardando || productos.length === 0}>
            {guardando ? 'Dispensando…' : 'Dispensar'}
          </button>
          {productos.length === 0 && (
            <span className="muted" style={{ marginLeft: '0.5rem' }}>
              No hay productos cargados en Farmacia.
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

/** Sugerencia de dosis (mg totales y, si hay concentración cargada, volumen a administrar) a partir del peso. */
function calcularDosis(pesoKg: number, producto?: Producto | null): string | null {
  if (!producto || !pesoKg) return null;
  const mgKg = Number(producto.dosisSugeridaMgKg);
  if (!mgKg) return null;
  const mgTotal = pesoKg * mgKg;
  const concentracion = Number(producto.concentracion);
  if (concentracion) {
    const volumen = mgTotal / concentracion;
    return `${mgTotal.toFixed(1)} mg (~${volumen.toFixed(2)} ${producto.unidadConcentracion || 'ml'})`;
  }
  return `${mgTotal.toFixed(1)} mg`;
}

/**
 * Indicaciones / prescripción ligada a una consulta (Fase B, §3.2 y §3.3):
 * documento de indicaciones puntual o esquema de tratamiento continuo, con
 * calculadora de dosis asistida cuando el producto tiene concentración y
 * dosis sugerida cargadas en Farmacia. Si el origen es stock interno, además
 * de registrar la indicación dispara un movimiento de stock 'uso' (mismo
 * endpoint que usa DispensaPanel) para descontar el inventario.
 */
function IndicacionesPanel({
  sesion,
  consultaId,
  pesoKgConsulta,
  productos,
}: {
  sesion: Sesion;
  consultaId: string;
  pesoKgConsulta?: string | null;
  productos: Producto[];
}) {
  const [indicaciones, setIndicaciones] = useState<Indicacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [origen, setOrigen] = useState<OrigenIndicacion>('stock_interno');
  const [productoId, setProductoId] = useState('');
  const [productoNombre, setProductoNombre] = useState('');
  const [pesoCalculo, setPesoCalculo] = useState(pesoKgConsulta ?? '');
  const [dosis, setDosis] = useState('');
  const [cantidadStock, setCantidadStock] = useState('');
  const [frecuencia, setFrecuencia] = useState('');
  const [duracionDias, setDuracionDias] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function cargar() {
    setCargando(true);
    try {
      setIndicaciones(await api.indicacionesDeConsulta(sesion, consultaId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar indicaciones');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultaId]);

  const productoSel = productos.find((p) => p.id === productoId) ?? null;
  const sugerencia = origen === 'stock_interno' ? calcularDosis(Number(pesoCalculo), productoSel) : null;

  function nombreDe(i: Indicacion) {
    if (i.origen === 'stock_interno') return productos.find((p) => p.id === i.productoId)?.nombre ?? '—';
    return i.productoNombre ?? '—';
  }

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      const data: Record<string, unknown> = { consultaId, origen, dosis: dosis || undefined };
      if (origen === 'stock_interno') {
        data.productoId = productoId;
        if (cantidadStock) data.cantidadStock = Number(cantidadStock);
      } else {
        data.productoNombre = productoNombre;
      }
      if (frecuencia) data.frecuencia = frecuencia;
      if (duracionDias) data.duracionDias = Number(duracionDias);
      if (observaciones) data.observaciones = observaciones;

      await api.crearIndicacion(sesion, data);

      if (origen === 'stock_interno' && cantidadStock && Number(cantidadStock) > 0) {
        try {
          await api.crearMovimientoStock(sesion, {
            productoId,
            tipo: 'uso',
            cantidad: Number(cantidadStock),
            consultaId,
            observaciones: dosis ? `Indicación: ${dosis}` : 'Indicación',
          });
        } catch (errStock) {
          setError(
            'La indicación se guardó, pero no se pudo descontar el stock: ' +
              (errStock instanceof Error ? errStock.message : 'error'),
          );
        }
      }

      setProductoId('');
      setProductoNombre('');
      setDosis('');
      setCantidadStock('');
      setFrecuencia('');
      setDuracionDias('');
      setObservaciones('');
      cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la indicación');
    } finally {
      setGuardando(false);
    }
  }

  async function alternarActivo(i: Indicacion) {
    try {
      await api.actualizarIndicacion(sesion, i.id, { activo: !i.activo });
      cargar();
    } catch (err) {
      alert('No se pudo actualizar: ' + (err instanceof Error ? err.message : 'error'));
    }
  }

  async function borrar(id: string) {
    if (!confirm('¿Borrar esta indicación?')) return;
    try {
      await api.eliminarIndicacion(sesion, id);
      cargar();
    } catch (err) {
      alert('No se pudo borrar: ' + (err instanceof Error ? err.message : 'error'));
    }
  }

  return (
    <div className="card">
      <div className="form-titulo">Indicaciones / plan de tratamiento</div>
      {cargando ? (
        <p className="muted">Cargando…</p>
      ) : indicaciones.length === 0 ? (
        <p className="muted">Todavía no hay indicaciones cargadas para esta consulta.</p>
      ) : (
        <table className="tabla">
          <thead>
            <tr>
              <th>Fármaco</th>
              <th>Dosis</th>
              <th>Frecuencia</th>
              <th>Duración</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {indicaciones.map((i) => (
              <tr key={i.id}>
                <td>{nombreDe(i)}</td>
                <td>{i.dosis ?? '—'}</td>
                <td>{i.frecuencia ?? '—'}</td>
                <td>{i.duracionDias ? `${i.duracionDias} días` : 'Puntual'}</td>
                <td>
                  <span className="chip">{i.activo ? 'Vigente' : 'Finalizado'}</span>
                </td>
                <td>
                  <button className="link" onClick={() => alternarActivo(i)}>
                    {i.activo ? 'Finalizar' : 'Reactivar'}
                  </button>{' '}
                  <button className="link" onClick={() => borrar(i.id)}>
                    Borrar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <form className="form-grid" onSubmit={crear} style={{ marginTop: '0.75rem' }}>
        <label>
          Origen
          <select value={origen} onChange={(e) => setOrigen(e.target.value as OrigenIndicacion)}>
            <option value="stock_interno">Stock interno (descuenta inventario)</option>
            <option value="receta_externa">Receta externa (no afecta stock)</option>
          </select>
        </label>

        {origen === 'stock_interno' ? (
          <label>
            Producto
            <select value={productoId} onChange={(e) => setProductoId(e.target.value)} required>
              <option value="">Seleccionar…</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label>
            Fármaco (texto libre)
            <input value={productoNombre} onChange={(e) => setProductoNombre(e.target.value)} required />
          </label>
        )}

        {origen === 'stock_interno' && productoSel?.dosisSugeridaMgKg && (
          <div className="span-2 calculadora-dosis">
            <label style={{ maxWidth: '10rem', display: 'inline-block' }}>
              Peso para el cálculo (kg)
              <input
                type="number"
                step="0.1"
                min="0"
                value={pesoCalculo}
                onChange={(e) => setPesoCalculo(e.target.value)}
              />
            </label>
            {sugerencia && (
              <div className="sugerencia-dosis">
                Sugerencia: <b>{sugerencia}</b>{' '}
                <button type="button" className="link" onClick={() => setDosis(sugerencia)}>
                  Confirmar dosis
                </button>
              </div>
            )}
          </div>
        )}

        <label>
          Dosis
          <input value={dosis} onChange={(e) => setDosis(e.target.value)} placeholder="Ej: 5mg, 1 comprimido" />
        </label>
        {origen === 'stock_interno' && (
          <label>
            Cantidad a descontar del stock
            <input
              type="number"
              min="1"
              step="1"
              value={cantidadStock}
              onChange={(e) => setCantidadStock(e.target.value)}
            />
          </label>
        )}
        <label>
          Frecuencia
          <input value={frecuencia} onChange={(e) => setFrecuencia(e.target.value)} placeholder="Ej: cada 12hs" />
        </label>
        <label>
          Duración (días, dejar vacío si es puntual)
          <input
            type="number"
            min="1"
            step="1"
            value={duracionDias}
            onChange={(e) => setDuracionDias(e.target.value)}
          />
        </label>
        <label className="span-2">
          Observaciones
          <input value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
        </label>
        {error && <div className="alerta span-2">{error}</div>}
        <div className="span-2">
          <button
            className="btn"
            type="submit"
            disabled={guardando || (origen === 'stock_interno' && productos.length === 0)}
          >
            {guardando ? 'Guardando…' : 'Guardar indicación'}
          </button>
          {origen === 'stock_interno' && productos.length === 0 && (
            <span className="muted" style={{ marginLeft: '0.5rem' }}>
              No hay productos cargados en Farmacia.
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

function NuevaVacunacionForm({
  sesion,
  animalId,
  onCreada,
}: {
  sesion: Sesion;
  animalId: string;
  onCreada: () => void;
}) {
  const [producto, setProducto] = useState('');
  const [fecha, setFecha] = useState('');
  const [proximaDosis, setProximaDosis] = useState('');
  const [loteProducto, setLoteProducto] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      const data: Record<string, unknown> = { animalId, producto };
      if (fecha) data.fecha = fecha;
      if (proximaDosis) data.proximaDosis = proximaDosis;
      if (loteProducto) data.loteProducto = loteProducto;
      await api.registrarVacunacion(sesion, data);
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
        Producto
        <input value={producto} onChange={(e) => setProducto(e.target.value)} required />
      </label>
      <label>
        Fecha de aplicación
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
      </label>
      <label>
        Próxima dosis
        <input type="date" value={proximaDosis} onChange={(e) => setProximaDosis(e.target.value)} />
      </label>
      <label className="span-2">
        Lote
        <input value={loteProducto} onChange={(e) => setLoteProducto(e.target.value)} />
      </label>
      {error && <div className="alerta span-2">{error}</div>}
      <div className="span-2">
        <button className="btn" type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar vacuna'}
        </button>
      </div>
    </form>
  );
}

type ItemLinea =
  | { tipo: 'consulta'; fecha: string; data: Consulta }
  | { tipo: 'vacuna'; fecha: string; data: Vacunacion };

const ICONO_LINEA: Record<ItemLinea['tipo'], string> = { consulta: '🩺', vacuna: '💉' };

/**
 * Línea del tiempo médica (§3.1): consultas y vacunaciones intercaladas por
 * fecha, con iconografía por tipo de evento. Un click abre el detalle en un
 * panel lateral (drawer) sin perder el contexto de lo que esté abierto en la
 * página (p. ej. una consulta en edición) — el drawer es un overlay, no una
 * navegación.
 */
function HistoriaTimeline({
  consultas,
  vacunaciones,
  onSeleccionar,
}: {
  consultas: Consulta[];
  vacunaciones: Vacunacion[];
  onSeleccionar: (item: ItemLinea) => void;
}) {
  const items: ItemLinea[] = [
    ...consultas.map((c): ItemLinea => ({ tipo: 'consulta', fecha: c.fecha, data: c })),
    ...vacunaciones.map((v): ItemLinea => ({ tipo: 'vacuna', fecha: v.fecha, data: v })),
  ].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  return (
    <div className="card timeline">
      {items.map((item, i) => (
        <button key={i} type="button" className="timeline-item" onClick={() => onSeleccionar(item)}>
          <span className="timeline-icono">{ICONO_LINEA[item.tipo]}</span>
          <span className="timeline-fecha">{new Date(item.fecha).toLocaleDateString()}</span>
          <span className="timeline-titulo">
            {item.tipo === 'consulta' ? item.data.motivo || 'Consulta' : item.data.producto || 'Vacuna'}
          </span>
        </button>
      ))}
    </div>
  );
}

/** Detalle de un ítem de la línea del tiempo, en un panel lateral que no interrumpe el resto de la página. */
function DrawerItemLinea({ item, onCerrar }: { item: ItemLinea; onCerrar: () => void }) {
  return (
    <div className="drawer-overlay" onClick={onCerrar}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <span>
            {ICONO_LINEA[item.tipo]} {item.tipo === 'consulta' ? 'Consulta' : 'Vacunación'}
          </span>
          <button className="link" onClick={onCerrar}>
            Cerrar ✕
          </button>
        </div>
        <div className="drawer-fecha">{new Date(item.fecha).toLocaleDateString()}</div>
        {item.tipo === 'consulta' ? (
          <div className="drawer-cuerpo">
            <Dato etiqueta="Motivo" valor={item.data.motivo ?? '—'} />
            <Dato etiqueta="Anamnesis" valor={item.data.anamnesis ?? '—'} />
            <Dato etiqueta="Examen físico" valor={item.data.examenFisico ?? '—'} />
            <Dato etiqueta="Diagnóstico" valor={item.data.diagnostico ?? '—'} />
            <Dato etiqueta="Tratamiento" valor={item.data.tratamiento ?? '—'} />
            <Dato etiqueta="Peso" valor={item.data.pesoKg ? `${item.data.pesoKg} kg` : '—'} />
            <Dato etiqueta="Temperatura" valor={item.data.temperaturaC ? `${item.data.temperaturaC} °C` : '—'} />
            <Dato etiqueta="Observaciones" valor={item.data.observaciones ?? '—'} />
          </div>
        ) : (
          <div className="drawer-cuerpo">
            <Dato etiqueta="Producto" valor={item.data.producto ?? '—'} />
            <Dato etiqueta="Próxima dosis" valor={item.data.proximaDosis ?? '—'} />
            <Dato etiqueta="Lote" valor={item.data.loteProducto ?? '—'} />
          </div>
        )}
      </div>
    </div>
  );
}

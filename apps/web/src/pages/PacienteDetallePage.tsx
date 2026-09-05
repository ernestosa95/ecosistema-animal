import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import type {
  Sesion, Animal, Especie, Consulta, Persona, Vacunacion, Producto, MovimientoStock,
  Macro, CategoriaMacro, Indicacion, OrigenIndicacion,
} from '../api/types';
import { camposDeEspecie } from '../config/especieDatos';
import { CamposEspecie } from '../components/CamposEspecie';
import { BuscadorCatalogoVacunas } from '../components/BuscadorCatalogoVacunas';
import { BuscadorCatalogoDiagnosticos } from '../components/BuscadorCatalogoDiagnosticos';
import { useFormularioPersistente, hayBorrador } from '../hooks/useFormularioPersistente';
import { comprimirImagen } from '../utils/comprimirImagen';

export function PacienteDetallePage({
  sesion,
  animal: animalInicial,
  onVolver,
  abrirConsulta = false,
  abrirVacuna = false,
}: {
  sesion: Sesion;
  animal: Animal;
  onVolver: () => void;
  abrirConsulta?: boolean;
  abrirVacuna?: boolean;
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
  const [menuConsultaId, setMenuConsultaId] = useState<string | null>(null);
  const [mostrarVacuna, setMostrarVacuna] = useState(() => !!abrirVacuna);
  const [editando, setEditando] = useState(false);
  const [generandoCarnet, setGenerandoCarnet] = useState(false);
  const [generandoFicha, setGenerandoFicha] = useState(false);
  const [itemLinea, setItemLinea] = useState<ItemLinea | null>(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);

  async function elegirFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    setErrorFoto(null);
    setSubiendoFoto(true);
    try {
      const comprimida = await comprimirImagen(archivo);
      const actualizado = await api.subirFotoAnimal(sesion, animal.id, comprimida);
      setAnimal(actualizado);
      api.registrarEvento(sesion, 'accion', 'foto-subir');
    } catch (err) {
      setErrorFoto(err instanceof Error ? err.message : 'No se pudo subir la foto');
    } finally {
      setSubiendoFoto(false);
    }
  }

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

  const VACUNAS_POR_PAGINA = 2;
  const [paginaVacunas, setPaginaVacunas] = useState(0);
  const vacunacionesOrdenadas = useMemo(
    () => [...vacunaciones].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()),
    [vacunaciones],
  );
  const totalPaginasVacunas = Math.max(1, Math.ceil(vacunacionesOrdenadas.length / VACUNAS_POR_PAGINA));
  const paginaVacunasSegura = Math.min(paginaVacunas, totalPaginasVacunas - 1);
  const vacunasPagina = vacunacionesOrdenadas.slice(
    paginaVacunasSegura * VACUNAS_POR_PAGINA,
    paginaVacunasSegura * VACUNAS_POR_PAGINA + VACUNAS_POR_PAGINA,
  );

  const CONSULTAS_POR_PAGINA = 3;
  const [paginaConsultas, setPaginaConsultas] = useState(0);
  const totalPaginasConsultas = Math.max(1, Math.ceil(consultas.length / CONSULTAS_POR_PAGINA));
  const paginaConsultasSegura = Math.min(paginaConsultas, totalPaginasConsultas - 1);
  const consultasPagina = consultas.slice(
    paginaConsultasSegura * CONSULTAS_POR_PAGINA,
    paginaConsultasSegura * CONSULTAS_POR_PAGINA + CONSULTAS_POR_PAGINA,
  );

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

  // Abre el carnet (tarjeta tipo DNI) o la ficha (hoja A4) del animal con la sesión.
  async function abrirDocumento(tipo: 'carnet' | 'ficha') {
    const setGenerando = tipo === 'carnet' ? setGenerandoCarnet : setGenerandoFicha;
    setGenerando(true);
    try {
      const API = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000';
      const res = await fetch(`${API}/animales/${animal.id}/${tipo}.pdf`, {
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
      api.registrarEvento(sesion, 'accion', tipo === 'carnet' ? 'carnet-generar' : 'ficha-generar');
    } catch (e) {
      const nombre = tipo === 'carnet' ? 'el carnet' : 'la ficha';
      alert(`No se pudo generar ${nombre}: ` + (e instanceof Error ? e.message : 'error'));
    } finally {
      setGenerando(false);
    }
  }

  async function borrarConsulta(id: string) {
    if (!confirm('¿Borrar esta consulta? No se puede deshacer.')) return;
    try {
      await api.eliminarConsulta(sesion, id);
      api.registrarEvento(sesion, 'accion', 'consulta-borrar');
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

      <div className="layout-2col">
      <div className="layout-main">
      <div className="page-head">
        <div className="pac-titulo-foto">
          <label className="pac-avatar" title={subiendoFoto ? 'Subiendo…' : animal.fotoUrl ? 'Cambiar foto' : '+ Agregar foto'}>
            {animal.fotoUrl ? <img src={animal.fotoUrl} alt={animal.nombre} /> : <span>🐾</span>}
            <input type="file" accept="image/*" disabled={subiendoFoto} onChange={elegirFoto} />
          </label>
          <div>
            <h1>{animal.nombre}</h1>
            {errorFoto && <div className="pac-avatar-err">{errorFoto}</div>}
          </div>
        </div>
        <div className="acciones">
          <span className="chip">{animal.estado}</span>
          <button className="btn-ghost" onClick={() => abrirDocumento('ficha')} disabled={generandoFicha}>
            {generandoFicha ? 'Generando…' : 'Descargar ficha (A4)'}
          </button>
          <button className="btn-ghost" onClick={() => abrirDocumento('carnet')} disabled={generandoCarnet}>
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
        <div className="card ficha-datos ficha-datos-compacta">
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
          especieId={animal.especieId}
          macros={macros}
          previa={consultas[0]}
          onGuardada={(creada) => {
            setMostrarConsulta(false);
            cargar();
            // Sigue directo a indicar medicamento/plan de tratamiento para la
            // consulta recién creada, sin tener que reabrirla por el menú ⋮.
            if (creada) {
              setDispensandoConsultaId(creada.id);
              setIndicandoConsultaId(creada.id);
            }
          }}
        />
      )}

      {error && <div className="alerta">{error}</div>}
      {/* Oculta la tabla mientras se está cargando una consulta nueva — no
          aporta mientras se completa el formulario y sacarla de en medio es
          lo que le hace lugar al formulario sin scroll de página (editar una
          consulta existente sí la deja a la vista: ahí el contexto de las
          demás filas importa). */}
      {mostrarConsulta ? null : cargando ? (
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
                <th>Costo</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {consultasPagina.map((c) =>
                editandoConsultaId === c.id ? (
                  <tr key={c.id}>
                    <td colSpan={7}>
                      <ConsultaForm
                        sesion={sesion}
                        animalId={animal.id}
                        especieId={animal.especieId}
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
                      <td>{c.costo != null ? `$${c.costo}` : '—'}</td>
                      <td className="menu-fila">
                        <button
                          className="menu-fila-btn"
                          aria-label="Acciones de esta consulta"
                          onClick={() => setMenuConsultaId(menuConsultaId === c.id ? null : c.id)}
                        >
                          ⋮
                        </button>
                        {menuConsultaId === c.id && (
                          <>
                            <div className="overlay-transparente" onClick={() => setMenuConsultaId(null)} />
                            <div className="menu-fila-dropdown">
                              <button
                                className="dropdown-item"
                                onClick={() => {
                                  setMenuConsultaId(null);
                                  setDispensandoConsultaId(dispensandoConsultaId === c.id ? null : c.id);
                                }}
                              >
                                💊 {dispensandoConsultaId === c.id ? 'Cerrar' : 'Indicar medicamento'}
                              </button>
                              <button
                                className="dropdown-item"
                                onClick={() => {
                                  setMenuConsultaId(null);
                                  setIndicandoConsultaId(indicandoConsultaId === c.id ? null : c.id);
                                }}
                              >
                                📋 {indicandoConsultaId === c.id ? 'Cerrar indicación' : 'Indicación'}
                              </button>
                              <div className="dropdown-divider" />
                              <button
                                className="dropdown-item"
                                onClick={() => {
                                  setMenuConsultaId(null);
                                  setMostrarConsulta(false);
                                  setEditandoConsultaId(c.id);
                                }}
                              >
                                ✏️ Editar
                              </button>
                              <button
                                className="dropdown-item"
                                onClick={() => {
                                  setMenuConsultaId(null);
                                  borrarConsulta(c.id);
                                }}
                              >
                                🗑️ Borrar
                              </button>
                            </div>
                          </>
                        )}
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

      {!mostrarConsulta && totalPaginasConsultas > 1 && (
        <div className="paginacion">
          <button
            type="button"
            className="btn-ghost"
            disabled={paginaConsultasSegura === 0}
            onClick={() => setPaginaConsultas(paginaConsultasSegura - 1)}
          >
            ‹ Anterior
          </button>
          <span className="muted">
            Página {paginaConsultasSegura + 1} de {totalPaginasConsultas}
          </span>
          <button
            type="button"
            className="btn-ghost"
            disabled={paginaConsultasSegura >= totalPaginasConsultas - 1}
            onClick={() => setPaginaConsultas(paginaConsultasSegura + 1)}
          >
            Siguiente ›
          </button>
        </div>
      )}

      </div>

      <div className="layout-side">
        <div className="card card-timeline-side">
          <h3 className="form-titulo">Línea de tiempo</h3>
          {!cargando && (consultas.length > 0 || vacunaciones.length > 0) ? (
            <HistoriaTimeline consultas={consultas} vacunaciones={vacunaciones} onSeleccionar={setItemLinea} />
          ) : (
            <p className="muted">Sin eventos todavía.</p>
          )}
        </div>

        <div className="card card-vacunas-side">
          <div className="card-vacunas-head">
            <h3 className="form-titulo">Vacunas</h3>
            <button className="btn btn-compacto" onClick={() => setMostrarVacuna(true)}>
              + Nueva
            </button>
          </div>
          {cargando ? (
            <p className="muted">Cargando…</p>
          ) : vacunacionesOrdenadas.length === 0 ? (
            <p className="muted">Sin vacunas registradas.</p>
          ) : (
            <>
              <ul className="vacunas-lista-compacta">
                {vacunasPagina.map((v) => (
                  <li key={v.id}>
                    <button
                      type="button"
                      onClick={() => setItemLinea({ tipo: 'vacuna', fecha: v.fecha, data: v })}
                    >
                      <span className="vacuna-fecha">{new Date(v.fecha).toLocaleDateString()}</span>
                      <span className="vacuna-producto">{v.producto ?? '—'}</span>
                    </button>
                  </li>
                ))}
              </ul>
              {totalPaginasVacunas > 1 && (
                <div className="paginacion-compacta">
                  <button
                    type="button"
                    className="link"
                    disabled={paginaVacunasSegura === 0}
                    onClick={() => setPaginaVacunas(paginaVacunasSegura - 1)}
                  >
                    ‹
                  </button>
                  <span>
                    {paginaVacunasSegura + 1}/{totalPaginasVacunas}
                  </span>
                  <button
                    type="button"
                    className="link"
                    disabled={paginaVacunasSegura >= totalPaginasVacunas - 1}
                    onClick={() => setPaginaVacunas(paginaVacunasSegura + 1)}
                  >
                    ›
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      </div>

      {mostrarVacuna && (
        <div className="drawer-overlay" onClick={() => setMostrarVacuna(false)}>
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <span>💉 Nueva vacuna</span>
              <button className="link" onClick={() => setMostrarVacuna(false)}>
                Cerrar ✕
              </button>
            </div>
            <NuevaVacunacionForm
              sesion={sesion}
              animalId={animal.id}
              especieId={animal.especieId}
              onCreada={() => {
                setMostrarVacuna(false);
                cargar();
              }}
            />
          </div>
        </div>
      )}

      {itemLinea && <DrawerItemLinea item={itemLinea} onCerrar={() => setItemLinea(null)} />}
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
      api.registrarEvento(sesion, 'accion', 'paciente-editar');
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
  especieId,
  consulta,
  macros = [],
  previa,
  onGuardada,
  onCancelar,
}: {
  sesion: Sesion;
  animalId: string;
  especieId: string;
  consulta?: Consulta;
  macros?: Macro[];
  /** Consulta anterior del mismo animal, para precargar constantes vitales (delta editing, §3.1). */
  previa?: Consulta;
  /** En un alta nueva (no edición) recibe la consulta recién creada, para poder
   * seguir directo a indicar medicamento/plan de tratamiento sin re-navegar. */
  onGuardada: (consultaCreada?: Consulta) => void;
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
      // Por defecto en 0 (no vacío) para no obligar a tipear en cada alta —
      // ya queda "solicitado" con sólo mostrarlo, y 0 es un valor válido
      // (cortesía) igual que antes.
      costo: consulta?.costo ?? '0',
    },
  );
  const campo = <K extends keyof typeof form>(k: K) => (v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  const { motivo, anamnesis, examenFisico, diagnostico, tratamiento, pesoKg, temperaturaC, observaciones, costo } = form;
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
      if (costo !== '') data.costo = Number(costo);
      if (consulta) {
        await api.actualizarConsulta(sesion, consulta.id, data);
        api.registrarEvento(sesion, 'accion', 'consulta-editar');
        limpiarBorrador();
        onGuardada();
      } else {
        const creada = await api.crearConsulta(sesion, data);
        api.registrarEvento(sesion, 'accion', 'consulta-crear');
        limpiarBorrador();
        onGuardada(creada);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="card form-grid consulta-form" onSubmit={guardar}>
      <label>
        Motivo
        <input value={motivo} onChange={(e) => campo('motivo')(e.target.value)} />
      </label>
      <label>
        Observaciones
        <input value={observaciones} onChange={(e) => campo('observaciones')(e.target.value)} />
      </label>
      <label>
        Anamnesis
        <MacroPicker categoria="anamnesis" macros={macros} onInsertar={(t) => campo('anamnesis')(anamnesis ? `${anamnesis}\n${t}` : t)} />
        <textarea rows={2} value={anamnesis} onChange={(e) => campo('anamnesis')(e.target.value)} />
      </label>
      <label>
        Examen físico
        <MacroPicker categoria="examenFisico" macros={macros} onInsertar={(t) => campo('examenFisico')(examenFisico ? `${examenFisico}\n${t}` : t)} />
        <textarea rows={2} value={examenFisico} onChange={(e) => campo('examenFisico')(e.target.value)} />
      </label>
      <label>
        Diagnóstico
        <MacroPicker categoria="diagnostico" macros={macros} onInsertar={(t) => campo('diagnostico')(t)} />
        <BuscadorCatalogoDiagnosticos
          sesion={sesion}
          especieId={especieId}
          valor={diagnostico}
          onCambiar={campo('diagnostico')}
          placeholder="Buscar en el catálogo común o escribir uno nuevo…"
        />
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
      <label>
        Costo
        <input
          type="number"
          step="0.01"
          min="0"
          value={costo}
          onChange={(e) => campo('costo')(e.target.value)}
        />
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
 * Medicamentos indicados en una consulta (F4.3, antes llamado "Dispensa de
 * fármacos" — el nombre no comunicaba bien la acción): lista lo ya indicado
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
      setError(err instanceof Error ? err.message : 'Error al cargar los medicamentos indicados');
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
      api.registrarEvento(sesion, 'accion', 'medicamento-indicar');
      setProductoId('');
      setCantidad('');
      setObservaciones('');
      cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo indicar el medicamento');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="card">
      <div className="form-titulo">Medicamentos indicados</div>
      {cargando ? (
        <p className="muted">Cargando…</p>
      ) : dispensas.length === 0 ? (
        <p className="muted">Todavía no se indicó ningún medicamento en esta consulta.</p>
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
            {guardando ? 'Guardando…' : 'Indicar medicamento'}
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
      api.registrarEvento(sesion, 'accion', 'indicacion-crear');

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
      api.registrarEvento(sesion, 'accion', 'indicacion-alternar');
      cargar();
    } catch (err) {
      alert('No se pudo actualizar: ' + (err instanceof Error ? err.message : 'error'));
    }
  }

  async function borrar(id: string) {
    if (!confirm('¿Borrar esta indicación?')) return;
    try {
      await api.eliminarIndicacion(sesion, id);
      api.registrarEvento(sesion, 'accion', 'indicacion-borrar');
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
  especieId,
  onCreada,
}: {
  sesion: Sesion;
  animalId: string;
  especieId: string;
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
      api.registrarEvento(sesion, 'accion', 'vacunacion-crear');
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
        <BuscadorCatalogoVacunas
          sesion={sesion}
          especieId={especieId}
          valor={producto}
          onCambiar={setProducto}
          placeholder="Buscar en el catálogo común o escribir uno nuevo…"
        />
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
 * fecha (orden cronológico, más antiguo primero — es una línea de tiempo,
 * se lee de izquierda a derecha), con iconografía por tipo de evento,
 * alternadas arriba/abajo de un eje central para que se puedan leer varias
 * a la vez sin amontonarse. Un click abre el detalle en un panel lateral
 * (drawer) sin perder el contexto de lo que esté abierto en la página (p.
 * ej. una consulta en edición) — el drawer es un overlay, no una navegación.
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
  ].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

  return (
    <div className="timeline-wrap-v">
      <div className="timeline-v">
        {items.map((item, i) => {
          const lado = i % 2 === 0 ? 'izquierda' : 'derecha';
          const titulo = item.tipo === 'consulta' ? item.data.motivo || 'Consulta' : item.data.producto || 'Vacuna';
          const tarjeta = (
            <button type="button" className="timeline-card timeline-v-card" onClick={() => onSeleccionar(item)}>
              <span className="timeline-icono">{ICONO_LINEA[item.tipo]}</span>
              <span className="timeline-fecha">{new Date(item.fecha).toLocaleDateString()}</span>
              <span className="timeline-titulo">{titulo}</span>
            </button>
          );
          return (
            <div key={i} className={`timeline-v-item ${lado}`}>
              <div className="timeline-v-half left">
                {lado === 'izquierda' && <>{tarjeta}<span className="timeline-v-stem" /></>}
              </div>
              <span className={`timeline-v-dot${item.tipo === 'vacuna' ? ' vacuna' : ''}`} />
              <div className="timeline-v-half right">
                {lado === 'derecha' && <><span className="timeline-v-stem" />{tarjeta}</>}
              </div>
            </div>
          );
        })}
      </div>
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

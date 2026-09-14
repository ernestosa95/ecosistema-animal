import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { useEntidadesBusqueda } from '../hooks/useEntidadesBusqueda';
import { puntuarMultiple } from '../utils/fuzzy';
import type { Sesion, Animal, Especie } from '../api/types';

/**
 * Modal reusable de "elegir paciente" para accesos rápidos que necesitan un
 * animal antes de seguir (centro de operaciones del Home: nueva consulta,
 * registro de vacuna). Busca entre los ya cargados; si no aparece, ofrece
 * darlo de alta ahí mismo — con el mismo patrón de dueño existente/nuevo que
 * `PacientesPage.tsx`/`TurnosPage.tsx` — sin salir del modal.
 */
export function SeleccionarAnimalModal({
  sesion,
  titulo,
  subtitulo,
  onCancelar,
  onSeleccionar,
}: {
  sesion: Sesion;
  titulo: string;
  subtitulo?: string;
  onCancelar: () => void;
  onSeleccionar: (animal: Animal) => void;
}) {
  const { personas, animales, refrescar } = useEntidadesBusqueda(sesion);
  const [especies, setEspecies] = useState<Especie[]>([]);
  const [query, setQuery] = useState('');
  const [modoCrear, setModoCrear] = useState(false);

  useEffect(() => {
    api.especies(sesion).then(setEspecies).catch(() => {});
  }, [sesion]);

  const personaPorId = useMemo(() => new Map(personas.map((p) => [p.id, p])), [personas]);

  const resultados = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return animales
      .map((a) => ({ animal: a, score: puntuarMultiple(q, [a.nombre, a.microchip, a.codigoLegible]) }))
      .filter((r) => r.score > 0)
      .sort((x, y) => y.score - x.score)
      .slice(0, 8);
  }, [query, animales]);

  const [nombre, setNombre] = useState('');
  const [especieId, setEspecieId] = useState('');
  const [personaId, setPersonaId] = useState('');
  const [dNombre, setDNombre] = useState('');
  const [dApellido, setDApellido] = useState('');
  const [dCelular, setDCelular] = useState('');
  const [dDni, setDDni] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  function abrirCrear() {
    setNombre(query.trim());
    setError(null);
    setModoCrear(true);
  }

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nombre.trim() || !especieId) {
      setError('Nombre y especie son obligatorios');
      return;
    }
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
      const animal = await api.crearAnimal(sesion, {
        nombre: nombre.trim(),
        especieId,
        personaId: duenoId,
      });
      refrescar();
      onSeleccionar(animal);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el paciente');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onCancelar}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <span>{titulo}</span>
          <button className="link" onClick={onCancelar}>
            Cerrar ✕
          </button>
        </div>
        {subtitulo && <p className="muted">{subtitulo}</p>}

        {modoCrear ? (
          <form className="form-grid" onSubmit={crear} style={{ marginTop: '0.75rem' }}>
            <label>
              Nombre del paciente
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
              Dueño
              <select value={personaId} onChange={(e) => setPersonaId(e.target.value)} required>
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
                  <input value={dNombre} onChange={(e) => setDNombre(e.target.value)} required />
                </label>
                <label>
                  Apellido del dueño
                  <input value={dApellido} onChange={(e) => setDApellido(e.target.value)} required />
                </label>
                <label>
                  Celular del dueño
                  <input value={dCelular} onChange={(e) => setDCelular(e.target.value)} required />
                </label>
                <label>
                  DNI del dueño
                  <input value={dDni} onChange={(e) => setDDni(e.target.value)} required />
                </label>
              </div>
            )}

            {error && <div className="alerta span-2">{error}</div>}
            <div className="span-2" style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn-ghost" onClick={() => setModoCrear(false)} disabled={guardando}>
                Volver a buscar
              </button>
              <button className="btn" type="submit" disabled={guardando}>
                {guardando ? 'Creando…' : 'Crear y continuar'}
              </button>
            </div>
          </form>
        ) : (
          <>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar paciente por nombre, código o microchip…"
              style={{ marginTop: '0.75rem' }}
            />
            {query.trim() && resultados.length === 0 && <p className="muted omni-empty">Sin resultados.</p>}
            <div className="omni-resultados">
              {resultados.map(({ animal }) => (
                <button key={animal.id} type="button" className="omni-item" onClick={() => onSeleccionar(animal)}>
                  <span className="omni-tipo">Paciente</span>
                  <b>{animal.nombre}</b>
                  <span className="muted">
                    {animal.personaId && personaPorId.get(animal.personaId)
                      ? `Dueño: ${personaPorId.get(animal.personaId)!.nombre} ${personaPorId.get(animal.personaId)!.apellido}`
                      : animal.codigoLegible ?? '—'}
                  </span>
                </button>
              ))}
            </div>
            <button type="button" className="link" style={{ marginTop: '0.75rem' }} onClick={abrirCrear}>
              ＋ No aparece: crear paciente nuevo
            </button>
          </>
        )}
      </div>
    </div>
  );
}

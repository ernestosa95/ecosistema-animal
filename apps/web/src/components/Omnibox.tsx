import { useEffect, useMemo, useRef, useState } from 'react';
import { useEntidadesBusqueda } from '../hooks/useEntidadesBusqueda';
import { puntuarMultiple } from '../utils/fuzzy';
import type { Sesion, Persona, Animal } from '../api/types';

type Resultado =
  | { tipo: 'persona'; item: Persona; score: number }
  | { tipo: 'animal'; item: Animal; score: number };

const MAX_RESULTADOS = 8;

export function Omnibox({
  sesion,
  onAbrirPersona,
  onAbrirAnimal,
}: {
  sesion: Sesion;
  onAbrirPersona: (p: Persona) => void;
  onAbrirAnimal: (a: Animal) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { personas, animales, cargando, refrescar } = useEntidadesBusqueda(sesion);

  // Atajo global Ctrl+K / Cmd+K.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setAbierto((v) => !v);
      }
      if (e.key === 'Escape') setAbierto(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (abierto) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [abierto]);

  const personaPorId = useMemo(() => new Map(personas.map((p) => [p.id, p])), [personas]);

  const resultados: Resultado[] = useMemo(() => {
    if (!query.trim()) return [];
    const rs: Resultado[] = [];
    for (const p of personas) {
      const score = puntuarMultiple(query, [p.nombre, p.apellido, p.dni, p.celular, p.telefono, p.email]);
      if (score > 0) rs.push({ tipo: 'persona', item: p, score });
    }
    for (const a of animales) {
      const score = puntuarMultiple(query, [a.nombre, a.microchip, a.codigoLegible]);
      if (score > 0) rs.push({ tipo: 'animal', item: a, score });
    }
    return rs.sort((x, y) => y.score - x.score).slice(0, MAX_RESULTADOS);
  }, [query, personas, animales]);

  if (!abierto) return null;

  function elegir(r: Resultado) {
    setAbierto(false);
    if (r.tipo === 'persona') onAbrirPersona(r.item);
    else onAbrirAnimal(r.item);
  }

  return (
    <div className="omni-overlay" onClick={(e) => { if (e.target === e.currentTarget) setAbierto(false); }}>
      <div className="omni-box">
        <div className="omni-inputrow">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, DNI, teléfono, mascota, microchip…"
          />
          <button className="btn-ghost" onClick={refrescar} disabled={cargando}>
            {cargando ? 'Actualizando…' : 'Actualizar'}
          </button>
        </div>

        {query.trim() && resultados.length === 0 && (
          <p className="muted omni-empty">Sin resultados.</p>
        )}

        <div className="omni-resultados">
          {resultados.map((r) => (
            <button
              key={`${r.tipo}-${r.item.id}`}
              className="omni-item"
              onClick={() => elegir(r)}
            >
              {r.tipo === 'persona' ? (
                <>
                  <span className="omni-tipo">Dueño</span>
                  <b>{r.item.nombre} {r.item.apellido}</b>
                  <span className="muted">{r.item.dni ? `DNI ${r.item.dni}` : r.item.celular ?? ''}</span>
                </>
              ) : (
                <>
                  <span className="omni-tipo">Paciente</span>
                  <b>{r.item.nombre}</b>
                  <span className="muted">
                    {r.item.personaId && personaPorId.get(r.item.personaId)
                      ? `Dueño: ${personaPorId.get(r.item.personaId)!.nombre} ${personaPorId.get(r.item.personaId)!.apellido}`
                      : r.item.codigoLegible ?? ''}
                  </span>
                </>
              )}
            </button>
          ))}
        </div>

        <p className="omni-hint muted">Ctrl+K (Cmd+K en Mac) para abrir/cerrar — Esc para cerrar</p>
      </div>
    </div>
  );
}

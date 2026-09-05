import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import type { Sesion, ItemCatalogoVacunas } from '../api/types';

/**
 * Buscador con autocompletar contra el catálogo de referencia (vacunas/
 * antiparasitarios comunes) filtrado por especie — mismo criterio que
 * `BuscadorSenasa`: el texto es siempre libre (la guía es chica y no cubre
 * todo, tiene que poder cargarse algo que no está), filtrado client-side
 * porque la lista es corta (menos de una decena por especie, no hace falta
 * pegarle al server en cada tecla como con SENASA).
 */
export function BuscadorCatalogoVacunas({
  sesion,
  especieId,
  valor,
  onCambiar,
  placeholder,
}: {
  sesion: Sesion;
  especieId: string;
  valor: string;
  onCambiar: (v: string) => void;
  placeholder?: string;
}) {
  const [catalogo, setCatalogo] = useState<ItemCatalogoVacunas[]>([]);
  const [abierto, setAbierto] = useState(false);
  const cerrarTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    api.catalogoVacunas(sesion, especieId).then(setCatalogo).catch(() => setCatalogo([]));
  }, [sesion, especieId]);

  const termino = valor.trim().toLowerCase();
  const resultados = termino ? catalogo.filter((c) => c.nombre.toLowerCase().includes(termino)) : catalogo;

  function elegir(c: ItemCatalogoVacunas) {
    onCambiar(c.nombre);
    setAbierto(false);
  }

  return (
    <div className="selector-busqueda">
      <input
        value={valor}
        onChange={(e) => {
          onCambiar(e.target.value);
          setAbierto(true);
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => {
          cerrarTimeout.current = setTimeout(() => setAbierto(false), 150);
        }}
        placeholder={placeholder}
        autoComplete="off"
        required
      />
      {abierto && resultados.length > 0 && (
        <div className="selector-busqueda-resultados">
          {resultados.map((c) => (
            <button
              type="button"
              key={c.id}
              onMouseDown={(e) => {
                e.preventDefault();
                if (cerrarTimeout.current) clearTimeout(cerrarTimeout.current);
                elegir(c);
              }}
            >
              {c.nombre}
              <span className="muted"> · {c.categoria}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

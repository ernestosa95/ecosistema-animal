import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import type { Sesion, ProductoSenasa } from '../api/types';

/**
 * Buscador con autocompletar contra el catálogo de referencia de SENASA
 * (F4.1, ~7000 productos veterinarios registrados a nivel nacional) — a
 * diferencia de `SelectorBusqueda` (lista cerrada, cargada entera del
 * cliente), acá el texto es siempre libre (el nombre de un producto no es
 * una lista cerrada) y la búsqueda es server-side (la tabla es demasiado
 * grande para traerla entera). Elegir una sugerencia sólo autocompleta el
 * nombre — no guarda ningún vínculo con el registro SENASA en `productos`.
 */
export function BuscadorSenasa({
  sesion,
  valor,
  onCambiar,
  placeholder,
}: {
  sesion: Sesion;
  valor: string;
  onCambiar: (v: string) => void;
  placeholder?: string;
}) {
  const [resultados, setResultados] = useState<ProductoSenasa[]>([]);
  const [abierto, setAbierto] = useState(false);
  const cerrarTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const termino = valor.trim();
    if (termino.length < 2) {
      setResultados([]);
      return;
    }
    const id = setTimeout(() => {
      api.buscarVademecumSenasa(sesion, termino).then(setResultados).catch(() => setResultados([]));
    }, 300);
    return () => clearTimeout(id);
  }, [valor, sesion]);

  function elegir(r: ProductoSenasa) {
    onCambiar(r.nombreComercial);
    setResultados([]);
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
          {resultados.map((r) => (
            <button
              type="button"
              key={r.id}
              onMouseDown={(e) => {
                e.preventDefault();
                if (cerrarTimeout.current) clearTimeout(cerrarTimeout.current);
                elegir(r);
              }}
            >
              {r.nombreComercial}
              {r.empresa ? <span className="muted"> · {r.empresa}</span> : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

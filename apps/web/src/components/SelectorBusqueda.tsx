import { useEffect, useRef, useState } from 'react';

/**
 * Campo de tipo búsqueda para elegir de una lista cerrada de opciones — a
 * diferencia de un <select>, deja filtrar tipeando; a diferencia de un
 * <input list> con <datalist>, no deja mandar texto libre: si al perder el
 * foco lo tipeado no matchea ninguna opción exacta, se descarta y vuelve al
 * último valor válido.
 */
export function SelectorBusqueda({
  opciones,
  valor,
  onCambiar,
  placeholder,
  id,
}: {
  opciones: readonly string[];
  valor: string;
  onCambiar: (v: string) => void;
  placeholder?: string;
  id?: string;
}) {
  const [query, setQuery] = useState(valor);
  const [abierto, setAbierto] = useState(false);
  const cerrarTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQuery(valor);
  }, [valor]);

  const filtradas = query.trim()
    ? opciones.filter((o) => o.toLowerCase().includes(query.trim().toLowerCase()))
    : opciones;

  function elegir(o: string) {
    onCambiar(o);
    setQuery(o);
    setAbierto(false);
  }

  function onBlur() {
    // Delay para que el click en una opción (onMouseDown) llegue a disparar
    // antes de que el blur cierre/descarte lo tipeado.
    cerrarTimeout.current = setTimeout(() => {
      if (query !== valor && !opciones.includes(query)) {
        setQuery(valor);
      }
      setAbierto(false);
    }, 150);
  }

  return (
    <div className="selector-busqueda">
      <input
        id={id}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setAbierto(true);
          if (e.target.value === '') onCambiar('');
        }}
        onFocus={() => setAbierto(true)}
        onBlur={onBlur}
        placeholder={placeholder}
        autoComplete="off"
      />
      {abierto && filtradas.length > 0 && (
        <div className="selector-busqueda-resultados">
          {filtradas.map((o) => (
            <button
              type="button"
              key={o}
              onMouseDown={(e) => {
                e.preventDefault();
                if (cerrarTimeout.current) clearTimeout(cerrarTimeout.current);
                elegir(o);
              }}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

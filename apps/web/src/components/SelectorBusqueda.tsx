import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Campo de tipo búsqueda para elegir de una lista cerrada de opciones — a
 * diferencia de un <select>, deja filtrar tipeando; a diferencia de un
 * <input list> con <datalist>, no deja mandar texto libre: si al perder el
 * foco lo tipeado no matchea ninguna opción exacta, se descarta y vuelve al
 * último valor válido.
 *
 * El listado de resultados se renderiza en un portal a `document.body` con
 * `position: fixed`, calculado desde el `<input>` — no como hijo posicionado
 * `absolute` dentro del propio flujo. Así evita quedar recortado por el
 * `overflow` de un ancestro (ej. `.modal-panel`, que tiene `overflow-y:
 * auto`): un modal corto (como "Ingreso de stock", que arranca con un único
 * campo visible) hacía que el desplegable se cortara justo en el borde del
 * modal en vez de mostrarse completo.
 */
export function SelectorBusqueda({
  opciones,
  valor,
  onCambiar,
  placeholder,
  id,
  required,
}: {
  opciones: readonly string[];
  valor: string;
  onCambiar: (v: string) => void;
  placeholder?: string;
  id?: string;
  required?: boolean;
}) {
  const [query, setQuery] = useState(valor);
  const [abierto, setAbierto] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cerrarTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQuery(valor);
  }, [valor]);

  // Recalcula la posición mientras está abierto — cubre el caso de abrirlo y
  // después scrollear el contenedor (el modal, la página) sin cerrarlo.
  useLayoutEffect(() => {
    if (!abierto || !inputRef.current) return;
    const actualizar = () => {
      const r = inputRef.current!.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left, width: r.width });
    };
    actualizar();
    window.addEventListener('scroll', actualizar, true);
    window.addEventListener('resize', actualizar);
    return () => {
      window.removeEventListener('scroll', actualizar, true);
      window.removeEventListener('resize', actualizar);
    };
  }, [abierto]);

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
      if (query !== valor) {
        // Lo tipeado matchea una opción exacta pero se perdió el foco antes
        // de clickearla (ej. Tab) — confirma igual, en vez de descartarlo
        // silenciosamente y dejar `valor` desactualizado con el input ya
        // mostrando el texto que matchea.
        if (opciones.includes(query)) onCambiar(query);
        else setQuery(valor);
      }
      setAbierto(false);
    }, 150);
  }

  return (
    <div className="selector-busqueda">
      <input
        ref={inputRef}
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
        required={required}
      />
      {abierto && filtradas.length > 0 && pos && createPortal(
        <div
          className="selector-busqueda-resultados"
          style={{ top: pos.top, left: pos.left, width: pos.width }}
        >
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
        </div>,
        document.body,
      )}
    </div>
  );
}

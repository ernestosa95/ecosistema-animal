import { useEffect, useRef, useState } from 'react';

const PREFIJO = 'ecosistema.borrador.';
const TTL_MS = 24 * 60 * 60 * 1000; // 24h — un borrador más viejo que esto no se resucita solo

interface Envoltorio<T> {
  valor: T;
  guardadoEn: number;
}

function leer<T>(clave: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIJO + clave);
    if (!raw) return null;
    const env: Envoltorio<T> = JSON.parse(raw);
    if (Date.now() - env.guardadoEn > TTL_MS) {
      localStorage.removeItem(PREFIJO + clave);
      return null;
    }
    return env.valor;
  } catch {
    return null;
  }
}

/**
 * Para páginas donde el formulario vive detrás de un toggle ("+ Nuevo…"):
 * permite abrirlo solo si hay un borrador vigente, en vez de dejarlo oculto
 * después de una recarga con datos guardados pero invisibles.
 */
export function hayBorrador(clave: string): boolean {
  return leer(clave) !== null;
}

/**
 * Como useState, pero persiste el valor en localStorage (debounced) para no
 * perder un formulario largo ante una recarga accidental. `limpiar()` borra
 * el borrador — llamar al guardar exitosamente el formulario real.
 */
export function useFormularioPersistente<T>(clave: string, valorInicial: T) {
  const [valor, setValor] = useState<T>(() => leer<T>(clave) ?? valorInicial);
  const primerRender = useRef(true);

  useEffect(() => {
    if (primerRender.current) {
      primerRender.current = false;
      return;
    }
    const id = setTimeout(() => {
      try {
        const env: Envoltorio<T> = { valor, guardadoEn: Date.now() };
        localStorage.setItem(PREFIJO + clave, JSON.stringify(env));
      } catch {
        /* localStorage lleno o deshabilitado — no rompe el formulario */
      }
    }, 300);
    return () => clearTimeout(id);
  }, [clave, valor]);

  function limpiar() {
    localStorage.removeItem(PREFIJO + clave);
  }

  return [valor, setValor, limpiar] as const;
}

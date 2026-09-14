import { useEffect, useRef, useState } from 'react';
import { Joyride, ACTIONS, EVENTS, STATUS, type EventData } from 'react-joyride';
import type { Sesion } from '../api/types';
import { tourAdministrativo, tourVeterinario, tourRecepcion, tourCapataz, type SeccionTour, type TourStep } from '../tutorial/tours';

// Un usuario ve UN solo tour, elegido con la misma prioridad que `homeDe()`
// en App.tsx para la pantalla de inicio: administrativo > veterinario >
// recepción > capataz. No se combinan tours de varios roles.
const ROLES_ADMINISTRATIVO = new Set(['propietario', 'admin']);
const ROLES_VETERINARIO = new Set(['veterinario']);
const ROLES_RECEPCION = new Set(['recepcion']);

function tieneAlguno(roles: string[] | undefined, set: Set<string>): boolean {
  return (roles ?? []).some((r) => set.has(r));
}

function tourPara(roles: string[] | undefined): TourStep[] {
  if (tieneAlguno(roles, ROLES_ADMINISTRATIVO)) return tourAdministrativo;
  if (tieneAlguno(roles, ROLES_VETERINARIO)) return tourVeterinario;
  if (tieneAlguno(roles, ROLES_RECEPCION)) return tourRecepcion;
  return tourCapataz;
}

export function TutorialGuiado({
  sesion,
  activo,
  seccionActual,
  onNavegar,
  onTerminar,
}: {
  sesion: Sesion;
  activo: boolean;
  seccionActual: SeccionTour;
  onNavegar: (seccion: SeccionTour) => void;
  onTerminar: () => void;
}) {
  const steps = tourPara(sesion.roles);
  const [stepIndex, setStepIndex] = useState(0);
  // Índice al que hay que llegar una vez que `seccionActual` refleje el
  // cambio de sección que ese paso necesita (ver efecto de abajo).
  const pendiente = useRef<number | null>(null);
  const pendienteDireccion = useRef<1 | -1>(1);

  // Un target puede existir en el DOM pero estar oculto por CSS (ej.
  // nav-animales/nav-duenos en el layout mobile, ver styles.css) — Joyride
  // sólo dispara TARGET_NOT_FOUND cuando el selector no matchea nada, no
  // cuando matchea un elemento con display:none, así que ese caso hay que
  // detectarlo acá y tratarlo igual: saltear el paso en vez de anclar el
  // tooltip a un elemento invisible de 0x0.
  function elementoVisible(target: TourStep['target']): boolean {
    if (typeof target !== 'string' || target === 'body') return true;
    const el = document.querySelector(target);
    return !!el && (el as HTMLElement).offsetParent !== null;
  }

  function mostrarPaso(idx: number, direccion: 1 | -1) {
    if (idx < 0 || idx >= steps.length) {
      onTerminar();
      return;
    }
    if (!elementoVisible(steps[idx].target)) {
      irAPaso(idx + direccion, direccion);
      return;
    }
    setStepIndex(idx);
  }

  useEffect(() => {
    if (activo) {
      pendiente.current = null;
      setStepIndex(0);
    }
  }, [activo]);

  // Un paso que requiere otra sección primero navega (onNavegar cambia la
  // `vista` en App.tsx) y recién cuando ese cambio ya se reflejó acá — es
  // decir, cuando la página nueva ya está montada — se avanza el índice,
  // para que el target exista en el DOM cuando Joyride lo busque.
  useEffect(() => {
    if (pendiente.current === null) return;
    const idx = pendiente.current;
    const requerida = steps[idx]?.seccion;
    if (requerida === null || requerida === undefined || requerida === seccionActual) {
      pendiente.current = null;
      mostrarPaso(idx, pendienteDireccion.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seccionActual, steps]);

  function irAPaso(idx: number, direccion: 1 | -1 = 1) {
    if (idx < 0 || idx >= steps.length) {
      onTerminar();
      return;
    }
    const requerida = steps[idx].seccion;
    if (requerida !== null && requerida !== seccionActual) {
      pendiente.current = idx;
      pendienteDireccion.current = direccion;
      onNavegar(requerida);
    } else {
      mostrarPaso(idx, direccion);
    }
  }

  function onEvent(data: EventData) {
    const { type, action, index, status } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      onTerminar();
      return;
    }
    if (type === EVENTS.TARGET_NOT_FOUND) {
      // El elemento no está en pantalla en este momento (ej. una sub-vista
      // distinta a la esperada dentro de la sección) — no bloquea el tour,
      // sigue en la misma dirección en la que se venía moviendo.
      const direccion: 1 | -1 = action === ACTIONS.PREV ? -1 : 1;
      irAPaso(index + direccion, direccion);
      return;
    }
    if (type === EVENTS.STEP_AFTER) {
      if (action === ACTIONS.NEXT) irAPaso(index + 1, 1);
      else if (action === ACTIONS.PREV) irAPaso(index - 1, -1);
      else if (action === ACTIONS.CLOSE || action === ACTIONS.SKIP) onTerminar();
    }
  }

  if (!activo) return null;

  return (
    <Joyride
      steps={steps}
      run={activo}
      stepIndex={stepIndex}
      continuous
      scrollToFirstStep
      onEvent={onEvent}
      locale={{ back: 'Atrás', close: 'Cerrar', last: 'Listo', next: 'Siguiente', skip: 'Saltar' }}
      styles={{ options: { primaryColor: '#0e7c6b', zIndex: 10000 } }}
    />
  );
}

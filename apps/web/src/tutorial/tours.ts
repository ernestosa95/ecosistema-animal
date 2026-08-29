// Contenido de los tours guiados (react-joyride) por rol. Un usuario ve UN
// solo tour — el mismo criterio de prioridad que `homeDe()` en App.tsx para
// elegir la pantalla de inicio: si tiene un rol administrativo ve ese tour
// (es el más completo), si no el de veterinario, si no el de recepción, si
// no el de capataz. No se combinan tours de varios roles para no duplicar
// pasos de navegación ya cubiertos.
import type { Step } from 'react-joyride';

// Subconjunto de los `nombre` de `Vista` (App.tsx) a los que un paso puede
// necesitar navegar antes de poder resaltar su `target`.
export type SeccionTour =
  | 'dashboard' | 'turnos' | 'animales' | 'duenos' | 'recordatorios'
  | 'tropera' | 'usuarios' | 'farmacia' | 'caja';

export interface TourStep extends Step {
  // Sección a la que hay que navegar (vía setVista) antes de mostrar este
  // paso. `null` = no requiere navegación (paso de bienvenida/cierre).
  seccion: SeccionTour | null;
}

const CIERRE: TourStep = {
  seccion: null,
  target: 'body',
  placement: 'center',
  title: '¡Listo!',
  content:
    'Podés volver a ver esta guía cuando quieras con el botón "Ayuda" de arriba a la derecha.',
};

function bienvenida(texto: string): TourStep {
  return { seccion: null, target: 'body', placement: 'center', title: '¡Bienvenido/a!', content: texto };
}

export const tourAdministrativo: TourStep[] = [
  bienvenida(
    'Esta es una guía rápida de las secciones principales. Podés saltarla o cerrarla en cualquier momento — siempre vas a poder volver a abrirla desde "Ayuda".',
  ),
  {
    seccion: 'dashboard',
    target: '[data-tour="nav-dashboard"]',
    title: 'Resumen',
    content: 'El estado general de la organización: pacientes activos, consultas y turnos del mes, con detalle al hacer click en cada número.',
  },
  {
    seccion: 'turnos',
    target: '[data-tour="nav-turnos"]',
    title: 'Turnos',
    content: 'La agenda del día. Desde acá se da un turno nuevo, se reprograma, se cancela o se marca como atendido.',
  },
  {
    seccion: 'turnos',
    target: '[data-tour="turnos-nuevo"]',
    title: 'Dar un turno',
    content: 'Con este botón se da un turno nuevo. Si el paciente todavía no está cargado, se puede crear (junto con su dueño) sin salir del formulario.',
  },
  {
    seccion: 'animales',
    target: '[data-tour="nav-animales"]',
    title: 'Animales',
    content: 'El registro de pacientes. Cada ficha tiene sus consultas, vacunaciones, indicaciones y el carnet/ficha para imprimir.',
  },
  {
    seccion: 'animales',
    target: '[data-tour="animales-nuevo"]',
    title: 'Dar de alta un animal',
    content: 'Acá se carga un paciente nuevo. Si el dueño todavía no existe, también se puede crear sin salir de este formulario.',
  },
  {
    seccion: 'duenos',
    target: '[data-tour="nav-duenos"]',
    title: 'Dueños',
    content: 'La lista de dueños. Desde cada uno se pueden ver sus mascotas y generarle un acceso al portal (para que consulte el historial desde su celular).',
  },
  {
    seccion: 'usuarios',
    target: '[data-tour="nav-usuarios"]',
    title: 'Usuarios',
    content: 'Los miembros de tu organización. Desde acá se les puede resetear la contraseña.',
  },
  {
    seccion: 'farmacia',
    target: '[data-tour="nav-farmacia"]',
    title: 'Farmacia',
    content: 'El vademécum y el stock de productos, con el historial de compras, usos y mermas.',
  },
  {
    seccion: 'caja',
    target: '[data-tour="nav-caja"]',
    title: 'Caja',
    content: 'La caja del mostrador: se abre al empezar el día, se cargan cobros y egresos, y se cierra al final comparando lo calculado contra lo contado.',
  },
  {
    seccion: 'tropera',
    target: '[data-tour="nav-tropera"]',
    title: 'Tropera',
    content: 'Si además manejás hacienda: establecimientos, existencias por categoría, movimientos y seguimiento individual de animales.',
  },
  CIERRE,
];

export const tourVeterinario: TourStep[] = [
  bienvenida(
    'Esta es una guía rápida de lo que más vas a usar. Podés saltarla o cerrarla en cualquier momento — siempre vas a poder volver a abrirla desde "Ayuda".',
  ),
  {
    seccion: 'turnos',
    target: '[data-tour="nav-turnos"]',
    title: 'Turnos',
    content: 'Tu agenda del día. El filtro "Mis turnos" muestra sólo los que tenés asignados. Al atender uno se abre directo la ficha del paciente con la consulta lista para cargar.',
  },
  {
    seccion: 'animales',
    target: '[data-tour="nav-animales"]',
    title: 'Animales',
    content: 'Buscá un paciente y entrá a su ficha para cargar consultas, vacunaciones, indicaciones con calculadora de dosis, y descargar su carnet o ficha.',
  },
  {
    seccion: 'farmacia',
    target: '[data-tour="nav-farmacia"]',
    title: 'Farmacia',
    content: 'El stock de productos. La dispensa durante una consulta (desde la ficha del paciente) descuenta stock automáticamente.',
  },
  CIERRE,
];

export const tourRecepcion: TourStep[] = [
  bienvenida(
    'Esta es una guía rápida de lo que más vas a usar en el mostrador. Podés saltarla o cerrarla en cualquier momento — siempre vas a poder volver a abrirla desde "Ayuda".',
  ),
  {
    seccion: 'turnos',
    target: '[data-tour="nav-turnos"]',
    title: 'Turnos',
    content: 'La agenda del día: dar turnos nuevos, reprogramar, cancelar y asignar profesional.',
  },
  {
    seccion: 'turnos',
    target: '[data-tour="turnos-nuevo"]',
    title: 'Dar un turno',
    content: 'Si el paciente no está cargado todavía, se puede crear (junto con su dueño) sin salir de este formulario.',
  },
  {
    seccion: 'animales',
    target: '[data-tour="nav-animales"]',
    title: 'Animales',
    content: 'Buscá un paciente por nombre o código para ver su ficha rápidamente.',
  },
  {
    seccion: 'caja',
    target: '[data-tour="nav-caja"]',
    title: 'Caja',
    content: 'Se abre al empezar el turno y desde ahí se cargan los cobros del mostrador.',
  },
  CIERRE,
];

export const tourCapataz: TourStep[] = [
  bienvenida(
    'Esta es una guía rápida de Tropera. Podés saltarla o cerrarla en cualquier momento — siempre vas a poder volver a abrirla desde "Ayuda".',
  ),
  {
    seccion: 'tropera',
    target: '[data-tour="nav-tropera"]',
    title: 'Tropera',
    content: 'Acá se gestiona la hacienda: un establecimiento agrupa existencias por categoría, movimientos, eventos sanitarios y (si hace falta) animales identificados individualmente.',
  },
  {
    seccion: 'tropera',
    target: '[data-tour="tropera-nuevo"]',
    title: 'Dar de alta un establecimiento',
    content: 'El primer paso es cargar el establecimiento. Entrando a uno se accede a existencias, movimientos, potreros y animales.',
  },
  CIERRE,
];

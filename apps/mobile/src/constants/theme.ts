import { Platform, type ViewStyle } from 'react-native';

/**
 * Paleta compartida con la web (apps/web/src/styles.css `:root`) — mismos
 * valores hex, para que el mobile no introduzca una identidad visual propia.
 * Actualizado 2026-09-02 para seguir la paleta slate + tokens de sombra que
 * la web ya tiene desde el rediseño del shell (antes el mobile tenía una
 * paleta de grises cálidos vieja, `#1f2933`/`#6b7280`/`#e5e7eb`/`#f6f7f4`,
 * sin `advertencia` ni `celeste` ni sombras).
 */
export const Colors = {
  verde: '#5c8a4e',
  verdeDark: '#4a7340',
  // Antes `verdeClaro` — renombrado para calzar 1:1 con el token de la web
  // (`--huella-bg`), que es el fondo suave de la solución Huella.
  huellaBg: '#ecfdf5',
  tierra: '#8b5a2b',
  troperaBg: '#fdf4eb',
  celeste: '#4f8fc0',
  text: '#1e293b',
  muted: '#64748b',
  border: '#e2e8f0',
  bg: '#f4f7f9',
  card: '#ffffff',
  hoverBg: '#f1f5f9',
  danger: '#b91c1c',
  dangerBg: '#fef2f2',
  advertencia: '#b45309',
  advertenciaBg: '#fef3c7',
};

/** Radios de borde, calcados de los mismos valores en px que usa styles.css. */
export const Radii = {
  card: 14,
  btn: 9,
  pill: 999,
};

/**
 * Traducción a RN de `--sombra-suave`/`--sombra-flotante` (box-shadow no
 * existe en RN: iOS usa shadow*, Android usa `elevation`). Se aplican como
 * spread en el `style` de cards/botones/modales.
 */
export const Shadows: Record<'suave' | 'flotante', ViewStyle> = {
  suave: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    ...Platform.select({ android: { elevation: 2 }, default: {} }),
  },
  flotante: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    ...Platform.select({ android: { elevation: 8 }, default: {} }),
  },
};

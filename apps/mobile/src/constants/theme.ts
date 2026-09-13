import { Platform, type ViewStyle } from 'react-native';

/**
 * Paleta compartida con la web (apps/web/src/styles.css `:root`) — mismos
 * valores hex, para que el mobile no introduzca una identidad visual propia.
 * Actualizado 2026-09-10 con el kit de marca Huella (docs/Kit_Marca_Huella.html):
 * el verde salvia (`#5c8a4e`) y los grises slate quedan reemplazados por el
 * Verde Huella y una paleta neutra cálida ("papel", nunca gris de sistema
 * operativo). `tierra`/`troperaBg`/`celeste` son de Tropera
 * (Identidad_Visual_Tropera.pdf) y no se tocan — este rediseño es solo Huella.
 */
export const Colors = {
  verde: '#0e7c6b',
  verdeDark: '#0a5c4f',
  huellaBg: '#e5f2ef',
  tierra: '#8b5a2b',
  troperaBg: '#fdf4eb',
  celeste: '#4f8fc0',
  text: '#1e2a23',
  muted: '#6c6650',
  border: '#e2dfd6',
  bg: '#f6f5f1',
  card: '#ffffff',
  hoverBg: '#edebe4',
  danger: '#b91c1c',
  dangerBg: '#fef2f2',
  // "Sello" del kit de marca: atención/pendiente, nunca error (Prueba de
  // Resistencia de Marca, Parte 06) — antes un ámbar (`#b45309`) genérico.
  advertencia: '#a13d2b',
  advertenciaBg: '#f5e6df',
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
    shadowColor: '#1e2a23',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    ...Platform.select({ android: { elevation: 2 }, default: {} }),
  },
  flotante: {
    shadowColor: '#1e2a23',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    ...Platform.select({ android: { elevation: 8 }, default: {} }),
  },
};

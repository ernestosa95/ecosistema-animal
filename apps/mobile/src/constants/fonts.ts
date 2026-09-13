/**
 * Tipografía del kit de marca Huella (docs/Kit_Marca_Huella.html) — misma
 * combinación que la web (Sora / Work Sans / IBM Plex Mono), cargada vía
 * @expo-google-fonts/* y `useFonts` en `app/_layout.tsx`. Sora reemplazó a
 * Zilla Slab el 2026-09-10: la slab serif se veía demasiado antigua/vintage
 * en pantalla — Sora mantiene el mismo lenguaje redondeado de terminales
 * que el sello, con un trazo geométrico moderno.
 */
import { Sora_600SemiBold, Sora_700Bold } from '@expo-google-fonts/sora';
import {
  WorkSans_400Regular,
  WorkSans_500Medium,
  WorkSans_600SemiBold,
} from '@expo-google-fonts/work-sans';
import { IBMPlexMono_500Medium, IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono';

export const FontsToLoad = {
  Sora_600SemiBold,
  Sora_700Bold,
  WorkSans_400Regular,
  WorkSans_500Medium,
  WorkSans_600SemiBold,
  IBMPlexMono_500Medium,
  IBMPlexMono_600SemiBold,
};

/** Nombres de familia listos para usar en `fontFamily`, por rol. */
export const Fonts = {
  heading: 'Sora_600SemiBold',
  headingBold: 'Sora_700Bold',
  body: 'WorkSans_400Regular',
  bodyMedium: 'WorkSans_500Medium',
  bodySemiBold: 'WorkSans_600SemiBold',
  mono: 'IBMPlexMono_500Medium',
  monoSemiBold: 'IBMPlexMono_600SemiBold',
};

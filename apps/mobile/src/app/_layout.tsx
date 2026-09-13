import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Text, TextInput, useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { SesionProvider, useSesionContext } from '@/auth/SesionContext';
import { SyncProvider } from '@/db/SyncContext';
import { api } from '@/api/client';
import { Fonts, FontsToLoad } from '@/constants/fonts';

SplashScreen.preventAutoHideAsync();

// Work Sans como fuente por defecto de todo `Text`/`TextInput` de la app —
// kit de marca Huella — en vez de reescribir el `fontFamily` pantalla por
// pantalla. Un componente puede seguir pisándolo (ej. títulos con
// `Fonts.heading`, Zilla Slab).
(Text as any).defaultProps = (Text as any).defaultProps || {};
(Text as any).defaultProps.style = [{ fontFamily: Fonts.body }, (Text as any).defaultProps.style];
(TextInput as any).defaultProps = (TextInput as any).defaultProps || {};
(TextInput as any).defaultProps.style = [
  { fontFamily: Fonts.body },
  (TextInput as any).defaultProps.style,
];

function RootNavigator() {
  const { sesion, cargando } = useSesionContext();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (cargando) return;
    SplashScreen.hideAsync();
    const enGrupoApp = segments[0] === '(app)';
    const enRutaAutenticadaFueraDeTabs =
      segments[0] === 'establecimiento' || segments[0] === 'paciente' || segments[0] === 'animales';
    if (!sesion && (enGrupoApp || enRutaAutenticadaFueraDeTabs)) {
      router.replace('/login');
    } else if (sesion && !enGrupoApp && !enRutaAutenticadaFueraDeTabs) {
      // `(app)/index.tsx` decide sola a qué pestaña redirigir según
      // huellaActiva/troperaActiva — un solo lugar con esa lógica en vez de
      // duplicarla acá también.
      router.replace('/(app)');
    }
  }, [sesion, cargando, segments, router]);

  // Analítica centralizada de pantallas, mismo patrón que `App.tsx` en la
  // web: un solo lugar (acá, en vez de por-pantalla) que dispara al cambiar
  // de ruta. `(app)` a solas (sin subsegmento) es el redirect-shim de
  // `(app)/index.tsx` resolviendo hacia home/establecimientos — no es una
  // pantalla real, se ignora para no ensuciar la métrica.
  const rutaAnalitica = segments.filter((s) => !s.startsWith('(')).join('/');
  useEffect(() => {
    if (!sesion || cargando || !rutaAnalitica) return;
    api.registrarEvento(sesion, 'pantalla', rutaAnalitica);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesion, cargando, rutaAnalitica]);

  // Stack (no Slot): router.back() necesita un navigator de verdad para
  // tener historial del cual volver — con Slot a solas no funcionaba.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="(app)" />
      <Stack.Screen name="establecimiento/[id]" />
      <Stack.Screen name="paciente/nuevo" />
      <Stack.Screen name="paciente/[id]" />
      <Stack.Screen name="animales" />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts(FontsToLoad);

  // El splash nativo (expo-splash-screen, ver app.json) sigue visible hasta
  // que las tipografías del kit de marca terminan de cargar — sin esto, la
  // primera pantalla parpadearía con la fuente de sistema y después
  // "saltaría" a Zilla Slab/Work Sans una vez montadas.
  if (!fontsLoaded) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SesionProvider>
        <SyncProvider>
          <AnimatedSplashOverlay />
          <RootNavigator />
        </SyncProvider>
      </SesionProvider>
    </ThemeProvider>
  );
}

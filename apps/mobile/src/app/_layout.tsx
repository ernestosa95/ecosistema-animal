import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { SesionProvider, useSesionContext } from '@/auth/SesionContext';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { sesion, cargando } = useSesionContext();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (cargando) return;
    SplashScreen.hideAsync();
    const enGrupoApp = segments[0] === '(app)';
    const enRutaAutenticadaFueraDeTabs = segments[0] === 'establecimiento' || segments[0] === 'paciente';
    if (!sesion && (enGrupoApp || enRutaAutenticadaFueraDeTabs)) {
      router.replace('/login');
    } else if (sesion && !enGrupoApp && !enRutaAutenticadaFueraDeTabs) {
      router.replace('/(app)');
    }
  }, [sesion, cargando, segments, router]);

  // Stack (no Slot): router.back() necesita un navigator de verdad para
  // tener historial del cual volver — con Slot a solas no funcionaba.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="(app)" />
      <Stack.Screen name="establecimiento/[id]" />
      <Stack.Screen name="paciente/nuevo" />
      <Stack.Screen name="paciente/[id]" />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SesionProvider>
        <AnimatedSplashOverlay />
        <RootNavigator />
      </SesionProvider>
    </ThemeProvider>
  );
}

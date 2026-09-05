import { Text } from 'react-native';
import { Tabs } from 'expo-router';
import { useSesionContext } from '@/auth/SesionContext';
import { EncabezadoApp } from '@/components/EncabezadoApp';
import { Colors } from '@/constants/theme';

function TabIcon({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 20 }}>{emoji}</Text>;
}

export default function AppLayout() {
  const { sesion } = useSesionContext();

  // Ver el comentario análogo en (app)/index.tsx: instante transitorio sin
  // sesión antes de que `_layout.tsx` raíz redirija a /login.
  if (!sesion) return null;

  // Mismo criterio que `nav/config.ts` en la web: las pestañas de Huella
  // (Home/Pacientes/Turnos) sólo tienen sentido si la organización tiene esa
  // solución activada, e ídem Establecimientos con Tropera — sin esto, una
  // organización sólo-Tropera veía pestañas de Huella vacías/rotas y
  // viceversa. `href: null` es el patrón de expo-router para ocultar una
  // pestaña de la tab bar sin desmontar la ruta.
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: Colors.verdeDark, header: () => <EncabezadoApp /> }}>
      {/* Nunca se ve: redirige a home/establecimientos apenas se monta — ver el comentario en index.tsx. */}
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: () => <TabIcon emoji="🏠" />,
          href: sesion.huellaActiva ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="turnos"
        options={{
          title: 'Turnos',
          tabBarIcon: () => <TabIcon emoji="📅" />,
          href: sesion.huellaActiva ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="establecimientos"
        options={{
          title: 'Establecimientos',
          tabBarIcon: () => <TabIcon emoji="🌾" />,
          href: sesion.troperaActiva ? undefined : null,
        }}
      />
    </Tabs>
  );
}

import { Tabs } from 'expo-router';
import { Colors } from '@/constants/theme';

export default function AppLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: Colors.verdeDark }}>
      <Tabs.Screen name="pacientes" options={{ title: 'Pacientes' }} />
      <Tabs.Screen name="turnos" options={{ title: 'Turnos' }} />
      <Tabs.Screen name="index" options={{ title: 'Establecimientos' }} />
      <Tabs.Screen name="sync" options={{ title: 'Sincronización' }} />
    </Tabs>
  );
}

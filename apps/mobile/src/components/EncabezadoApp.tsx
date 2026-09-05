import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSesionContext } from '@/auth/SesionContext';
import { useSyncContext } from '@/db/SyncContext';
import { Colors } from '@/constants/theme';

function formatoHora(fecha: Date): string {
  const seg = Math.round((Date.now() - fecha.getTime()) / 1000);
  if (seg < 60) return 'recién';
  const min = Math.round(seg / 60);
  return `hace ${min} min`;
}

/**
 * Barra fija en la parte de arriba de todas las pestañas (headerShown de
 * <Tabs>, no un tab más): estado de sincronización + "Salir" siempre a
 * mano. Reemplaza la vieja pestaña "Sincronización" — ver `SyncContext` —
 * y evita el callejón sin salida que había cuando "Salir" vivía sólo en una
 * pestaña que podía quedar oculta por el gateo de huellaActiva/troperaActiva.
 */
export function EncabezadoApp() {
  const { cerrar } = useSesionContext();
  const { estado, ultima, error } = useSyncContext();

  let texto: string;
  if (estado === 'syncing') texto = '⟳ Sincronizando…';
  else if (estado === 'error') texto = `⚠ ${error ?? 'Error al sincronizar'}`;
  else if (ultima) texto = `✓ Sincronizado ${formatoHora(ultima)}`;
  else texto = 'Esperando conexión…';

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.fila}>
        <Text style={[styles.estado, estado === 'error' && styles.estadoError]} numberOfLines={1}>
          {texto}
        </Text>
        <Pressable onPress={cerrar} hitSlop={10}>
          <Text style={styles.salir}>Salir</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: Colors.card, borderBottomWidth: 1, borderBottomColor: Colors.border },
  fila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  estado: { fontSize: 12.5, color: Colors.muted, flexShrink: 1, marginRight: 12 },
  estadoError: { color: '#c0392b' },
  salir: { color: Colors.verdeDark, fontWeight: '600', fontSize: 13 },
});

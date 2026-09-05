import { View, Text, FlatList, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/db/database';
import { useObservedQuery } from '@/db/useQuery';
import { useSesionContext } from '@/auth/SesionContext';
import { useSyncContext } from '@/db/SyncContext';
import { Establecimiento } from '@/db/models/Establecimiento';
import { Colors, Radii, Shadows } from '@/constants/theme';
import { EmptyState } from '@/components/EmptyState';
import { Alerta } from '@/components/Alerta';

export default function EstablecimientosScreen() {
  const { sesion } = useSesionContext();
  const { estado, error, sincronizarAhora } = useSyncContext();
  const router = useRouter();

  const establecimientos = useObservedQuery(
    () =>
      database
        .get<Establecimiento>('establecimientos')
        .query(Q.where('organizacion_id', sesion?.organizacionId ?? '__none__'), Q.sortBy('nombre', Q.asc)),
    [sesion?.organizacionId],
  );

  // Hay un instante entre que `sesion` pasa a null (logout, o antes del
  // primer arranque) y que `_layout.tsx` redirige a /login, donde esta
  // pantalla igual llega a renderizar — el guard va después de todos los
  // hooks (no se pueden llamar condicionalmente).
  if (!sesion) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Establecimientos</Text>
      {error && <Alerta mensaje={error} />}
      <FlatList
        data={establecimientos}
        keyExtractor={(e) => e.id}
        refreshControl={<RefreshControl refreshing={estado === 'syncing'} onRefresh={sincronizarAhora} />}
        contentContainerStyle={establecimientos.length === 0 ? styles.emptyContainer : styles.lista}
        renderItem={({ item }) => (
          <Pressable style={styles.item} onPress={() => router.push(`/establecimiento/${item.id}`)}>
            <Text style={styles.itemTitle}>{item.nombre}</Text>
            {item.ubicacion ? <Text style={styles.itemSub}>{item.ubicacion}</Text> : null}
          </Pressable>
        )}
        ListEmptyComponent={<EmptyState mensaje="Sin establecimientos todavía. Deslizá hacia abajo para sincronizar." />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: Colors.bg },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: 14 },
  lista: { gap: 10 },
  item: {
    padding: 14,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.card,
    ...Shadows.suave,
  },
  itemTitle: { fontSize: 16, fontWeight: '600', color: Colors.text },
  itemSub: { fontSize: 13, color: Colors.muted, marginTop: 2 },
  emptyContainer: { flex: 1, justifyContent: 'center' },
});

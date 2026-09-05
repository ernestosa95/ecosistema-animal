import { View, Text, FlatList, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/db/database';
import { useObservedQuery } from '@/db/useQuery';
import { useSesionContext } from '@/auth/SesionContext';
import { sincronizar } from '@/db/sync';
import { Establecimiento } from '@/db/models/Establecimiento';
import { Colors } from '@/constants/theme';

export default function EstablecimientosScreen() {
  const { sesion, cerrar } = useSesionContext();
  const router = useRouter();
  const [sincronizando, setSincronizando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const establecimientos = useObservedQuery(
    () =>
      database
        .get<Establecimiento>('establecimientos')
        .query(Q.where('organizacion_id', sesion?.organizacionId ?? '__none__'), Q.sortBy('nombre', Q.asc)),
    [sesion?.organizacionId],
  );

  const onSync = useCallback(async () => {
    if (!sesion) return;
    setSincronizando(true);
    setError(null);
    try {
      await sincronizar(sesion);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al sincronizar');
    } finally {
      setSincronizando(false);
    }
  }, [sesion]);

  // Hay un instante entre que `sesion` pasa a null (logout, o antes del
  // primer arranque) y que `_layout.tsx` redirige a /login, donde esta
  // pantalla igual llega a renderizar — el guard va después de todos los
  // hooks (no se pueden llamar condicionalmente).
  if (!sesion) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Establecimientos</Text>
        <Pressable onPress={cerrar}>
          <Text style={styles.link}>Salir</Text>
        </Pressable>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={establecimientos}
        keyExtractor={(e) => e.id}
        refreshControl={<RefreshControl refreshing={sincronizando} onRefresh={onSync} />}
        renderItem={({ item }) => (
          <Pressable style={styles.item} onPress={() => router.push(`/establecimiento/${item.id}`)}>
            <Text style={styles.itemTitle}>{item.nombre}</Text>
            {item.ubicacion ? <Text style={styles.itemSub}>{item.ubicacion}</Text> : null}
          </Pressable>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>Sin establecimientos todavía. Deslizá hacia abajo para sincronizar.</Text>
        }
        contentContainerStyle={establecimientos.length === 0 ? styles.emptyContainer : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text },
  link: { color: Colors.verdeDark, fontWeight: '600' },
  error: { color: Colors.danger, marginBottom: 8 },
  item: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  itemTitle: { fontSize: 16, fontWeight: '600', color: Colors.text },
  itemSub: { fontSize: 13, color: Colors.muted, marginTop: 2 },
  empty: { textAlign: 'center', color: Colors.muted },
  emptyContainer: { flex: 1, justifyContent: 'center' },
});

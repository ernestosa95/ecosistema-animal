import { View, Text, FlatList, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/db/database';
import { useObservedQuery } from '@/db/useQuery';
import { useSesionContext } from '@/auth/SesionContext';
import { sincronizar } from '@/db/sync';
import { useEspecies } from '@/api/useEspecies';
import { Animal } from '@/db/models/Animal';
import { Colors } from '@/constants/theme';

export default function PacientesScreen() {
  const { sesion } = useSesionContext();
  const router = useRouter();
  const { especies } = useEspecies();
  const [sincronizando, setSincronizando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const animales = useObservedQuery(
    () =>
      database
        .get<Animal>('animales')
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

  if (!sesion) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Pacientes</Text>
        <Pressable onPress={() => router.push('/paciente/nuevo')}>
          <Text style={styles.link}>+ Nuevo</Text>
        </Pressable>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={animales}
        keyExtractor={(a) => a.id}
        refreshControl={<RefreshControl refreshing={sincronizando} onRefresh={onSync} />}
        renderItem={({ item }) => {
          const especie = especies.find((e) => e.id === item.especieId);
          return (
            <Pressable style={styles.item} onPress={() => router.push(`/paciente/${item.id}`)}>
              <Text style={styles.itemTitle}>{item.nombre}</Text>
              <Text style={styles.itemSub}>
                {especie?.nombre ?? '—'}
                {item.codigoLegible ? ` · ${item.codigoLegible}` : ''}
              </Text>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>Sin pacientes todavía. Deslizá hacia abajo para sincronizar.</Text>
        }
        contentContainerStyle={animales.length === 0 ? styles.emptyContainer : undefined}
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

import { useMemo, useState } from 'react';
import { View, Text, FlatList, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/db/database';
import { useObservedQuery } from '@/db/useQuery';
import { useSesionContext } from '@/auth/SesionContext';
import { useSyncContext } from '@/db/SyncContext';
import { useEspecies } from '@/api/useEspecies';
import { Animal } from '@/db/models/Animal';
import { puntuarMultiple } from '@/utils/fuzzy';
import { Colors, Radii, Shadows } from '@/constants/theme';
import { Field } from '@/components/Field';
import { EmptyState } from '@/components/EmptyState';

/**
 * Reemplaza a la vieja pestaña "Pacientes" — ahora se llega acá desde el
 * botón "Animales" del Home en vez de tener una pestaña propia, y suma un
 * buscador (la pestaña vieja era una lista plana sin forma de filtrar).
 */
export default function AnimalesScreen() {
  const { sesion } = useSesionContext();
  const { estado, sincronizarAhora } = useSyncContext();
  const router = useRouter();
  const { especies } = useEspecies();
  const [query, setQuery] = useState('');

  const animales = useObservedQuery(
    () =>
      database
        .get<Animal>('animales')
        .query(Q.where('organizacion_id', sesion?.organizacionId ?? '__none__'), Q.sortBy('nombre', Q.asc)),
    [sesion?.organizacionId],
  );

  const resultados = useMemo(() => {
    const q = query.trim();
    if (!q) return animales;
    return animales
      .map((a) => ({ animal: a, score: puntuarMultiple(q, [a.nombre, a.microchip, a.codigoLegible]) }))
      .filter((r) => r.score > 0)
      .sort((x, y) => y.score - x.score)
      .map((r) => r.animal);
  }, [query, animales]);

  if (!sesion) return null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.link}>‹ Volver</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/paciente/nuevo')} hitSlop={10}>
            <Text style={styles.link}>+ Nuevo</Text>
          </Pressable>
        </View>
        <Text style={styles.title}>Animales</Text>
        <Field label="Buscar" value={query} onChangeText={setQuery} placeholder="Nombre, código o microchip…" />
        <FlatList
          data={resultados}
          keyExtractor={(a) => a.id}
          refreshControl={<RefreshControl refreshing={estado === 'syncing'} onRefresh={sincronizarAhora} />}
          contentContainerStyle={resultados.length === 0 ? styles.emptyContainer : styles.lista}
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
            <EmptyState
              mensaje={query.trim() ? 'Sin resultados.' : 'Sin animales todavía. Deslizá hacia abajo para sincronizar.'}
            />
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.bg },
  container: { flex: 1, padding: 16, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  link: { color: Colors.verdeDark, fontWeight: '600' },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: 10 },
  lista: { gap: 10, paddingTop: 10 },
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

import { View, Text, FlatList, RefreshControl, StyleSheet } from 'react-native';
import { useCallback, useState } from 'react';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/db/database';
import { useObservedQuery } from '@/db/useQuery';
import { useSesionContext } from '@/auth/SesionContext';
import { sincronizar } from '@/db/sync';
import { Turno } from '@/db/models/Turno';
import { Animal } from '@/db/models/Animal';
import { Colors } from '@/constants/theme';

const ESTADO_LABEL: Record<string, string> = {
  solicitado: 'Solicitado',
  confirmado: 'Confirmado',
  reprogramado: 'Reprogramado',
  cancelado: 'Cancelado',
  atendido: 'Atendido',
  ausente: 'Ausente',
};

export default function TurnosScreen() {
  const { sesion } = useSesionContext();
  const [sincronizando, setSincronizando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const turnos = useObservedQuery(
    () =>
      database
        .get<Turno>('turnos')
        .query(Q.where('organizacion_id', sesion?.organizacionId ?? '__none__'), Q.sortBy('fecha_hora', Q.desc)),
    [sesion?.organizacionId],
  );
  const animales = useObservedQuery(
    () => database.get<Animal>('animales').query(Q.where('organizacion_id', sesion?.organizacionId ?? '__none__')),
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
      <Text style={styles.title}>Turnos</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={turnos}
        keyExtractor={(t) => t.id}
        refreshControl={<RefreshControl refreshing={sincronizando} onRefresh={onSync} />}
        renderItem={({ item }) => {
          const paciente = animales.find((a) => a.id === item.animalId);
          return (
            <View style={styles.item}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemTitle}>{paciente?.nombre ?? 'Sin paciente'}</Text>
                <Text style={styles.badge}>{ESTADO_LABEL[item.estado] ?? item.estado}</Text>
              </View>
              <Text style={styles.itemSub}>{item.fechaHora.toLocaleString()}</Text>
              {item.motivo ? <Text style={styles.itemSub}>{item.motivo}</Text> : null}
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>Sin turnos todavía. Deslizá hacia abajo para sincronizar.</Text>
        }
        contentContainerStyle={turnos.length === 0 ? styles.emptyContainer : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: Colors.bg },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  error: { color: Colors.danger, marginBottom: 8 },
  item: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemTitle: { fontSize: 16, fontWeight: '600', color: Colors.text },
  badge: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.verdeDark,
    backgroundColor: Colors.verdeClaro,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  itemSub: { fontSize: 13, color: Colors.muted, marginTop: 2 },
  empty: { textAlign: 'center', color: Colors.muted },
  emptyContainer: { flex: 1, justifyContent: 'center' },
});

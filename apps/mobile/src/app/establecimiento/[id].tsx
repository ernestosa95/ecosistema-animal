import { useState } from 'react';
import { View, Text, FlatList, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/db/database';
import { uuid } from '@/db/uuid';
import { useObservedQuery } from '@/db/useQuery';
import { useSesionContext } from '@/auth/SesionContext';
import { Existencia } from '@/db/models/Existencia';
import { Movimiento } from '@/db/models/Movimiento';
import { Establecimiento } from '@/db/models/Establecimiento';
import { Colors } from '@/constants/theme';

const CATEGORIAS = ['vaca', 'toro', 'ternero', 'ternera', 'vaquillona', 'novillo'] as const;
const TIPOS = ['nacimiento', 'compra', 'muerte', 'venta', 'traslado'] as const;

export default function EstablecimientoDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { sesion } = useSesionContext();
  const router = useRouter();

  const existencias = useObservedQuery(
    () => database.get<Existencia>('existencias').query(Q.where('establecimiento_id', id)),
    [id],
  );
  const otrosEstablecimientos = useObservedQuery(
    () =>
      database
        .get<Establecimiento>('establecimientos')
        .query(Q.where('organizacion_id', sesion?.organizacionId ?? '__none__'), Q.where('id', Q.notEq(id))),
    [id, sesion?.organizacionId],
  );

  const [tipo, setTipo] = useState<(typeof TIPOS)[number]>('compra');
  const [categoria, setCategoria] = useState<(typeof CATEGORIAS)[number]>('vaca');
  const [cantidad, setCantidad] = useState('');
  const [destinoId, setDestinoId] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  // Ver el comentario análogo en (app)/index.tsx: instante transitorio sin
  // sesión antes de que redirija a /login.
  if (!sesion) return null;

  async function agregarMovimiento() {
    if (!sesion || !id) return;
    const n = Number(cantidad);
    if (!n || n <= 0) {
      setError('Cantidad inválida');
      return;
    }
    if (tipo === 'traslado' && !destinoId) {
      setError('El traslado necesita un establecimiento de destino');
      return;
    }

    setGuardando(true);
    setError(null);
    setOk(false);
    try {
      const esAlta = tipo === 'nacimiento' || tipo === 'compra';
      const esBaja = tipo === 'muerte' || tipo === 'venta';
      await database.write(async () => {
        await database.get<Movimiento>('movimientos').create((m) => {
          m._raw.id = uuid();
          m.organizacionId = sesion.organizacionId;
          m.tipo = tipo;
          m.categoria = categoria;
          m.cantidad = n;
          m.establecimientoOrigenId = esAlta ? null : id;
          m.establecimientoDestinoId = esBaja ? null : tipo === 'traslado' ? destinoId : id;
          m.fecha = new Date().toISOString().slice(0, 10);
          m.observaciones = null;
          m.usuarioId = null;
        });
      });
      setCantidad('');
      setDestinoId(null);
      setOk(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
    <ScrollView style={styles.container}>
      <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
        <Text style={styles.link}>‹ Volver</Text>
      </Pressable>

      <Text style={styles.title}>Existencias</Text>
      <FlatList
        data={existencias}
        keyExtractor={(e) => e.id}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{item.categoria}</Text>
            <Text style={styles.rowValue}>{item.cantidad}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Sin existencias cargadas todavía.</Text>}
      />

      <Text style={styles.title}>Nuevo movimiento</Text>

      <Text style={styles.label}>Tipo</Text>
      <View style={styles.chipRow}>
        {TIPOS.map((t) => (
          <Pressable key={t} onPress={() => setTipo(t)} style={[styles.chip, tipo === t && styles.chipActivo]}>
            <Text style={[styles.chipText, tipo === t && styles.chipTextActivo]}>{t}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Categoría</Text>
      <View style={styles.chipRow}>
        {CATEGORIAS.map((c) => (
          <Pressable
            key={c}
            onPress={() => setCategoria(c)}
            style={[styles.chip, categoria === c && styles.chipActivo]}
          >
            <Text style={[styles.chipText, categoria === c && styles.chipTextActivo]}>{c}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Cantidad</Text>
      <TextInput style={styles.input} keyboardType="numeric" value={cantidad} onChangeText={setCantidad} />

      {tipo === 'traslado' && (
        <>
          <Text style={styles.label}>Establecimiento destino</Text>
          <View style={styles.chipRow}>
            {otrosEstablecimientos.map((e) => (
              <Pressable
                key={e.id}
                onPress={() => setDestinoId(e.id)}
                style={[styles.chip, destinoId === e.id && styles.chipActivo]}
              >
                <Text style={[styles.chipText, destinoId === e.id && styles.chipTextActivo]}>{e.nombre}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {error && <Text style={styles.error}>{error}</Text>}
      {ok && <Text style={styles.ok}>Guardado. Quedó pendiente hasta la próxima sincronización.</Text>}

      <Pressable style={styles.button} onPress={agregarMovimiento} disabled={guardando}>
        <Text style={styles.buttonText}>{guardando ? 'Guardando…' : 'Guardar movimiento (offline)'}</Text>
      </Pressable>
      <Text style={styles.hint}>
        Se guarda en el dispositivo. Las existencias de arriba se actualizan recién después de
        sincronizar (pestaña "Sincronización") — el ajuste de stock lo hace el servidor.
      </Text>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.bg },
  container: { flex: 1, padding: 16, backgroundColor: Colors.bg },
  backButton: { alignSelf: 'flex-start', paddingVertical: 4, paddingRight: 12 },
  link: { color: Colors.verdeDark, fontWeight: '600', marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '700', marginTop: 16, marginBottom: 8, color: Colors.text },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowLabel: { fontSize: 15, color: Colors.text },
  rowValue: { fontSize: 15, fontWeight: '600', color: Colors.text },
  empty: { color: Colors.muted },
  label: { fontSize: 13, color: Colors.text, marginTop: 10, marginBottom: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.card,
  },
  chipActivo: { backgroundColor: Colors.verde, borderColor: Colors.verde },
  chipText: { color: Colors.text, fontSize: 13 },
  chipTextActivo: { color: '#fff' },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: Colors.card,
    color: Colors.text,
  },
  error: { color: Colors.danger, marginTop: 12 },
  ok: { color: Colors.verdeDark, marginTop: 12 },
  button: {
    backgroundColor: Colors.verde,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  hint: { color: Colors.muted, fontSize: 13, marginTop: 8, marginBottom: 32 },
});

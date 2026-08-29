import { useState } from 'react';
import { View, Text, FlatList, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/db/database';
import { uuid } from '@/db/uuid';
import { useObservedQuery } from '@/db/useQuery';
import { useSesionContext } from '@/auth/SesionContext';
import { useEspecies } from '@/api/useEspecies';
import { Animal } from '@/db/models/Animal';
import { Persona } from '@/db/models/Persona';
import { Consulta } from '@/db/models/Consulta';
import { Vacunacion } from '@/db/models/Vacunacion';
import { Colors } from '@/constants/theme';

export default function PacienteDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { sesion } = useSesionContext();
  const router = useRouter();
  const { especies } = useEspecies();

  const [animal] = useObservedQuery(
    () => database.get<Animal>('animales').query(Q.where('id', id)),
    [id],
  );
  const consultas = useObservedQuery(
    () => database.get<Consulta>('consultas').query(Q.where('animal_id', id), Q.sortBy('fecha', Q.desc)),
    [id],
  );
  const vacunaciones = useObservedQuery(
    () => database.get<Vacunacion>('vacunaciones').query(Q.where('animal_id', id), Q.sortBy('fecha', Q.desc)),
    [id],
  );
  const [dueno] = useObservedQuery(
    () => database.get<Persona>('personas').query(Q.where('id', animal?.personaId ?? '__none__')),
    [animal?.personaId],
  );

  const [seccion, setSeccion] = useState<'consulta' | 'vacunacion' | null>(null);

  // Consulta
  const [motivo, setMotivo] = useState('');
  const [diagnostico, setDiagnostico] = useState('');
  const [tratamiento, setTratamiento] = useState('');
  const [pesoKg, setPesoKg] = useState('');
  const [observacionesConsulta, setObservacionesConsulta] = useState('');

  // Vacunación
  const [producto, setProducto] = useState('');
  const [loteProducto, setLoteProducto] = useState('');
  const [proximaDosis, setProximaDosis] = useState('');

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function guardarConsulta() {
    if (!sesion || !id) return;
    setGuardando(true);
    setError(null);
    setOk(false);
    try {
      await database.write(async () => {
        await database.get<Consulta>('consultas').create((c) => {
          c._raw.id = uuid();
          c.organizacionId = sesion.organizacionId;
          c.animalId = id;
          c.veterinarioId = null;
          c.fecha = new Date();
          c.motivo = motivo.trim() || null;
          c.anamnesis = null;
          c.examenFisico = null;
          c.diagnostico = diagnostico.trim() || null;
          c.tratamiento = tratamiento.trim() || null;
          c.pesoKg = pesoKg ? Number(pesoKg) : null;
          c.temperaturaC = null;
          c.observaciones = observacionesConsulta.trim() || null;
        });
      });
      setMotivo('');
      setDiagnostico('');
      setTratamiento('');
      setPesoKg('');
      setObservacionesConsulta('');
      setOk(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  async function guardarVacunacion() {
    if (!sesion || !id) return;
    if (!producto.trim()) {
      setError('El producto es obligatorio');
      return;
    }
    setGuardando(true);
    setError(null);
    setOk(false);
    try {
      await database.write(async () => {
        await database.get<Vacunacion>('vacunaciones').create((v) => {
          v._raw.id = uuid();
          v.organizacionId = sesion.organizacionId;
          v.animalId = id;
          v.veterinarioId = null;
          v.producto = producto.trim();
          v.vademecumId = null;
          v.fecha = new Date().toISOString().slice(0, 10);
          v.proximaDosis = proximaDosis.trim() || null;
          v.loteProducto = loteProducto.trim() || null;
        });
      });
      setProducto('');
      setLoteProducto('');
      setProximaDosis('');
      setOk(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  if (!animal) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.container}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
            <Text style={styles.link}>‹ Volver</Text>
          </Pressable>
          <Text style={styles.empty}>Cargando…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const especie = especies.find((e) => e.id === animal.especieId);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
          <Text style={styles.link}>‹ Volver</Text>
        </Pressable>

        <Text style={styles.title}>{animal.nombre}</Text>
        <Text style={styles.sub}>
          {especie?.nombre ?? '—'}
          {animal.codigoLegible ? ` · ${animal.codigoLegible}` : ' · sin código legible (pendiente de sincronizar)'}
        </Text>
        {dueno && (
          <Text style={styles.sub}>
            Dueño: {dueno.nombre} {dueno.apellido}
          </Text>
        )}

        <Text style={styles.sectionTitle}>Consultas</Text>
        <FlatList
          data={consultas}
          keyExtractor={(c) => c.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.rowTitle}>{item.fecha.toLocaleDateString()}</Text>
              {item.motivo ? <Text style={styles.rowSub}>{item.motivo}</Text> : null}
              {item.diagnostico ? <Text style={styles.rowSub}>Dx: {item.diagnostico}</Text> : null}
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>Sin consultas cargadas todavía.</Text>}
        />
        <Pressable
          style={styles.linkButton}
          onPress={() => {
            setSeccion(seccion === 'consulta' ? null : 'consulta');
            setError(null);
            setOk(false);
          }}
        >
          <Text style={styles.link}>{seccion === 'consulta' ? '‹ Cancelar' : '+ Nueva consulta'}</Text>
        </Pressable>

        {seccion === 'consulta' && (
          <View>
            <Text style={styles.label}>Motivo</Text>
            <TextInput style={styles.input} value={motivo} onChangeText={setMotivo} />
            <Text style={styles.label}>Diagnóstico</Text>
            <TextInput style={styles.input} value={diagnostico} onChangeText={setDiagnostico} />
            <Text style={styles.label}>Tratamiento</Text>
            <TextInput style={styles.input} value={tratamiento} onChangeText={setTratamiento} />
            <Text style={styles.label}>Peso (kg)</Text>
            <TextInput style={styles.input} value={pesoKg} onChangeText={setPesoKg} keyboardType="numeric" />
            <Text style={styles.label}>Observaciones</Text>
            <TextInput style={styles.input} value={observacionesConsulta} onChangeText={setObservacionesConsulta} />
            <Pressable style={styles.button} onPress={guardarConsulta} disabled={guardando}>
              <Text style={styles.buttonText}>{guardando ? 'Guardando…' : 'Guardar consulta (offline)'}</Text>
            </Pressable>
          </View>
        )}

        <Text style={styles.sectionTitle}>Vacunaciones</Text>
        <FlatList
          data={vacunaciones}
          keyExtractor={(v) => v.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.rowTitle}>{item.producto ?? 'Sin producto'}</Text>
              <Text style={styles.rowSub}>
                {item.fecha}
                {item.proximaDosis ? ` · próxima dosis: ${item.proximaDosis}` : ''}
              </Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>Sin vacunaciones cargadas todavía.</Text>}
        />
        <Pressable
          style={styles.linkButton}
          onPress={() => {
            setSeccion(seccion === 'vacunacion' ? null : 'vacunacion');
            setError(null);
            setOk(false);
          }}
        >
          <Text style={styles.link}>{seccion === 'vacunacion' ? '‹ Cancelar' : '+ Nueva vacunación'}</Text>
        </Pressable>

        {seccion === 'vacunacion' && (
          <View>
            <Text style={styles.label}>Producto</Text>
            <TextInput style={styles.input} value={producto} onChangeText={setProducto} />
            <Text style={styles.label}>Lote (opcional)</Text>
            <TextInput style={styles.input} value={loteProducto} onChangeText={setLoteProducto} />
            <Text style={styles.label}>Próxima dosis (opcional, AAAA-MM-DD)</Text>
            <TextInput style={styles.input} value={proximaDosis} onChangeText={setProximaDosis} />
            <Pressable style={styles.button} onPress={guardarVacunacion} disabled={guardando}>
              <Text style={styles.buttonText}>{guardando ? 'Guardando…' : 'Guardar vacunación (offline)'}</Text>
            </Pressable>
          </View>
        )}

        {error && <Text style={styles.error}>{error}</Text>}
        {ok && <Text style={styles.ok}>Guardado. Quedó pendiente hasta la próxima sincronización.</Text>}

        <Text style={styles.hint}>
          Las altas se guardan en el dispositivo — usá la pestaña "Sincronización" para enviarlas
          al servidor.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.bg },
  container: { flex: 1, padding: 16, backgroundColor: Colors.bg },
  backButton: { alignSelf: 'flex-start', paddingVertical: 4, paddingRight: 12 },
  link: { color: Colors.verdeDark, fontWeight: '600' },
  linkButton: { paddingVertical: 8 },
  title: { fontSize: 20, fontWeight: '700', color: Colors.text, marginTop: 8 },
  sub: { fontSize: 14, color: Colors.muted, marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginTop: 20, marginBottom: 6 },
  row: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowTitle: { fontSize: 14, fontWeight: '600', color: Colors.text },
  rowSub: { fontSize: 13, color: Colors.muted, marginTop: 1 },
  empty: { color: Colors.muted, paddingVertical: 8 },
  label: { fontSize: 13, color: Colors.text, marginTop: 10, marginBottom: 4 },
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
    marginTop: 12,
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  hint: { color: Colors.muted, fontSize: 13, marginTop: 20, marginBottom: 32 },
});

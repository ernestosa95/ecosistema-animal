import { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/db/database';
import { uuid } from '@/db/uuid';
import { useObservedQuery } from '@/db/useQuery';
import { useSesionContext } from '@/auth/SesionContext';
import { useEspecies } from '@/api/useEspecies';
import { Persona } from '@/db/models/Persona';
import { Animal } from '@/db/models/Animal';
import { Colors } from '@/constants/theme';

const SEXOS = [
  { value: '', label: 'Sin especificar' },
  { value: 'macho', label: 'Macho' },
  { value: 'hembra', label: 'Hembra' },
  { value: 'indefinido', label: 'Indefinido' },
] as const;

const NUEVO_DUENO = '__nuevo__';

export default function NuevoPacienteScreen() {
  const { sesion } = useSesionContext();
  const router = useRouter();
  const { especies } = useEspecies();

  const personas = useObservedQuery(
    () =>
      database
        .get<Persona>('personas')
        .query(Q.where('organizacion_id', sesion?.organizacionId ?? '__none__'), Q.sortBy('nombre', Q.asc)),
    [sesion?.organizacionId],
  );

  const [nombre, setNombre] = useState('');
  const [especieId, setEspecieId] = useState<string | null>(null);
  const [sexo, setSexo] = useState<(typeof SEXOS)[number]['value']>('');
  const [microchip, setMicrochip] = useState('');
  const [duenoId, setDuenoId] = useState<string | null>(null);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoApellido, setNuevoApellido] = useState('');
  const [nuevoCelular, setNuevoCelular] = useState('');
  const [nuevoDni, setNuevoDni] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    if (!sesion) return;
    if (!nombre.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    if (!especieId) {
      setError('Elegí una especie');
      return;
    }
    if (duenoId === NUEVO_DUENO && (!nuevoNombre.trim() || !nuevoApellido.trim())) {
      setError('El dueño nuevo necesita nombre y apellido');
      return;
    }

    setGuardando(true);
    setError(null);
    try {
      let personaId: string | null = duenoId;
      await database.write(async () => {
        if (duenoId === NUEVO_DUENO) {
          const persona = await database.get<Persona>('personas').create((p) => {
            p._raw.id = uuid();
            p.organizacionId = sesion.organizacionId;
            p.nombre = nuevoNombre.trim();
            p.apellido = nuevoApellido.trim();
            p.celular = nuevoCelular.trim() || null;
            p.dni = nuevoDni.trim() || null;
            p.sexo = null;
            p.fechaNacimiento = null;
            p.telefono = null;
            p.email = null;
          });
          personaId = persona.id;
        }

        const animal = await database.get<Animal>('animales').create((a) => {
          a._raw.id = uuid();
          a.organizacionId = sesion.organizacionId;
          a.especieId = especieId;
          a.personaId = personaId;
          a.nombre = nombre.trim();
          a.sexo = sexo || null;
          a.fechaNacimiento = null;
          a.fechaNacEstimada = false;
          a.fotoUrl = null;
          a.microchip = microchip.trim() || null;
          a.codigoLegible = null;
          a.estado = 'activo';
          a.datosEspecificos = '{}';
        });
        router.replace(`/paciente/${animal.id}`);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
      setGuardando(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
          <Text style={styles.link}>‹ Volver</Text>
        </Pressable>
        <Text style={styles.title}>Nuevo paciente</Text>

        <Text style={styles.label}>Nombre</Text>
        <TextInput style={styles.input} value={nombre} onChangeText={setNombre} />

        <Text style={styles.label}>Especie</Text>
        <View style={styles.chipRow}>
          {especies.map((e) => (
            <Pressable
              key={e.id}
              onPress={() => setEspecieId(e.id)}
              style={[styles.chip, especieId === e.id && styles.chipActivo]}
            >
              <Text style={[styles.chipText, especieId === e.id && styles.chipTextActivo]}>{e.nombre}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Sexo</Text>
        <View style={styles.chipRow}>
          {SEXOS.map((s) => (
            <Pressable
              key={s.value}
              onPress={() => setSexo(s.value)}
              style={[styles.chip, sexo === s.value && styles.chipActivo]}
            >
              <Text style={[styles.chipText, sexo === s.value && styles.chipTextActivo]}>{s.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Microchip (opcional, 15 dígitos ISO)</Text>
        <TextInput
          style={styles.input}
          value={microchip}
          onChangeText={setMicrochip}
          keyboardType="numeric"
          maxLength={15}
        />

        <Text style={styles.label}>Dueño (opcional)</Text>
        <View style={styles.chipRow}>
          {personas.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => setDuenoId(duenoId === p.id ? null : p.id)}
              style={[styles.chip, duenoId === p.id && styles.chipActivo]}
            >
              <Text style={[styles.chipText, duenoId === p.id && styles.chipTextActivo]}>
                {p.nombre} {p.apellido}
              </Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => setDuenoId(duenoId === NUEVO_DUENO ? null : NUEVO_DUENO)}
            style={[styles.chip, duenoId === NUEVO_DUENO && styles.chipActivo]}
          >
            <Text style={[styles.chipText, duenoId === NUEVO_DUENO && styles.chipTextActivo]}>
              ＋ Nuevo dueño
            </Text>
          </Pressable>
        </View>

        {duenoId === NUEVO_DUENO && (
          <View>
            <Text style={styles.label}>Nombre del dueño</Text>
            <TextInput style={styles.input} value={nuevoNombre} onChangeText={setNuevoNombre} />
            <Text style={styles.label}>Apellido del dueño</Text>
            <TextInput style={styles.input} value={nuevoApellido} onChangeText={setNuevoApellido} />
            <Text style={styles.label}>Celular (opcional)</Text>
            <TextInput style={styles.input} value={nuevoCelular} onChangeText={setNuevoCelular} keyboardType="phone-pad" />
            <Text style={styles.label}>DNI (opcional)</Text>
            <TextInput style={styles.input} value={nuevoDni} onChangeText={setNuevoDni} keyboardType="numeric" />
          </View>
        )}

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable style={styles.button} onPress={guardar} disabled={guardando}>
          <Text style={styles.buttonText}>{guardando ? 'Guardando…' : 'Guardar paciente (offline)'}</Text>
        </Pressable>
        <Text style={styles.hint}>
          Se guarda en el dispositivo. El código legible lo asigna el servidor recién al
          sincronizar (pestaña "Sincronización").
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
  title: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 12 },
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
  error: { color: Colors.danger, marginTop: 12 },
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

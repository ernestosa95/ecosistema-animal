import { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/db/database';
import { useObservedQuery } from '@/db/useQuery';
import { useSesionContext } from '@/auth/SesionContext';
import { useEspecies } from '@/api/useEspecies';
import { Persona } from '@/db/models/Persona';
import { altaPacienteOffline } from '@/db/altaPaciente';
import { SelectorDueno, type DuenoElegido } from '@/components/SelectorDueno';
import { Colors, Radii } from '@/constants/theme';
import { Field } from '@/components/Field';
import { Button } from '@/components/Button';
import { Alerta } from '@/components/Alerta';

const SEXOS = [
  { value: '', label: 'Sin especificar' },
  { value: 'macho', label: 'Macho' },
  { value: 'hembra', label: 'Hembra' },
  { value: 'indefinido', label: 'Indefinido' },
] as const;

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
  const [dueno, setDueno] = useState<DuenoElegido | null>(null);
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
    if (!dueno) {
      setError('El dueño es obligatorio');
      return;
    }

    setGuardando(true);
    setError(null);
    try {
      const animalId = await altaPacienteOffline(sesion, {
        nombre,
        especieId,
        sexo,
        microchip,
        duenoId: dueno.duenoId,
        duenoNuevo: dueno.duenoNuevo,
      });
      router.replace(`/paciente/${animalId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
      setGuardando(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView style={styles.container}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
          <Text style={styles.link}>‹ Volver</Text>
        </Pressable>
        <Text style={styles.title}>Nuevo paciente</Text>

        <Field label="Nombre" value={nombre} onChangeText={setNombre} />

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

        <Field
          label="Microchip (opcional, 15 dígitos ISO)"
          value={microchip}
          onChangeText={setMicrochip}
          keyboardType="numeric"
          maxLength={15}
        />

        <Text style={styles.label}>Dueño</Text>
        <SelectorDueno personas={personas} value={dueno} onChange={setDueno} />

        {error && <Alerta mensaje={error} />}

        <View style={styles.boton}>
          <Button
            title={guardando ? 'Guardando…' : 'Guardar paciente'}
            onPress={guardar}
            disabled={guardando}
          />
        </View>
        <Text style={styles.hint}>El código legible puede tardar un momento en aparecer.</Text>
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
  label: { fontSize: 13, color: Colors.text, marginTop: 10, marginBottom: 4, fontWeight: '500' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.card,
  },
  chipActivo: { backgroundColor: Colors.verde, borderColor: Colors.verde },
  chipText: { color: Colors.text, fontSize: 13 },
  chipTextActivo: { color: '#fff' },
  boton: { marginTop: 16 },
  hint: { color: Colors.muted, fontSize: 13, marginTop: 10, marginBottom: 32 },
});

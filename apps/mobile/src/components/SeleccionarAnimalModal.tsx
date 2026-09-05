import { useMemo, useState } from 'react';
import { Modal, View, Text, FlatList, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/db/database';
import { useObservedQuery } from '@/db/useQuery';
import { useSesionContext } from '@/auth/SesionContext';
import { useEspecies } from '@/api/useEspecies';
import { Animal } from '@/db/models/Animal';
import { Persona } from '@/db/models/Persona';
import { altaPacienteOffline } from '@/db/altaPaciente';
import { SelectorDueno, type DuenoElegido } from './SelectorDueno';
import { puntuarMultiple } from '@/utils/fuzzy';
import { Colors, Radii, Shadows } from '@/constants/theme';
import { Field } from './Field';
import { Button } from './Button';
import { Alerta } from './Alerta';
import { EmptyState } from './EmptyState';

/**
 * Equivalente offline de apps/web/src/components/SeleccionarAnimalModal.tsx:
 * buscar entre los pacientes ya sincronizados en este dispositivo o darlo de
 * alta ahí mismo (reusa `altaPacienteOffline`, misma lógica que
 * `paciente/nuevo.tsx`) — sin salir del modal, para los accesos rápidos del
 * Home (Nueva consulta / Registro de vacuna / Nuevo turno).
 */
export function SeleccionarAnimalModal({
  titulo,
  subtitulo,
  onCancelar,
  onSeleccionar,
}: {
  titulo: string;
  subtitulo?: string;
  onCancelar: () => void;
  onSeleccionar: (animalId: string) => void;
}) {
  const { sesion } = useSesionContext();
  const { especies } = useEspecies();

  const animales = useObservedQuery(
    () =>
      database
        .get<Animal>('animales')
        .query(Q.where('organizacion_id', sesion?.organizacionId ?? '__none__'), Q.sortBy('nombre', Q.asc)),
    [sesion?.organizacionId],
  );
  const personas = useObservedQuery(
    () =>
      database
        .get<Persona>('personas')
        .query(Q.where('organizacion_id', sesion?.organizacionId ?? '__none__'), Q.sortBy('nombre', Q.asc)),
    [sesion?.organizacionId],
  );
  const personaPorId = useMemo(() => new Map(personas.map((p) => [p.id, p])), [personas]);

  const [query, setQuery] = useState('');
  const [modoCrear, setModoCrear] = useState(false);

  const resultados = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return animales
      .map((a) => ({ animal: a, score: puntuarMultiple(q, [a.nombre, a.microchip, a.codigoLegible]) }))
      .filter((r) => r.score > 0)
      .sort((x, y) => y.score - x.score)
      .slice(0, 8);
  }, [query, animales]);

  const [nombre, setNombre] = useState('');
  const [especieId, setEspecieId] = useState('');
  const [dueno, setDueno] = useState<DuenoElegido | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  function abrirCrear() {
    setNombre(query.trim());
    setError(null);
    setModoCrear(true);
  }

  async function crear() {
    setError(null);
    if (!nombre.trim() || !especieId) {
      setError('Nombre y especie son obligatorios');
      return;
    }
    if (!dueno) {
      setError('El dueño es obligatorio');
      return;
    }
    if (!sesion) return;
    setGuardando(true);
    try {
      const animalId = await altaPacienteOffline(sesion, {
        nombre,
        especieId,
        duenoId: dueno.duenoId,
        duenoNuevo: dueno.duenoNuevo,
      });
      onSeleccionar(animalId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear el paciente');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal visible animationType="slide" onRequestClose={onCancelar}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={styles.titulo}>{titulo}</Text>
          <Pressable onPress={onCancelar} hitSlop={10}>
            <Text style={styles.cerrar}>Cerrar ✕</Text>
          </Pressable>
        </View>
        {subtitulo && <Text style={styles.subtitulo}>{subtitulo}</Text>}

        {modoCrear ? (
          <ScrollView style={styles.contenido}>
            <Field label="Nombre del paciente" value={nombre} onChangeText={setNombre} />
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

            <Text style={styles.label}>Dueño</Text>
            <SelectorDueno personas={personas} value={dueno} onChange={setDueno} />

            {error && <Alerta mensaje={error} />}
            <View style={styles.accionesCrear}>
              <View style={styles.accionesCrearItem}>
                <Button title="Volver a buscar" variant="ghost" onPress={() => setModoCrear(false)} disabled={guardando} />
              </View>
              <View style={styles.accionesCrearItem}>
                <Button title={guardando ? 'Creando…' : 'Crear y continuar'} onPress={crear} disabled={guardando} />
              </View>
            </View>
          </ScrollView>
        ) : (
          <View style={styles.contenido}>
            <Field
              label="Buscar paciente"
              autoFocus
              value={query}
              onChangeText={setQuery}
              placeholder="Nombre, código o microchip…"
            />
            {query.trim() && resultados.length === 0 && <EmptyState mensaje="Sin resultados." />}
            <FlatList
              data={resultados}
              keyExtractor={({ animal }) => animal.id}
              style={styles.lista}
              renderItem={({ item: { animal } }) => (
                <Pressable style={styles.resultado} onPress={() => onSeleccionar(animal.id)}>
                  <Text style={styles.resultadoNombre}>{animal.nombre}</Text>
                  <Text style={styles.resultadoSub}>
                    {animal.personaId && personaPorId.get(animal.personaId)
                      ? `Dueño: ${personaPorId.get(animal.personaId)!.nombre} ${personaPorId.get(animal.personaId)!.apellido}`
                      : animal.codigoLegible ?? '—'}
                  </Text>
                </Pressable>
              )}
            />
            <Pressable style={styles.linkCrear} onPress={abrirCrear}>
              <Text style={styles.cerrar}>＋ No aparece: crear paciente nuevo</Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  titulo: { fontSize: 18, fontWeight: '700', color: Colors.text, flexShrink: 1 },
  cerrar: { color: Colors.verdeDark, fontWeight: '600' },
  subtitulo: { color: Colors.muted, fontSize: 13, paddingHorizontal: 16 },
  contenido: { flex: 1, padding: 16 },
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
  // flex:1 es lo que hace que el link "crear paciente nuevo" (debajo de la
  // lista) quede siempre visible y alcanzable en vez de empujado fuera de
  // la pantalla — sin esto, con el teclado abierto (el buscador tiene
  // autoFocus) la lista podía ocupar todo el espacio visible restante.
  lista: { flex: 1, marginTop: 8 },
  resultado: {
    padding: 12,
    marginBottom: 8,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.card,
    ...Shadows.suave,
  },
  resultadoNombre: { fontSize: 15, fontWeight: '600', color: Colors.text },
  resultadoSub: { fontSize: 13, color: Colors.muted, marginTop: 2 },
  linkCrear: { marginTop: 12, paddingVertical: 8 },
  accionesCrear: { flexDirection: 'row', gap: 10, marginTop: 16, marginBottom: 32 },
  accionesCrearItem: { flex: 1 },
});

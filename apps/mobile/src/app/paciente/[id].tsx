import { useState } from 'react';
import { View, Text, FlatList, Pressable, ScrollView, StyleSheet } from 'react-native';
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
import { Field } from '@/components/Field';
import { Button } from '@/components/Button';
import { Alerta } from '@/components/Alerta';
import { EmptyState } from '@/components/EmptyState';
import { Card } from '@/components/Card';
import { FotoAnimal } from '@/components/FotoAnimal';
import { BuscadorCatalogoVacunas } from '@/components/BuscadorCatalogoVacunas';
import { BuscadorCatalogoDiagnosticos } from '@/components/BuscadorCatalogoDiagnosticos';
import { CampoColapsable } from '@/components/CampoColapsable';
import { CampoFecha } from '@/components/CampoFecha';
import { api } from '@/api/client';
import { tieneAlguno, ROLES_CLINICO } from '@/nav/roles';

// `seccion` (?seccion=consulta|vacunacion) llega desde los accesos rápidos
// del Home ("Nueva consulta"/"Registro de vacuna" en (app)/home.tsx vía
// SeleccionarAnimalModal) para abrir la sección correspondiente sin que el
// veterinario tenga que buscarla — mismo espíritu que la web, donde
// `onAbrirPaciente(animal, { abrirConsulta: true })` hace lo mismo.
type SeccionParam = 'consulta' | 'vacunacion';

export default function PacienteDetalleScreen() {
  const { id, seccion: seccionInicial } = useLocalSearchParams<{ id: string; seccion?: SeccionParam }>();
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

  const [seccion, setSeccion] = useState<SeccionParam | null>(
    seccionInicial === 'consulta' || seccionInicial === 'vacunacion' ? seccionInicial : null,
  );

  // Mismos roles que exige el backend en consultas/vacunaciones (`propietario`/
  // `admin`/`veterinario`) — sin esto, un rol sin acceso clínico (ej.
  // recepción) llegaba igual a esta pantalla desde la pestaña Turnos y veía
  // los botones de alta, que el servidor le iba a rechazar con 403.
  const puedeClinico = tieneAlguno(sesion?.roles, ROLES_CLINICO);

  // Consulta
  const [motivo, setMotivo] = useState('');
  const [diagnostico, setDiagnostico] = useState('');
  const [tratamiento, setTratamiento] = useState('');
  const [pesoKg, setPesoKg] = useState('');
  const [observacionesConsulta, setObservacionesConsulta] = useState('');
  const [costo, setCosto] = useState('0');

  // Vacunación
  const [producto, setProducto] = useState('');
  const [loteProducto, setLoteProducto] = useState('');
  const [proximaDosis, setProximaDosis] = useState('');
  const [costoVacuna, setCostoVacuna] = useState('0');

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
          c.costo = costo.trim() ? Number(costo) : 0;
        });
      });
      api.registrarEvento(sesion, 'accion', 'consulta-crear');
      setMotivo('');
      setDiagnostico('');
      setTratamiento('');
      setPesoKg('');
      setObservacionesConsulta('');
      setCosto('0');
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
          v.costo = costoVacuna.trim() ? Number(costoVacuna) : 0;
        });
      });
      api.registrarEvento(sesion, 'accion', 'vacunacion-crear');
      setProducto('');
      setLoteProducto('');
      setProximaDosis('');
      setCostoVacuna('0');
      setOk(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  if (!animal) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.container}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
            <Text style={styles.link}>‹ Volver</Text>
          </Pressable>
          <EmptyState mensaje="Cargando…" />
        </View>
      </SafeAreaView>
    );
  }

  const especie = especies.find((e) => e.id === animal.especieId);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
          <Text style={styles.link}>‹ Volver</Text>
        </Pressable>

        <FotoAnimal animal={animal} />

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

        {seccion !== 'vacunacion' && (
          <>
            <Text style={styles.sectionTitle}>Consultas</Text>
            <Card>
              <FlatList
                data={consultas}
                keyExtractor={(c) => c.id}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <View style={styles.row}>
                    <Text style={styles.rowTitle}>{item.fecha.toLocaleDateString()}</Text>
                    {item.motivo ? <Text style={styles.rowSub}>{item.motivo}</Text> : null}
                    {item.diagnostico ? <Text style={styles.rowSub}>Dx: {item.diagnostico}</Text> : null}
                    <Text style={styles.rowSub}>${item.costo ?? 0}</Text>
                  </View>
                )}
                ListEmptyComponent={<EmptyState mensaje="Sin consultas cargadas todavía." />}
              />
            </Card>
            {puedeClinico && (
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
            )}

            {puedeClinico && seccion === 'consulta' && (
              <View>
                <CampoColapsable label="Motivo" valor={motivo} abiertoInicial>
                  <Field label="" value={motivo} onChangeText={setMotivo} />
                </CampoColapsable>
                <CampoColapsable label="Diagnóstico" valor={diagnostico}>
                  <BuscadorCatalogoDiagnosticos
                    label=""
                    especieId={animal.especieId}
                    valor={diagnostico}
                    onCambiar={setDiagnostico}
                    placeholder="Buscar en el catálogo común o escribir uno nuevo…"
                  />
                </CampoColapsable>
                <CampoColapsable label="Tratamiento" valor={tratamiento}>
                  <Field label="" value={tratamiento} onChangeText={setTratamiento} />
                </CampoColapsable>
                <CampoColapsable label="Peso (kg)" valor={pesoKg}>
                  <Field label="" value={pesoKg} onChangeText={setPesoKg} keyboardType="numeric" />
                </CampoColapsable>
                <CampoColapsable label="Observaciones" valor={observacionesConsulta}>
                  <Field label="" value={observacionesConsulta} onChangeText={setObservacionesConsulta} />
                </CampoColapsable>
                <CampoColapsable label="Monto cobrado" valor={costo}>
                  <Field label="" value={costo} onChangeText={setCosto} keyboardType="numeric" />
                </CampoColapsable>
                <View style={styles.boton}>
                  <Button
                    title={guardando ? 'Guardando…' : 'Guardar consulta'}
                    onPress={guardarConsulta}
                    disabled={guardando}
                  />
                </View>
              </View>
            )}
          </>
        )}

        {seccion !== 'consulta' && (
          <>
            <Text style={styles.sectionTitle}>Vacunaciones</Text>
            <Card>
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
                    <Text style={styles.rowSub}>${item.costo ?? 0}</Text>
                  </View>
                )}
                ListEmptyComponent={<EmptyState mensaje="Sin vacunaciones cargadas todavía." />}
              />
            </Card>
            {puedeClinico && (
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
            )}

            {puedeClinico && seccion === 'vacunacion' && (
              <View>
                <BuscadorCatalogoVacunas
                  especieId={animal.especieId}
                  valor={producto}
                  onCambiar={setProducto}
                  placeholder="Buscar en el catálogo común o escribir uno nuevo…"
                />
                <Field label="Lote (opcional)" value={loteProducto} onChangeText={setLoteProducto} />
                <CampoFecha label="Próxima dosis (opcional)" value={proximaDosis} onCambiar={setProximaDosis} />
                <Field label="Costo" value={costoVacuna} onChangeText={setCostoVacuna} keyboardType="numeric" />
                <View style={styles.boton}>
                  <Button
                    title={guardando ? 'Guardando…' : 'Guardar vacunación'}
                    onPress={guardarVacunacion}
                    disabled={guardando}
                  />
                </View>
              </View>
            )}
          </>
        )}

        {error && <Alerta mensaje={error} />}
        {ok && <Text style={styles.ok}>Guardado ✓</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.bg },
  container: { flex: 1, padding: 16, backgroundColor: Colors.bg },
  scrollContent: { paddingBottom: 48 },
  backButton: { alignSelf: 'flex-start', paddingVertical: 4, paddingRight: 12 },
  link: { color: Colors.verdeDark, fontWeight: '600' },
  linkButton: { paddingVertical: 10 },
  title: { fontSize: 20, fontWeight: '700', color: Colors.text, marginTop: 8 },
  sub: { fontSize: 14, color: Colors.muted, marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginTop: 20, marginBottom: 8 },
  row: {
    paddingVertical: 8,
  },
  rowTitle: { fontSize: 14, fontWeight: '600', color: Colors.text },
  rowSub: { fontSize: 13, color: Colors.muted, marginTop: 1 },
  boton: { marginTop: 12 },
  ok: { color: Colors.verdeDark, marginTop: 12 },
  hint: { color: Colors.muted, fontSize: 13, marginTop: 20, marginBottom: 32 },
});

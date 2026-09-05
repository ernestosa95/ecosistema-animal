import { View, Text, FlatList, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/db/database';
import { useObservedQuery } from '@/db/useQuery';
import { useSesionContext } from '@/auth/SesionContext';
import { useSyncContext } from '@/db/SyncContext';
import { tieneAlguno, ROLES_ATIENDEN } from '@/nav/roles';
import { Turno } from '@/db/models/Turno';
import { Animal } from '@/db/models/Animal';
import { Colors, Radii, Shadows } from '@/constants/theme';
import { EmptyState } from '@/components/EmptyState';
import { Alerta } from '@/components/Alerta';
import { Chip } from '@/components/Chip';
import { NuevoTurnoRapido } from '@/components/NuevoTurnoRapido';
import { api } from '@/api/client';

const ESTADO_LABEL: Record<string, string> = {
  solicitado: 'Solicitado',
  confirmado: 'Confirmado',
  reprogramado: 'Reprogramado',
  cancelado: 'Cancelado',
  atendido: 'Atendido',
  ausente: 'Ausente',
};

const ESTADO_TONO: Record<string, 'neutro' | 'verde' | 'advertencia' | 'peligro'> = {
  solicitado: 'advertencia',
  confirmado: 'verde',
  reprogramado: 'advertencia',
  cancelado: 'peligro',
  atendido: 'neutro',
  ausente: 'peligro',
};

const ESTADOS_ATENDIBLES = new Set(['confirmado', 'reprogramado']);

type FiltroTiempo = 'hoy' | 'proximos' | 'todos';

function inicioDeHoy(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function TurnosScreen() {
  const { sesion } = useSesionContext();
  const { estado: estadoSync, error, sincronizarAhora } = useSyncContext();
  const router = useRouter();
  const [creando, setCreando] = useState(false);
  const [filtro, setFiltro] = useState<FiltroTiempo>('hoy');
  const [atendiendoId, setAtendiendoId] = useState<string | null>(null);

  const puedeAtender = tieneAlguno(sesion?.roles, ROLES_ATIENDEN);

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

  const turnosFiltrados = useMemo(() => {
    if (filtro === 'todos') return turnos;
    const hoy = inicioDeHoy();
    if (filtro === 'hoy') {
      const manana = new Date(hoy);
      manana.setDate(manana.getDate() + 1);
      return turnos.filter((t) => t.fechaHora >= hoy && t.fechaHora < manana);
    }
    // 'proximos': de ahora en adelante (incluye lo que queda de hoy).
    const ahora = new Date();
    return turnos.filter((t) => t.fechaHora >= ahora);
  }, [turnos, filtro]);

  async function atender(t: Turno, animalId: string | null) {
    setAtendiendoId(t.id);
    try {
      await database.write(async () => {
        await t.update((registro) => {
          registro.estado = 'atendido';
        });
      });
      if (sesion) api.registrarEvento(sesion, 'accion', 'turno-atender');
      if (animalId) router.push(`/paciente/${animalId}?seccion=consulta`);
    } finally {
      setAtendiendoId(null);
    }
  }

  if (!sesion) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Turnos</Text>
        <Pressable onPress={() => setCreando(true)} hitSlop={10}>
          <Text style={styles.link}>+ Nuevo</Text>
        </Pressable>
      </View>

      <View style={styles.filtros}>
        {(
          [
            ['hoy', 'Hoy'],
            ['proximos', 'Próximos'],
            ['todos', 'Todos'],
          ] as const
        ).map(([valor, etiqueta]) => (
          <Pressable
            key={valor}
            onPress={() => setFiltro(valor)}
            style={[styles.filtroChip, filtro === valor && styles.filtroChipActivo]}
          >
            <Text style={[styles.filtroTexto, filtro === valor && styles.filtroTextoActivo]}>{etiqueta}</Text>
          </Pressable>
        ))}
      </View>

      {error && <Alerta mensaje={error} />}
      {creando && (
        <NuevoTurnoRapido
          onCancelar={() => setCreando(false)}
          onCreado={() => {
            if (sesion) api.registrarEvento(sesion, 'accion', 'turno-crear');
            setCreando(false);
          }}
        />
      )}
      <FlatList
        data={turnosFiltrados}
        keyExtractor={(t) => t.id}
        refreshControl={<RefreshControl refreshing={estadoSync === 'syncing'} onRefresh={sincronizarAhora} />}
        contentContainerStyle={turnosFiltrados.length === 0 ? styles.emptyContainer : styles.lista}
        renderItem={({ item }) => {
          const paciente = animales.find((a) => a.id === item.animalId);
          return (
            <View style={styles.item}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemTitle}>{paciente?.nombre ?? 'Sin paciente'}</Text>
                <Chip label={ESTADO_LABEL[item.estado] ?? item.estado} tono={ESTADO_TONO[item.estado] ?? 'neutro'} />
              </View>
              <Text style={styles.itemSub}>{item.fechaHora.toLocaleString()}</Text>
              {item.motivo ? <Text style={styles.itemSub}>{item.motivo}</Text> : null}
              {puedeAtender && ESTADOS_ATENDIBLES.has(item.estado) && (
                <Pressable
                  style={styles.atenderBtn}
                  onPress={() => atender(item, item.animalId)}
                  disabled={atendiendoId === item.id}
                >
                  <Text style={styles.atenderTexto}>
                    {atendiendoId === item.id ? 'Abriendo…' : 'Atender'}
                  </Text>
                </Pressable>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            mensaje={
              filtro === 'todos'
                ? 'Sin turnos todavía.'
                : filtro === 'hoy'
                  ? 'Sin turnos para hoy.'
                  : 'Sin turnos próximos.'
            }
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text },
  link: { color: Colors.verdeDark, fontWeight: '600' },
  filtros: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  filtroChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: Colors.card,
  },
  filtroChipActivo: { backgroundColor: Colors.verde, borderColor: Colors.verde },
  filtroTexto: { color: Colors.text, fontSize: 13, fontWeight: '600' },
  filtroTextoActivo: { color: '#fff' },
  lista: { gap: 10 },
  item: {
    padding: 14,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.card,
    ...Shadows.suave,
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemTitle: { fontSize: 16, fontWeight: '600', color: Colors.text },
  itemSub: { fontSize: 13, color: Colors.muted, marginTop: 2 },
  emptyContainer: { flex: 1, justifyContent: 'center' },
  atenderBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: Colors.verde,
    borderRadius: Radii.btn,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  atenderTexto: { color: '#fff', fontWeight: '600', fontSize: 13 },
});

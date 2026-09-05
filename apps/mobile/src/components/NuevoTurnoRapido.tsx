import { useState } from 'react';
import { Modal, View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { database } from '@/db/database';
import { uuid } from '@/db/uuid';
import { useSesionContext } from '@/auth/SesionContext';
import { Turno } from '@/db/models/Turno';
import { Colors } from '@/constants/theme';
import { Field } from './Field';
import { Button } from './Button';
import { Alerta } from './Alerta';
import { SeleccionarAnimalModal } from './SeleccionarAnimalModal';

function hoyISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Acceso rápido "Nuevo turno" del Home: mismo picker de paciente que
 * consulta/vacuna (`SeleccionarAnimalModal`) + un form simplificado
 * (fecha/hora/motivo) — sin el motor de agendas/slots de la web, que es un
 * concepto online. Crea el turno offline con `estado: 'solicitado'` y
 * `canal: 'offline'`; la colisión de horarios (si la hay) se resuelve al
 * sincronizar, no acá.
 */
export function NuevoTurnoRapido({ onCancelar, onCreado }: { onCancelar: () => void; onCreado: () => void }) {
  const { sesion } = useSesionContext();
  const [animalId, setAnimalId] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');
  const [fecha, setFecha] = useState(hoyISO());
  const [hora, setHora] = useState('10:00');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [ok, setOk] = useState(false);

  if (!animalId) {
    return (
      <SeleccionarAnimalModal
        titulo="Nuevo turno — elegir paciente"
        subtitulo="Elegí o creá el paciente y después completás fecha y hora."
        onCancelar={onCancelar}
        onSeleccionar={setAnimalId}
      />
    );
  }

  async function guardar() {
    if (!sesion || !animalId) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !/^\d{2}:\d{2}$/.test(hora)) {
      setError('Completá fecha (AAAA-MM-DD) y hora (HH:MM) válidas');
      return;
    }
    setError(null);
    setGuardando(true);
    try {
      await database.write(async () => {
        await database.get<Turno>('turnos').create((t) => {
          t._raw.id = uuid();
          t.organizacionId = sesion.organizacionId;
          t.animalId = animalId;
          t.personaId = null;
          t.veterinarioId = null;
          t.fechaHora = new Date(`${fecha}T${hora}:00`);
          // 'confirmado', no 'solicitado': esto lo carga el mostrador (staff
          // ya decidiendo el turno), mismo criterio que la alta rápida de la
          // web — 'solicitado' es para cuando lo pide el propio dueño desde
          // el portal.
          t.estado = 'confirmado';
          t.motivo = motivo.trim() || null;
          t.canal = 'offline';
        });
      });
      setOk(true);
      setTimeout(onCreado, 700);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear el turno');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal visible animationType="slide" onRequestClose={onCancelar}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView style={styles.contenido}>
          <Text style={styles.titulo}>Nuevo turno</Text>
          {ok ? (
            <Text style={styles.ok}>Turno creado ✓</Text>
          ) : (
            <>
              <Field label="Motivo (opcional)" value={motivo} onChangeText={setMotivo} placeholder="Ej: Control" />
              <Field label="Fecha (AAAA-MM-DD)" value={fecha} onChangeText={setFecha} />
              <Field label="Hora (HH:MM)" value={hora} onChangeText={setHora} />

              {error && <Alerta mensaje={error} />}
              <View style={styles.acciones}>
                <View style={styles.accionItem}>
                  <Button title="‹ Cambiar paciente" variant="ghost" onPress={() => setAnimalId(null)} disabled={guardando} />
                </View>
                <View style={styles.accionItem}>
                  <Button title={guardando ? 'Guardando…' : 'Crear turno'} onPress={guardar} disabled={guardando} />
                </View>
              </View>
              <Text style={styles.hint}>Todavía no valida choque de horario.</Text>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.bg },
  contenido: { flex: 1, padding: 16 },
  titulo: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  ok: { color: Colors.verdeDark, fontSize: 15, marginTop: 12 },
  acciones: { flexDirection: 'row', gap: 10, marginTop: 16 },
  accionItem: { flex: 1 },
  hint: { color: Colors.muted, fontSize: 13, marginTop: 14 },
});

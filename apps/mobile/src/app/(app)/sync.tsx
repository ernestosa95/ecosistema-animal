import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSesionContext } from '@/auth/SesionContext';
import { sincronizar } from '@/db/sync';
import { Colors } from '@/constants/theme';

export default function SincronizacionScreen() {
  const { sesion } = useSesionContext();
  const [estado, setEstado] = useState<'idle' | 'syncing' | 'ok' | 'error'>('idle');
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [ultima, setUltima] = useState<Date | null>(null);

  async function sync() {
    if (!sesion) return;
    setEstado('syncing');
    setMensaje(null);
    try {
      await sincronizar(sesion);
      setUltima(new Date());
      setEstado('ok');
    } catch (e) {
      setMensaje(e instanceof Error ? e.message : 'Error al sincronizar');
      setEstado('error');
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sincronización</Text>
      <Text style={styles.sub}>
        {ultima
          ? `Última sincronización: ${ultima.toLocaleTimeString()}`
          : 'Todavía no sincronizaste en esta sesión.'}
      </Text>
      {mensaje && <Text style={styles.error}>{mensaje}</Text>}
      <Pressable style={styles.button} onPress={sync} disabled={estado === 'syncing'}>
        <Text style={styles.buttonText}>{estado === 'syncing' ? 'Sincronizando…' : 'Sincronizar ahora'}</Text>
      </Pressable>
      <Text style={styles.hint}>
        Trae establecimientos/existencias/movimientos/eventos y el seguimiento individual de
        hacienda (animales de campo, potreros, hallazgos, toros virtuales, muestras, tareas)
        actualizados desde el servidor, y envía lo que se cargó offline en este dispositivo.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 8, backgroundColor: Colors.bg },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 4, color: Colors.text },
  sub: { color: Colors.muted },
  error: { color: Colors.danger },
  button: {
    backgroundColor: Colors.verde,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  hint: { color: Colors.muted, fontSize: 13, marginTop: 8 },
});

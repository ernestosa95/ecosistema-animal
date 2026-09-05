import { Pressable, Text, StyleSheet } from 'react-native';
import { Colors, Radii, Shadows } from '@/constants/theme';

/**
 * Acceso rápido del Home ("Centro de operaciones"), calcado de `.operacion-btn`
 * en styles.css: icono + título + subtítulo, touch target grande — pensado
 * para un veterinario de mostrador usando sólo el celular.
 */
export function OperacionButton({
  icono,
  titulo,
  subtitulo,
  onPress,
}: {
  icono: string;
  titulo: string;
  subtitulo: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.btn, pressed && styles.pressed]} onPress={onPress}>
      <Text style={styles.icono}>{icono}</Text>
      <Text style={styles.titulo}>{titulo}</Text>
      <Text style={styles.subtitulo}>{subtitulo}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexBasis: '48%',
    flexGrow: 1,
    alignItems: 'flex-start',
    gap: 6,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.card,
    backgroundColor: Colors.card,
    ...Shadows.suave,
  },
  pressed: {
    borderColor: Colors.verde,
  },
  icono: { fontSize: 26 },
  titulo: { fontWeight: '700', fontSize: 15, color: Colors.text },
  subtitulo: { fontSize: 12.5, color: Colors.muted },
});

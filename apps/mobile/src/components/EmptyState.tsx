import { Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';

/** Equivalente RN de `.empty`/`.muted` en styles.css, para listas vacías. */
export function EmptyState({ mensaje }: { mensaje: string }) {
  return <Text style={styles.texto}>{mensaje}</Text>;
}

const styles = StyleSheet.create({
  texto: {
    textAlign: 'center',
    color: Colors.muted,
    fontSize: 14,
    paddingVertical: 24,
  },
});

import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radii } from '@/constants/theme';

/** Equivalente RN de `.alerta` en styles.css, para mensajes de error. */
export function Alerta({ mensaje }: { mensaje: string }) {
  return (
    <View style={styles.caja}>
      <Text style={styles.texto}>{mensaje}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  caja: {
    backgroundColor: Colors.dangerBg,
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: Radii.btn,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginVertical: 10,
  },
  texto: {
    color: Colors.danger,
    fontSize: 14,
  },
});

import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radii } from '@/constants/theme';

/** Pill de estado, equivalente RN de `.chip` en styles.css. */
export function Chip({
  label,
  tono = 'neutro',
}: {
  label: string;
  tono?: 'neutro' | 'verde' | 'advertencia' | 'peligro';
}) {
  const paleta = {
    neutro: { bg: Colors.hoverBg, fg: Colors.text },
    verde: { bg: Colors.huellaBg, fg: Colors.verdeDark },
    advertencia: { bg: Colors.advertenciaBg, fg: Colors.advertencia },
    peligro: { bg: Colors.dangerBg, fg: Colors.danger },
  }[tono];

  return (
    <View style={[styles.chip, { backgroundColor: paleta.bg }]}>
      <Text style={[styles.texto, { color: paleta.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: Radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  texto: {
    fontSize: 12,
    fontWeight: '600',
  },
});

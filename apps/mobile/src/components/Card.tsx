import { View, StyleSheet, type ViewProps } from 'react-native';
import { Colors, Radii, Shadows } from '@/constants/theme';

/** Equivalente RN de `.card` en styles.css: fondo + borde + radio + sombra suave. */
export function Card({ style, ...props }: ViewProps) {
  return <View style={[styles.card, style]} {...props} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.card,
    padding: 16,
    ...Shadows.suave,
  },
});

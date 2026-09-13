import { Pressable, Text, StyleSheet, type PressableProps } from 'react-native';
import { Colors, Radii } from '@/constants/theme';
import { Fonts } from '@/constants/fonts';

/** Equivalente RN de `.btn`/`.btn-ghost` en styles.css. */
export function Button({
  title,
  variant = 'primary',
  disabled,
  style,
  ...props
}: PressableProps & { title: string; variant?: 'primary' | 'ghost' }) {
  const esGhost = variant === 'ghost';
  return (
    <Pressable
      disabled={disabled}
      style={[esGhost ? styles.ghost : styles.primary, disabled && styles.disabled, style as any]}
      {...props}
    >
      <Text style={esGhost ? styles.textoGhost : styles.textoPrimary}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primary: {
    backgroundColor: Colors.verde,
    borderRadius: Radii.btn,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.btn,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.6,
  },
  textoPrimary: {
    color: '#fff',
    fontFamily: Fonts.bodySemiBold,
    fontSize: 16,
  },
  textoGhost: {
    color: Colors.text,
    fontFamily: Fonts.bodySemiBold,
    fontSize: 15,
  },
});

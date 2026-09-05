import { View, Text, TextInput, StyleSheet, type TextInputProps } from 'react-native';
import { Colors, Radii } from '@/constants/theme';

/** Label + TextInput, equivalente RN de `label`/`input` en styles.css (foco verde incluido). */
export function Field({ label, style, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor={Colors.muted}
        selectionColor={Colors.verde}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 10 },
  label: { fontSize: 13, color: Colors.text, marginBottom: 4, fontWeight: '500' },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.btn,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: Colors.card,
    color: Colors.text,
  },
});

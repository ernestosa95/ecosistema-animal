import { useState } from 'react';
import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Colors, Radii } from '@/constants/theme';

function aFecha(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function aIso(fecha: Date): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Equivalente RN de `<input type="date">` (ya usado en la web para este
 * mismo campo) — el `Field` de texto libre obligaba a tipear "AAAA-MM-DD" a
 * mano. Guarda/recibe el mismo formato ISO ('YYYY-MM-DD') que ya espera el
 * backend, sólo cambia cómo se carga. En Android el picker nativo es un
 * diálogo modal que se cierra solo; en iOS queda inline hasta que se toca
 * "Listo" — de ahí el `mostrar` distinto por plataforma en `onChange`.
 */
export function CampoFecha({
  label,
  value,
  onCambiar,
  limpiable = true,
}: {
  label: string;
  value: string;
  onCambiar: (v: string) => void;
  limpiable?: boolean;
}) {
  const [mostrar, setMostrar] = useState(false);

  function onChange(evento: DateTimePickerEvent, fecha?: Date) {
    if (Platform.OS === 'android') setMostrar(false);
    if (evento.type === 'dismissed') return;
    if (fecha) onCambiar(aIso(fecha));
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.input} onPress={() => setMostrar(true)}>
        <Text style={value ? styles.valor : styles.placeholder}>
          {value ? aFecha(value).toLocaleDateString('es-AR') : 'Elegir fecha…'}
        </Text>
        {limpiable && value ? (
          <Text style={styles.limpiar} onPress={() => onCambiar('')}>
            ✕
          </Text>
        ) : null}
      </Pressable>
      {mostrar && (
        <DateTimePicker
          value={value ? aFecha(value) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={onChange}
        />
      )}
      {Platform.OS === 'ios' && mostrar && (
        <Pressable style={styles.listoBtn} onPress={() => setMostrar(false)}>
          <Text style={styles.listoTexto}>Listo</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 10 },
  label: { fontSize: 13, color: Colors.text, marginBottom: 4, fontWeight: '500' },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.btn,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.card,
  },
  valor: { fontSize: 16, color: Colors.text },
  placeholder: { fontSize: 16, color: Colors.muted },
  limpiar: { fontSize: 14, color: Colors.muted, paddingHorizontal: 4 },
  listoBtn: { alignSelf: 'flex-end', paddingVertical: 6, paddingHorizontal: 4 },
  listoTexto: { color: Colors.verdeDark, fontWeight: '600' },
});

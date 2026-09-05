import { useState, type ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Colors, Radii } from '@/constants/theme';

/**
 * Envoltorio colapsable para un campo de formulario largo (varios en la
 * misma pantalla se sienten pesados de completar todos de una) — arranca
 * cerrado mostrando sólo la etiqueta + un punto indicando si ya tiene
 * contenido; tocar lo abre para completarlo. El campo real (Field,
 * BuscadorCatalogoX, etc.) se pasa como children con su propia label vacía
 * (""), porque ésta ya la muestra el header.
 */
export function CampoColapsable({
  label,
  valor,
  children,
  abiertoInicial = false,
}: {
  label: string;
  valor: string;
  children: ReactNode;
  abiertoInicial?: boolean;
}) {
  const [abierto, setAbierto] = useState(abiertoInicial);
  const completo = valor.trim().length > 0;

  return (
    <View style={styles.wrap}>
      <Pressable style={styles.header} onPress={() => setAbierto((v) => !v)}>
        <View style={styles.headerIzq}>
          <View style={[styles.indicador, completo && styles.indicadorLleno]} />
          <Text style={styles.label}>{label}</Text>
        </View>
        {!abierto && completo ? (
          <Text style={styles.preview} numberOfLines={1}>
            {valor}
          </Text>
        ) : (
          <Text style={styles.flecha}>{abierto ? '︿' : '﹀'}</Text>
        )}
      </Pressable>
      {abierto && <View style={styles.contenido}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.card,
    backgroundColor: Colors.card,
    marginTop: 10,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  headerIzq: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  indicador: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.border },
  indicadorLleno: { backgroundColor: Colors.verde },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text },
  preview: { fontSize: 13, color: Colors.muted, flexShrink: 1, marginLeft: 8, maxWidth: 150 },
  flecha: { color: Colors.muted, fontSize: 12 },
  contenido: { paddingHorizontal: 12, paddingBottom: 12, marginTop: -6 },
});

import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { api, type ItemCatalogoVacunas } from '@/api/client';
import { useSesionContext } from '@/auth/SesionContext';
import { Colors, Radii, Shadows } from '@/constants/theme';
import { Field } from './Field';

/**
 * Buscador con autocompletar contra el catálogo de referencia de
 * diagnósticos comunes filtrado por especie — mismo criterio exacto que
 * `BuscadorCatalogoVacunas`.
 */
export function BuscadorCatalogoDiagnosticos({
  especieId,
  valor,
  onCambiar,
  placeholder,
  label = 'Diagnóstico',
}: {
  especieId: string;
  valor: string;
  onCambiar: (v: string) => void;
  placeholder?: string;
  /** Vacío cuando este buscador va adentro de un header que ya muestra la etiqueta (ver `CampoColapsable`). */
  label?: string;
}) {
  const { sesion } = useSesionContext();
  const [catalogo, setCatalogo] = useState<ItemCatalogoVacunas[]>([]);

  useEffect(() => {
    if (!sesion) return;
    api.catalogoDiagnosticos(sesion, especieId).then(setCatalogo).catch(() => setCatalogo([]));
  }, [sesion, especieId]);

  // Sólo se muestran sugerencias mientras se escribe algo — antes de eso la
  // lista completa quedaba siempre desplegada ocupando lugar en pantalla.
  const termino = valor.trim().toLowerCase();
  const resultados = termino
    ? catalogo.filter((c) => c.nombre.toLowerCase().includes(termino)).slice(0, 8)
    : [];

  return (
    <View>
      <Field label={label} value={valor} onChangeText={onCambiar} placeholder={placeholder} />
      {resultados.map((c) => (
        <Pressable key={c.id} style={styles.resultado} onPress={() => onCambiar(c.nombre)}>
          <Text style={styles.resultadoNombre}>{c.nombre}</Text>
          <Text style={styles.resultadoSub}>{c.categoria}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  resultado: {
    padding: 10,
    marginTop: 6,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.card,
    ...Shadows.suave,
  },
  resultadoNombre: { fontSize: 14, fontWeight: '600', color: Colors.text },
  resultadoSub: { fontSize: 12, color: Colors.muted, marginTop: 1 },
});

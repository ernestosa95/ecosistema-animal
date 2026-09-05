import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Persona } from '@/db/models/Persona';
import { NUEVO_DUENO } from '@/db/altaPaciente';
import { puntuarMultiple } from '@/utils/fuzzy';
import { Colors, Radii, Shadows } from '@/constants/theme';
import { Field } from './Field';

export interface DuenoElegido {
  duenoId: string;
  duenoNuevo?: { nombre: string; apellido: string; celular?: string; dni: string };
}

/**
 * El dueño de un paciente ya no es opcional (a diferencia de la web, que sí
 * lo permite) — acá siempre hay que elegir uno existente o cargar uno
 * nuevo, con DNI obligatorio. Reemplaza el viejo "chip por cada persona" de
 * `SeleccionarAnimalModal`/`paciente/nuevo.tsx` (no escalaba pasadas unas
 * pocas personas) por un buscador — mismo patrón que el buscador de
 * pacientes/productos. `onChange(null)` mientras la selección está
 * incompleta es la señal de "todavía no hay un dueño válido" para que el
 * formulario que lo usa valide con un simple `if (!duenoElegido)`.
 */
export function SelectorDueno({
  personas,
  value,
  onChange,
}: {
  personas: Persona[];
  value: DuenoElegido | null;
  onChange: (v: DuenoElegido | null) => void;
}) {
  const [query, setQuery] = useState('');
  const [modoNuevo, setModoNuevo] = useState(false);
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [celular, setCelular] = useState('');
  const [dni, setDni] = useState('');

  const personaElegida =
    value && value.duenoId !== NUEVO_DUENO ? personas.find((p) => p.id === value.duenoId) ?? null : null;

  if (personaElegida) {
    return (
      <View style={styles.elegido}>
        <Text style={styles.elegidoTexto}>
          Dueño:{' '}
          <Text style={styles.elegidoNombre}>
            {personaElegida.nombre} {personaElegida.apellido}
          </Text>
          {personaElegida.dni ? ` · DNI ${personaElegida.dni}` : ''}
        </Text>
        <Pressable onPress={() => onChange(null)} hitSlop={8}>
          <Text style={styles.link}>cambiar</Text>
        </Pressable>
      </View>
    );
  }

  function emitir(n: string, a: string, d: string, c: string) {
    if (n.trim() && a.trim() && d.trim()) {
      onChange({ duenoId: NUEVO_DUENO, duenoNuevo: { nombre: n.trim(), apellido: a.trim(), dni: d.trim(), celular: c.trim() || undefined } });
    } else {
      onChange(null);
    }
  }

  if (modoNuevo) {
    return (
      <View>
        <Field label="Nombre del dueño" value={nombre} onChangeText={(t) => { setNombre(t); emitir(t, apellido, dni, celular); }} />
        <Field label="Apellido del dueño" value={apellido} onChangeText={(t) => { setApellido(t); emitir(nombre, t, dni, celular); }} />
        <Field label="DNI" value={dni} onChangeText={(t) => { setDni(t); emitir(nombre, apellido, t, celular); }} keyboardType="numeric" />
        <Field label="Celular (opcional)" value={celular} onChangeText={(t) => { setCelular(t); emitir(nombre, apellido, dni, t); }} keyboardType="phone-pad" />
        <Pressable
          style={styles.linkAccion}
          onPress={() => {
            setModoNuevo(false);
            onChange(null);
          }}
        >
          <Text style={styles.link}>‹ Volver a buscar</Text>
        </Pressable>
      </View>
    );
  }

  const q = query.trim();
  const resultados = q
    ? personas
        .map((p) => ({ persona: p, score: puntuarMultiple(q, [p.nombre, p.apellido, p.dni]) }))
        .filter((r) => r.score > 0)
        .sort((x, y) => y.score - x.score)
        .slice(0, 8)
    : [];

  return (
    <View>
      <Field
        label="Buscar dueño (nombre, apellido o DNI)"
        value={query}
        onChangeText={setQuery}
        placeholder="Ej: Pérez o 30123456"
      />
      {q && resultados.length === 0 && <Text style={styles.sinResultados}>Sin resultados.</Text>}
      {resultados.map(({ persona }) => (
        <Pressable key={persona.id} style={styles.resultado} onPress={() => onChange({ duenoId: persona.id })}>
          <Text style={styles.resultadoNombre}>
            {persona.nombre} {persona.apellido}
          </Text>
          {persona.dni ? <Text style={styles.resultadoSub}>DNI {persona.dni}</Text> : null}
        </Pressable>
      ))}
      <Pressable style={styles.linkAccion} onPress={() => setModoNuevo(true)}>
        <Text style={styles.link}>＋ Crear dueño nuevo</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  elegido: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.card,
  },
  elegidoTexto: { fontSize: 14, color: Colors.muted, flexShrink: 1, marginRight: 10 },
  elegidoNombre: { fontWeight: '700', color: Colors.text },
  link: { color: Colors.verdeDark, fontWeight: '600' },
  linkAccion: { paddingVertical: 8, marginTop: 4 },
  sinResultados: { color: Colors.muted, fontSize: 13, marginTop: 4 },
  resultado: {
    padding: 12,
    marginTop: 8,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.card,
    ...Shadows.suave,
  },
  resultadoNombre: { fontSize: 14, fontWeight: '600', color: Colors.text },
  resultadoSub: { fontSize: 12.5, color: Colors.muted, marginTop: 1 },
});

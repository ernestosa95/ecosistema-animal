import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { api } from '@/api/client';
import { useSesionContext } from '@/auth/SesionContext';
import { Colors } from '@/constants/theme';

export default function LoginScreen() {
  const { iniciar } = useSesionContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function entrar() {
    setError(null);
    setCargando(true);
    try {
      const login = await api.login(email, password);
      const org = login.organizaciones[0];
      if (!org) throw new Error('El usuario no tiene ninguna organización asociada');
      await iniciar({
        token: login.accessToken,
        refreshToken: login.refreshToken,
        organizacionId: org.organizacionId,
        rol: org.rol,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado');
    } finally {
      setCargando(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.wrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.brand}>Ecosistema · Salud Animal</Text>
      <Text style={styles.title}>Ingresar</Text>

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Text style={styles.label}>Contraseña</Text>
      <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry />

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.button} onPress={entrar} disabled={cargando}>
        <Text style={styles.buttonText}>{cargando ? 'Ingresando…' : 'Ingresar'}</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', padding: 24, gap: 8, backgroundColor: Colors.bg },
  brand: { fontSize: 14, color: Colors.muted, marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 16, color: Colors.text },
  label: { fontSize: 13, color: Colors.text, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: Colors.card,
    color: Colors.text,
  },
  error: { color: Colors.danger, marginTop: 12 },
  button: {
    backgroundColor: Colors.verde,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});

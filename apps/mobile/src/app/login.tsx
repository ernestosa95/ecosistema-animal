import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { api } from '@/api/client';
import { useSesionContext } from '@/auth/SesionContext';
import { Colors } from '@/constants/theme';
import { Field } from '@/components/Field';
import { Button } from '@/components/Button';
import { Alerta } from '@/components/Alerta';

export default function LoginScreen() {
  const { iniciar } = useSesionContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [modo, setModo] = useState<'login' | 'olvide'>('login');
  const [olvideEnviado, setOlvideEnviado] = useState(false);

  async function enviarOlvide() {
    setError(null);
    setCargando(true);
    try {
      await api.olvidePassword(email);
      setOlvideEnviado(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado');
    } finally {
      setCargando(false);
    }
  }

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
        // El backend devuelve `roles` (arreglo, desde el role-stacking de la
        // Fase A) — nunca `rol`. Guardar `org.rol` acá quedaba silenciosamente
        // undefined porque nada lo leía todavía.
        roles: org.roles ?? [],
        huellaActiva: org.huellaActiva,
        troperaActiva: org.troperaActiva,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado');
    } finally {
      setCargando(false);
    }
  }

  if (modo === 'olvide') {
    return (
      <KeyboardAvoidingView style={styles.wrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Text style={styles.brand}>🐾 Huella</Text>
        <Text style={styles.title}>Recuperar contraseña</Text>

        {olvideEnviado ? (
          <>
            <Text style={styles.info}>
              Si <Text style={{ fontWeight: '700' }}>{email}</Text> tiene una cuenta, te enviamos un
              email con un link para elegir una contraseña nueva. Abrilo desde el celular.
            </Text>
            <View style={styles.boton}>
              <Button
                title="Volver a ingresar"
                variant="ghost"
                onPress={() => { setModo('login'); setOlvideEnviado(false); }}
              />
            </View>
          </>
        ) : (
          <>
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            {error && <Alerta mensaje={error} />}
            <View style={styles.boton}>
              <Button
                title={cargando ? 'Enviando…' : 'Enviar link de recuperación'}
                onPress={enviarOlvide}
                disabled={cargando || !email.trim()}
              />
            </View>
            <Pressable onPress={() => { setError(null); setModo('login'); }} style={styles.link}>
              <Text style={styles.linkTexto}>‹ Volver a ingresar</Text>
            </Pressable>
          </>
        )}
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.wrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.brand}>🐾 Huella</Text>
      <Text style={styles.title}>Ingresar</Text>

      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Field label="Contraseña" value={password} onChangeText={setPassword} secureTextEntry />

      {error && <Alerta mensaje={error} />}

      <View style={styles.boton}>
        <Button title={cargando ? 'Ingresando…' : 'Ingresar'} onPress={entrar} disabled={cargando} />
      </View>
      <Pressable onPress={() => { setError(null); setModo('olvide'); }} style={styles.link}>
        <Text style={styles.linkTexto}>¿Olvidaste tu contraseña?</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: Colors.bg },
  brand: { fontSize: 15, fontWeight: '700', color: Colors.verdeDark, marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 12, color: Colors.text },
  boton: { marginTop: 20 },
  info: { fontSize: 15, color: Colors.text, lineHeight: 21 },
  link: { marginTop: 16, alignItems: 'center' },
  linkTexto: { color: Colors.verdeDark, fontWeight: '600', fontSize: 13.5 },
});

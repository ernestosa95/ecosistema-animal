import { useState } from 'react';
import { View, Text, Pressable, Alert, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { database } from '@/db/database';
import { api } from '@/api/client';
import { useSesionContext } from '@/auth/SesionContext';
import { Animal } from '@/db/models/Animal';
import { comprimirImagen } from '@/utils/comprimirImagen';
import { Colors, Radii } from '@/constants/theme';
import { Alerta } from './Alerta';

/**
 * Foto de perfil del paciente desde la ficha (staff) — mismo endpoint que ya
 * usa `PacienteDetallePage.tsx` en la web (`POST /animales/:id/foto`), acá
 * con cámara o galería vía `expo-image-picker` en vez de un `<input
 * type="file">`. A diferencia del resto de la ficha, esto necesita conexión
 * en el momento (no hay cola offline para archivos binarios).
 */
export function FotoAnimal({ animal }: { animal: Animal }) {
  const { sesion } = useSesionContext();
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function subir(asset: ImagePicker.ImagePickerAsset) {
    if (!sesion) return;
    setError(null);
    setSubiendo(true);
    try {
      const uriComprimida = await comprimirImagen(asset.uri, asset.width, asset.height);
      const actualizado = await api.subirFotoAnimal(sesion, animal.id, uriComprimida);
      await database.write(async () => {
        await animal.update((a) => {
          a.fotoUrl = actualizado.fotoUrl;
        });
      });
      api.registrarEvento(sesion, 'accion', 'foto-subir');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir la foto');
    } finally {
      setSubiendo(false);
    }
  }

  async function tomarFoto() {
    const permiso = await ImagePicker.requestCameraPermissionsAsync();
    if (!permiso.granted) {
      setError('Sin permiso para usar la cámara');
      return;
    }
    const resultado = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!resultado.canceled && resultado.assets[0]) await subir(resultado.assets[0]);
  }

  async function elegirDeGaleria() {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      setError('Sin permiso para acceder a la galería');
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!resultado.canceled && resultado.assets[0]) await subir(resultado.assets[0]);
  }

  function elegirOrigen() {
    Alert.alert('Foto de la mascota', undefined, [
      { text: 'Tomar foto', onPress: tomarFoto },
      { text: 'Elegir de galería', onPress: elegirDeGaleria },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  return (
    <View style={styles.wrap}>
      <Pressable onPress={elegirOrigen} disabled={subiendo} style={styles.avatar}>
        {animal.fotoUrl ? (
          <Image source={{ uri: animal.fotoUrl }} style={styles.imagen} contentFit="cover" />
        ) : (
          <Text style={styles.placeholder}>🐾</Text>
        )}
      </Pressable>
      <Text style={styles.link}>{subiendo ? 'Subiendo…' : animal.fotoUrl ? 'Cambiar foto' : '+ Agregar foto'}</Text>
      {error && <Alerta mensaje={error} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', marginBottom: 8 },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: Radii.card,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  imagen: { width: '100%', height: '100%' },
  placeholder: { fontSize: 32 },
  link: { color: Colors.verdeDark, fontWeight: '600', fontSize: 12.5, marginTop: 6 },
});

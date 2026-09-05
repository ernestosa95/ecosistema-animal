import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const LADO_MAXIMO_PX = 800;
const CALIDAD_JPEG = 0.75;

/**
 * Mismo criterio que apps/web/src/utils/comprimirImagen.ts (resize del lado
 * más largo a 800px, sin agrandar la imagen si ya es más chica, +
 * recompresión JPEG a calidad 0.75): el backend no tiene procesamiento de
 * imágenes (no sharp), así que achicarla del lado del cliente es la única
 * forma de no mandar fotos de varios MB.
 */
export async function comprimirImagen(uri: string, width: number, height: number): Promise<string> {
  const escala = Math.min(1, LADO_MAXIMO_PX / Math.max(width, height));
  const anchoDestino = Math.round(width * escala);
  const altoDestino = Math.round(height * escala);
  const imagen = await ImageManipulator.manipulate(uri).resize({ width: anchoDestino, height: altoDestino }).renderAsync();
  const resultado = await imagen.saveAsync({ compress: CALIDAD_JPEG, format: SaveFormat.JPEG });
  return resultado.uri;
}

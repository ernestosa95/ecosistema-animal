// apps/web/src/utils/comprimirImagen.ts
// Compresión 100% en el cliente (canvas) — no hay ninguna librería de
// procesamiento de imágenes en el backend (ni sharp ni similar), así que la
// calidad/tamaño se resuelven acá antes de subir el archivo.

const LADO_MAXIMO_PX = 800;
const CALIDAD_JPEG = 0.75;

/**
 * Redimensiona (lado más largo a `LADO_MAXIMO_PX`, sin recortar ni
 * distorsionar) y recodifica como JPEG a `CALIDAD_JPEG` — pensado para fotos
 * de perfil de mascota: no hace falta más resolución que eso para una miniatura,
 * y bajar la calidad reduce mucho el peso sin verse notoriamente peor.
 */
export function comprimirImagen(archivo: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(archivo);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const escala = Math.min(1, LADO_MAXIMO_PX / Math.max(img.width, img.height));
      const ancho = Math.round(img.width * escala);
      const alto = Math.round(img.height * escala);

      const canvas = document.createElement('canvas');
      canvas.width = ancho;
      canvas.height = alto;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('No se pudo procesar la imagen')); return; }
      ctx.drawImage(img, 0, 0, ancho, alto);

      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo comprimir la imagen'))),
        'image/jpeg',
        CALIDAD_JPEG,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen')); };
    img.src = url;
  });
}

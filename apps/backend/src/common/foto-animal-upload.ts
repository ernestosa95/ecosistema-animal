import { existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';

// Relativo a process.cwd(), no a __dirname — ver la nota en main.ts (en dev,
// `nest start --watch` corre el JS compilado en dist/, así que __dirname ahí
// adentro apunta a dist/ y el archivo se perdería en el próximo rebuild).
const CARPETA_FOTOS = join(process.cwd(), 'uploads', 'animales');
const EXTENSIONES_PERMITIDAS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

/**
 * Opciones de multer para subir la foto de perfil de un animal — compartidas
 * entre `portal/portal.controller.ts` (el dueño, vía magic-link) y
 * `core/animales/animales.controller.ts` (el staff, desde la ficha). La
 * compresión (resize + calidad) ya viene hecha del lado del cliente
 * (`utils/comprimirImagen.ts`); acá sólo hay un límite duro de tamaño como
 * resguardo, no se confía ciegamente en que el cliente comprimió.
 */
export const OPCIONES_FOTO_ANIMAL = {
  storage: diskStorage({
    destination: (_req: any, _file: any, cb: any) => {
      if (!existsSync(CARPETA_FOTOS)) mkdirSync(CARPETA_FOTOS, { recursive: true });
      cb(null, CARPETA_FOTOS);
    },
    filename: (_req: any, file: Express.Multer.File, cb: any) => {
      const ext = extname(file.originalname).toLowerCase() || '.jpg';
      cb(null, `${randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
  fileFilter: (_req: any, file: Express.Multer.File, cb: any) => {
    const ext = extname(file.originalname).toLowerCase();
    if (!EXTENSIONES_PERMITIDAS.has(ext) || !file.mimetype.startsWith('image/')) {
      cb(new BadRequestException('La foto tiene que ser una imagen (jpg, png o webp)'), false);
      return;
    }
    cb(null, true);
  },
};

/** URL pública final a partir del archivo ya guardado por multer en CARPETA_FOTOS. */
export function fotoUrlDeArchivo(file: Express.Multer.File): string {
  const base = process.env.BACKEND_PUBLIC_URL ?? 'http://localhost:3000';
  return `${base}/uploads/animales/${file.filename}`;
}

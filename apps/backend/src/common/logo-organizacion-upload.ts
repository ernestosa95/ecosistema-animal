import { existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';

// Relativo a process.cwd(), no a __dirname — mismo motivo que
// common/foto-animal-upload.ts y common/comprobante-pago-upload.ts.
const CARPETA_LOGOS = join(process.cwd(), 'uploads', 'logos');
const EXTENSIONES_PERMITIDAS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

/**
 * Opciones de multer para subir el logo de una organización
 * (`core/organizacion/organizacion.controller.ts`, self-service). Sin SVG a
 * propósito, aunque un logo vectorial sea común: el mismo archivo tiene que
 * poder embeberse tal cual tanto en el portal (<img>) como en el carnet/
 * ficha PDF (`@react-pdf/renderer`'s `Image`, que sólo soporta raster) — un
 * SVG se vería bien en un lado y roto en el otro. Límite chico (2MB): es un
 * logo, no una foto.
 */
export const OPCIONES_LOGO_ORGANIZACION = {
  storage: diskStorage({
    destination: (_req: any, _file: any, cb: any) => {
      if (!existsSync(CARPETA_LOGOS)) mkdirSync(CARPETA_LOGOS, { recursive: true });
      cb(null, CARPETA_LOGOS);
    },
    filename: (_req: any, file: Express.Multer.File, cb: any) => {
      const ext = extname(file.originalname).toLowerCase() || '.png';
      cb(null, `${randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (_req: any, file: Express.Multer.File, cb: any) => {
    const ext = extname(file.originalname).toLowerCase();
    const mimeOk = file.mimetype.startsWith('image/');
    if (!EXTENSIONES_PERMITIDAS.has(ext) || !mimeOk) {
      cb(new BadRequestException('El logo tiene que ser una imagen (jpg, png, webp o svg)'), false);
      return;
    }
    cb(null, true);
  },
};

/** URL pública final a partir del archivo ya guardado por multer en CARPETA_LOGOS. */
export function logoUrlDeArchivo(file: Express.Multer.File): string {
  const base = process.env.BACKEND_PUBLIC_URL ?? 'http://localhost:3000';
  return `${base}/uploads/logos/${file.filename}`;
}

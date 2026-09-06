import { existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';

// Relativo a process.cwd(), no a __dirname — mismo motivo que
// common/foto-animal-upload.ts (en dev, `nest start --watch` corre el JS
// compilado en dist/, así que __dirname ahí adentro apunta a dist/ y el
// archivo se perdería en el próximo rebuild).
const CARPETA_COMPROBANTES = join(process.cwd(), 'uploads', 'comprobantes');
const EXTENSIONES_PERMITIDAS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf']);

/**
 * Opciones de multer para subir el comprobante de una transferencia
 * (`core/organizacion/organizacion.controller.ts`, alta de pago
 * self-service) — a diferencia de la foto de un animal, acá sí se admite
 * PDF (la mayoría de los comprobantes de home banking se descargan así), y
 * el límite de tamaño es mayor porque no hay compresión previa del lado
 * del cliente.
 */
export const OPCIONES_COMPROBANTE_PAGO = {
  storage: diskStorage({
    destination: (_req: any, _file: any, cb: any) => {
      if (!existsSync(CARPETA_COMPROBANTES)) mkdirSync(CARPETA_COMPROBANTES, { recursive: true });
      cb(null, CARPETA_COMPROBANTES);
    },
    filename: (_req: any, file: Express.Multer.File, cb: any) => {
      const ext = extname(file.originalname).toLowerCase() || '.jpg';
      cb(null, `${randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (_req: any, file: Express.Multer.File, cb: any) => {
    const ext = extname(file.originalname).toLowerCase();
    const mimeOk = file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf';
    if (!EXTENSIONES_PERMITIDAS.has(ext) || !mimeOk) {
      cb(new BadRequestException('El comprobante tiene que ser una imagen (jpg, png, webp) o un PDF'), false);
      return;
    }
    cb(null, true);
  },
};

/** URL pública final a partir del archivo ya guardado por multer en CARPETA_COMPROBANTES. */
export function comprobanteUrlDeArchivo(file: Express.Multer.File): string {
  const base = process.env.BACKEND_PUBLIC_URL ?? 'http://localhost:3000';
  return `${base}/uploads/comprobantes/${file.filename}`;
}

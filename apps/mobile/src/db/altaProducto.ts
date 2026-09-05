import { database } from './database';
import { uuid } from './uuid';
import { Producto } from './models/Producto';
import type { Sesion } from '../auth/useSesion';
import { api } from '../api/client';

/**
 * Alta offline de un producto de Farmacia — opción secundaria dentro de los
 * buscadores de producto (Venta rápida, Ingreso de stock) para cuando lo que
 * se busca todavía no existe en el catálogo. Sólo pide el nombre: el resto
 * (precio, categoría, etc.) se completa después con el propio flujo que lo
 * llamó (el precio unitario/de venta ya se pide ahí mismo al confirmar).
 */
export async function altaProductoOffline(sesion: Sesion, nombre: string): Promise<Producto> {
  let creado!: Producto;
  await database.write(async () => {
    creado = await database.get<Producto>('productos').create((p) => {
      p._raw.id = uuid();
      p.organizacionId = sesion.organizacionId;
      p.nombre = nombre.trim();
      p.presentacion = null;
      p.unidad = null;
      p.categoria = null;
      p.esMedicamento = false;
      p.esFraccionable = false;
      p.concentracion = null;
      p.unidadConcentracion = null;
      p.dosisSugeridaMgKg = null;
      p.precio = null;
      p.precioCompra = null;
      p.activo = true;
    });
  });
  api.registrarEvento(sesion, 'accion', 'producto-crear');
  return creado;
}

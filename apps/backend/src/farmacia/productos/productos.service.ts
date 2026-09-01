import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../database/drizzle.provider';
import { productos } from '../../database/schema';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';

@Injectable()
export class ProductosService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /** Da de alta un producto del vademécum dentro de la organización activa. */
  async crear(organizacionId: string, dto: CreateProductoDto) {
    const [producto] = await this.db
      .insert(productos)
      .values({
        organizacionId,
        nombre: dto.nombre,
        presentacion: dto.presentacion,
        unidad: dto.unidad,
        categoria: dto.categoria,
        esMedicamento: dto.esMedicamento ?? false,
        esFraccionable: dto.esFraccionable ?? false,
        concentracion: dto.concentracion?.toString(),
        unidadConcentracion: dto.unidadConcentracion,
        dosisSugeridaMgKg: dto.dosisSugeridaMgKg?.toString(),
        precio: dto.precio?.toString(),
        precioCompra: dto.precioCompra?.toString(),
      })
      .returning();
    return producto;
  }

  /** Lista los productos activos de la organización activa. */
  listar(organizacionId: string) {
    return this.db
      .select()
      .from(productos)
      .where(
        and(
          eq(productos.organizacionId, organizacionId),
          eq(productos.activo, true),
          isNull(productos.deletedAt),
        ),
      )
      .orderBy(asc(productos.nombre));
  }

  /** Obtiene un producto, garantizando que pertenezca a la organización activa. */
  async obtener(organizacionId: string, id: string) {
    const [producto] = await this.db
      .select()
      .from(productos)
      .where(
        and(
          eq(productos.id, id),
          eq(productos.organizacionId, organizacionId),
          isNull(productos.deletedAt),
        ),
      )
      .limit(1);
    if (!producto) throw new NotFoundException('Producto no encontrado');
    return producto;
  }

  /** Actualiza un producto de la organización activa. */
  async actualizar(organizacionId: string, id: string, dto: UpdateProductoDto) {
    await this.obtener(organizacionId, id); // valida pertenencia

    const [producto] = await this.db
      .update(productos)
      .set({
        ...(dto.nombre !== undefined && { nombre: dto.nombre }),
        ...(dto.presentacion !== undefined && { presentacion: dto.presentacion }),
        ...(dto.unidad !== undefined && { unidad: dto.unidad }),
        ...(dto.categoria !== undefined && { categoria: dto.categoria }),
        ...(dto.activo !== undefined && { activo: dto.activo }),
        ...(dto.esMedicamento !== undefined && { esMedicamento: dto.esMedicamento }),
        ...(dto.esFraccionable !== undefined && { esFraccionable: dto.esFraccionable }),
        ...(dto.concentracion !== undefined && { concentracion: dto.concentracion.toString() }),
        ...(dto.unidadConcentracion !== undefined && { unidadConcentracion: dto.unidadConcentracion }),
        ...(dto.dosisSugeridaMgKg !== undefined && { dosisSugeridaMgKg: dto.dosisSugeridaMgKg.toString() }),
        ...(dto.precio !== undefined && { precio: dto.precio.toString() }),
        ...(dto.precioCompra !== undefined && { precioCompra: dto.precioCompra.toString() }),
        updatedAt: new Date(),
      })
      .where(and(eq(productos.id, id), eq(productos.organizacionId, organizacionId)))
      .returning();

    return producto;
  }
}

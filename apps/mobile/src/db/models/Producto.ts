import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text } from '@nozbe/watermelondb/decorators';

export class Producto extends Model {
  static table = 'productos';

  @text('organizacion_id') organizacionId: string;
  @text('nombre') nombre: string;
  @text('presentacion') presentacion: string | null;
  @text('unidad') unidad: string | null;
  @text('categoria') categoria: string | null;
  @field('es_medicamento') esMedicamento: boolean;
  @field('es_fraccionable') esFraccionable: boolean;
  @field('concentracion') concentracion: number | null;
  @text('unidad_concentracion') unidadConcentracion: string | null;
  @field('dosis_sugerida_mg_kg') dosisSugeridaMgKg: number | null;
  @field('precio') precio: number | null;
  @field('precio_compra') precioCompra: number | null;
  @field('activo') activo: boolean;
  @readonly @date('created_at') createdAt: Date;
  @readonly @date('updated_at') updatedAt: Date;
}

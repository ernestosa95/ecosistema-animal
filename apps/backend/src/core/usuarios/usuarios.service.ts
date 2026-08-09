import { Injectable, Inject } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../database/drizzle.provider';
import { membresias, usuarios } from '../../database/schema';

/** Roles habilitados para atender (para el selector de "profesional" del turno). */
type Rol = 'propietario' | 'admin' | 'capataz' | 'veterinario' | 'recepcion';

@Injectable()
export class UsuariosService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /**
   * Miembros activos de la organización, con su rol. Se resuelve por
   * `membresias` para respetar el aislamiento multi-tenant (nunca se listan
   * usuarios de otra organización).
   */
  async listarMiembros(organizacionId: string, rol?: string) {
    const filtros = [
      eq(membresias.organizacionId, organizacionId),
      eq(membresias.activo, true),
      isNull(membresias.deletedAt),
    ];
    if (rol) {
      filtros.push(eq(membresias.rol, rol as Rol));
    }

    return this.db
      .select({
        usuarioId: usuarios.id,
        nombre: usuarios.nombre,
        apellido: usuarios.apellido,
        rol: membresias.rol,
      })
      .from(membresias)
      .innerJoin(usuarios, eq(membresias.usuarioId, usuarios.id))
      .where(and(...filtros));
  }
}

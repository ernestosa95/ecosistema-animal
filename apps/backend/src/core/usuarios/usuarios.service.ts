import {
  Injectable,
  Inject,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { DRIZZLE, DrizzleDB } from '../../database/drizzle.provider';
import { membresias, usuarios } from '../../database/schema';

/** Roles habilitados para atender (para el selector de "profesional" del turno). */
type Rol = 'propietario' | 'admin' | 'capataz' | 'veterinario' | 'recepcion';

/** Genera una contraseña temporal legible (sin caracteres ambiguos). */
function generarPasswordTemporal(): string {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let s = '';
  for (let i = 0; i < 10; i++) s += abc[Math.floor(Math.random() * abc.length)];
  return s;
}

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

  /**
   * Resetea la contraseña de un miembro de la organización.
   * - `actorRol`: rol del que ejecuta (para el safeguard de propietario).
   * - Si `nuevaPassword` viene, se usa; si no, se genera una temporal y se
   *   devuelve UNA vez para que el admin se la entregue al usuario.
   *
   * Reglas:
   * - El usuario objetivo debe ser miembro activo de la organización.
   * - Solo un propietario puede resetear la contraseña de otro propietario.
   */
  async resetearPassword(
    organizacionId: string,
    actorRol: string,
    usuarioId: string,
    nuevaPassword?: string,
  ) {
    // 1) El objetivo debe pertenecer a la organización (aislamiento multi-tenant).
    const [m] = await this.db
      .select({ rol: membresias.rol })
      .from(membresias)
      .where(
        and(
          eq(membresias.usuarioId, usuarioId),
          eq(membresias.organizacionId, organizacionId),
          eq(membresias.activo, true),
          isNull(membresias.deletedAt),
        ),
      )
      .limit(1);
    if (!m) {
      throw new NotFoundException('El usuario no es miembro activo de esta organización');
    }

    // 2) Safeguard: no dejar que un admin bloquee a un propietario.
    if (m.rol === 'propietario' && actorRol !== 'propietario') {
      throw new ForbiddenException(
        'Solo un propietario puede resetear la contraseña de otro propietario',
      );
    }

    // 3) Resolver la contraseña (provista o generada).
    const generada = !nuevaPassword;
    const password = nuevaPassword ?? generarPasswordTemporal();
    if (password.length < 6) {
      throw new BadRequestException('La contraseña debe tener al menos 6 caracteres');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [u] = await this.db
      .update(usuarios)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(usuarios.id, usuarioId))
      .returning({ id: usuarios.id, email: usuarios.email });
    if (!u) throw new NotFoundException('Usuario no encontrado');

    // Solo devolvemos la contraseña cuando la generó el sistema (para mostrarla una vez).
    return {
      ok: true,
      email: u.email,
      temporal: generada,
      password: generada ? password : undefined,
    };
  }
}

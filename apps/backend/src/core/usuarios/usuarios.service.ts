import {
  Injectable,
  Inject,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { DRIZZLE, DrizzleDB } from '../../database/drizzle.provider';
import { membresias, usuarios, organizaciones, planes } from '../../database/schema';
import { verificarLimitesRoles } from '../../common/verificar-limites-roles';
import { AgregarMiembroDto } from './dto/agregar-miembro.dto';
import { ActualizarRolesDto } from './dto/actualizar-roles.dto';

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
      filtros.push(sql`${(rol as Rol)} = ANY(${membresias.roles})`);
    }

    return this.db
      .select({
        usuarioId: usuarios.id,
        nombre: usuarios.nombre,
        apellido: usuarios.apellido,
        roles: membresias.roles,
      })
      .from(membresias)
      .innerJoin(usuarios, eq(membresias.usuarioId, usuarios.id))
      .where(and(...filtros));
  }

  /**
   * Resetea la contraseña de un miembro de la organización.
   * - `actorRoles`: roles del que ejecuta (para el safeguard de propietario).
   * - Si `nuevaPassword` viene, se usa; si no, se genera una temporal y se
   *   devuelve UNA vez para que el admin se la entregue al usuario.
   *
   * Reglas:
   * - El usuario objetivo debe ser miembro activo de la organización.
   * - Solo un propietario puede resetear la contraseña de otro propietario.
   */
  async resetearPassword(
    organizacionId: string,
    actorRoles: string[],
    usuarioId: string,
    nuevaPassword?: string,
  ) {
    // 1) El objetivo debe pertenecer a la organización (aislamiento multi-tenant).
    const [m] = await this.db
      .select({ roles: membresias.roles })
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
    if (m.roles.includes('propietario') && !actorRoles.includes('propietario')) {
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

  /**
   * Alta de un miembro por un propietario/admin de la propia organización
   * (self-service — antes esto sólo existía vía `/admin` para el super-admin
   * de plataforma). Mismo criterio que `AdminService.agregarMiembro()`:
   * reutiliza el usuario si el email ya existe, respeta el cupo por rol del
   * plan (`verificarLimitesRoles`).
   */
  async agregarMiembro(organizacionId: string, dto: AgregarMiembroDto) {
    await verificarLimitesRoles(this.db, organizacionId, null, dto.roles);

    let [usuario] = await this.db
      .select()
      .from(usuarios)
      .where(eq(usuarios.email, dto.email))
      .limit(1);

    let creado = false;
    if (!usuario) {
      if (!dto.password) {
        throw new BadRequestException('El usuario es nuevo: hay que definir una contraseña');
      }
      const passwordHash = await bcrypt.hash(dto.password, 10);
      [usuario] = await this.db
        .insert(usuarios)
        .values({ email: dto.email, passwordHash, nombre: dto.nombre, apellido: dto.apellido })
        .returning();
      creado = true;
    }

    const [ya] = await this.db
      .select({ id: membresias.id })
      .from(membresias)
      .where(and(eq(membresias.usuarioId, usuario.id), eq(membresias.organizacionId, organizacionId)))
      .limit(1);
    if (ya) throw new ConflictException('El usuario ya es miembro de esta organización');

    await this.db.insert(membresias).values({
      usuarioId: usuario.id,
      organizacionId,
      roles: dto.roles as Rol[],
    });

    return {
      creado,
      roles: dto.roles,
      usuario: { id: usuario.id, email: usuario.email, nombre: usuario.nombre, apellido: usuario.apellido },
    };
  }

  /**
   * Reemplaza el conjunto completo de roles de un miembro activo — self-
   * service (propietario/admin de la propia organización), a diferencia de
   * `AdminService.setRoles()` que es la variante de super-admin de
   * plataforma. Mismas protecciones que esa: no dejar la org sin propietario
   * activo, y respetar el cupo por rol del plan (excluyendo la propia
   * membresía del conteo, para poder re-guardar el mismo rol sin
   * autobloquearse al estar ya en el límite). Suma una protección propia de
   * esta variante self-service: sólo un propietario puede OTORGAR el rol de
   * propietario (a sí mismo o a otro) — un admin no puede autopromoverse,
   * porque eso le daría acceso a acciones reservadas a propietario (ej.
   * resetear la contraseña de otro propietario) sin que nunca lo hubiese
   * aprobado un propietario real.
   */
  async actualizarRoles(organizacionId: string, actorRoles: string[], usuarioId: string, dto: ActualizarRolesDto) {
    const [m] = await this.db
      .select({ id: membresias.id, roles: membresias.roles, activo: membresias.activo })
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

    if (dto.roles.includes('propietario') && !m.roles.includes('propietario') && !actorRoles.includes('propietario')) {
      throw new ForbiddenException('Sólo un propietario puede asignarle el rol de propietario a alguien');
    }

    if (m.roles.includes('propietario') && !dto.roles.includes('propietario')) {
      const propietariosActivos = await this.db
        .select({ id: membresias.id })
        .from(membresias)
        .where(
          and(
            eq(membresias.organizacionId, organizacionId),
            sql`'propietario' = ANY(${membresias.roles})`,
            eq(membresias.activo, true),
          ),
        );
      if (propietariosActivos.length <= 1) {
        throw new BadRequestException('No podés dejar la organización sin propietario activo');
      }
    }

    await verificarLimitesRoles(this.db, organizacionId, m.id, dto.roles);

    await this.db
      .update(membresias)
      .set({ roles: dto.roles as Rol[], updatedAt: new Date() })
      .where(eq(membresias.id, m.id));

    return { ok: true, roles: dto.roles };
  }

  /**
   * Cupo por rol del plan de la organización + cuántos miembros activos hay
   * hoy de cada uno — para que la propia organización sepa, sin pasar por
   * /admin, cuántos usuarios más puede dar de alta de cada rol (usado por el
   * wizard de configuración rápida). Un rol sin límite en el plan (o sin
   * plan asignado) figura con `limite: null` (sin tope).
   */
  async limitesPlan(organizacionId: string) {
    const ROLES = ['propietario', 'admin', 'capataz', 'veterinario', 'recepcion'] as const;
    const [org] = await this.db
      .select({ planId: organizaciones.planId })
      .from(organizaciones)
      .where(eq(organizaciones.id, organizacionId))
      .limit(1);

    let limites: Record<string, number> = {};
    if (org?.planId) {
      const [plan] = await this.db
        .select({ limitesRoles: planes.limitesRoles })
        .from(planes)
        .where(eq(planes.id, org.planId))
        .limit(1);
      limites = (plan?.limitesRoles ?? {}) as Record<string, number>;
    }

    const resultado: Record<string, { limite: number | null; usados: number }> = {};
    for (const rol of ROLES) {
      const actuales = await this.db
        .select({ id: membresias.id })
        .from(membresias)
        .where(
          and(
            eq(membresias.organizacionId, organizacionId),
            eq(membresias.activo, true),
            sql`${rol} = ANY(${membresias.roles})`,
          ),
        );
      resultado[rol] = { limite: limites[rol] ?? null, usados: actuales.length };
    }
    return resultado;
  }
}

import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { and, asc, eq, sql } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../database/drizzle.provider';
import {
  organizaciones, usuarios, membresias,
  personas, animales, consultas, vacunaciones, turnos,
} from '../database/schema';
import { CrearOrganizacionDto } from './dto/crear-organizacion.dto';
import { AgregarMiembroDto } from './dto/agregar-miembro.dto';

type Rol = 'propietario' | 'admin' | 'capataz' | 'veterinario' | 'recepcion';

@Injectable()
export class AdminService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /** Lista todas las organizaciones de la plataforma. */
  listarOrganizaciones() {
    return this.db
      .select({
        id: organizaciones.id,
        nombre: organizaciones.nombre,
        huellaActiva: organizaciones.huellaActiva,
        troperaActiva: organizaciones.troperaActiva,
        cuit: organizaciones.cuit,
        activo: organizaciones.activo,
        grupoId: organizaciones.grupoId,
        planId: organizaciones.planId,
        accesoHasta: organizaciones.accesoHasta,
        esDemo: organizaciones.esDemo,
        createdAt: organizaciones.createdAt,
      })
      .from(organizaciones)
      .orderBy(asc(organizaciones.nombre));
  }

  /** Gestión de acceso: grupo, plan y vencimiento (null = sin vencimiento). */
  async setAcceso(
    organizacionId: string,
    dto: { grupoId?: string | null; planId?: string | null; accesoHasta?: string | null; esDemo?: boolean },
  ) {
    await this.verificarOrg(organizacionId);
    const [org] = await this.db
      .update(organizaciones)
      .set({
        ...(dto.grupoId !== undefined && { grupoId: dto.grupoId }),
        ...(dto.planId !== undefined && { planId: dto.planId }),
        ...(dto.accesoHasta !== undefined && {
          accesoHasta: dto.accesoHasta ? new Date(dto.accesoHasta) : null,
        }),
        ...(dto.esDemo !== undefined && { esDemo: dto.esDemo }),
        updatedAt: new Date(),
      })
      .where(eq(organizaciones.id, organizacionId))
      .returning();
    return org;
  }

  /** Crea una organización vacía. */
  async crearOrganizacion(dto: CrearOrganizacionDto) {
    const [org] = await this.db
      .insert(organizaciones)
      .values({
        nombre: dto.nombre,
        huellaActiva: dto.huellaActiva ?? true,
        troperaActiva: dto.troperaActiva ?? false,
        cuit: dto.cuit,
      })
      .returning();
    return org;
  }

  /** Activa o desactiva por separado Huella y/o Tropera para una organización. */
  async setSoluciones(organizacionId: string, dto: { huellaActiva: boolean; troperaActiva: boolean }) {
    await this.verificarOrg(organizacionId);
    const [org] = await this.db
      .update(organizaciones)
      .set({ huellaActiva: dto.huellaActiva, troperaActiva: dto.troperaActiva, updatedAt: new Date() })
      .where(eq(organizaciones.id, organizacionId))
      .returning();
    return org;
  }

  /** Activa o desactiva una organización (reversible; los datos quedan intactos). */
  async setActivo(organizacionId: string, activo: boolean) {
    await this.verificarOrg(organizacionId);
    await this.db
      .update(organizaciones)
      .set({ activo, updatedAt: new Date() })
      .where(eq(organizaciones.id, organizacionId));
    return { ok: true, activo };
  }

  /** Elimina la organización y TODOS sus registros (cascada por claves foráneas). */
  async eliminar(organizacionId: string) {
    await this.verificarOrg(organizacionId);
    await this.db.delete(organizaciones).where(eq(organizaciones.id, organizacionId));
    return { ok: true };
  }

  /** Exporta todos los datos de una organización (para portabilidad/respaldo). */
  async exportar(organizacionId: string) {
    const [org] = await this.db
      .select()
      .from(organizaciones)
      .where(eq(organizaciones.id, organizacionId))
      .limit(1);
    if (!org) throw new NotFoundException('Organización no encontrada');

    const [personasR, animalesR, consultasR, vacunacionesR, turnosR, miembrosR] =
      await Promise.all([
        this.db.select().from(personas).where(eq(personas.organizacionId, organizacionId)),
        this.db.select().from(animales).where(eq(animales.organizacionId, organizacionId)),
        this.db.select().from(consultas).where(eq(consultas.organizacionId, organizacionId)),
        this.db.select().from(vacunaciones).where(eq(vacunaciones.organizacionId, organizacionId)),
        this.db.select().from(turnos).where(eq(turnos.organizacionId, organizacionId)),
        this.db
          .select({
            email: usuarios.email,
            nombre: usuarios.nombre,
            apellido: usuarios.apellido,
            roles: membresias.roles,
            activo: membresias.activo,
          })
          .from(membresias)
          .innerJoin(usuarios, eq(membresias.usuarioId, usuarios.id))
          .where(eq(membresias.organizacionId, organizacionId)),
      ]);

    return {
      exportadoEl: new Date().toISOString(),
      organizacion: org,
      miembros: miembrosR,
      personas: personasR,
      animales: animalesR,
      consultas: consultasR,
      vacunaciones: vacunacionesR,
      turnos: turnosR,
    };
  }

  /** Miembros (usuarios + rol) de una organización. */
  async miembros(organizacionId: string) {
    await this.verificarOrg(organizacionId);
    return this.db
      .select({
        membresiaId: membresias.id,
        roles: membresias.roles,
        activo: membresias.activo,
        usuarioId: usuarios.id,
        email: usuarios.email,
        nombre: usuarios.nombre,
        apellido: usuarios.apellido,
      })
      .from(membresias)
      .innerJoin(usuarios, eq(membresias.usuarioId, usuarios.id))
      .where(eq(membresias.organizacionId, organizacionId));
  }

  async agregarMiembro(organizacionId: string, dto: AgregarMiembroDto) {
    await this.verificarOrg(organizacionId);

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
        .values({
          email: dto.email,
          passwordHash,
          nombre: dto.nombre,
          apellido: dto.apellido,
        })
        .returning();
      creado = true;
    }

    const [ya] = await this.db
      .select({ id: membresias.id })
      .from(membresias)
      .where(
        and(
          eq(membresias.usuarioId, usuario.id),
          eq(membresias.organizacionId, organizacionId),
        ),
      )
      .limit(1);
    if (ya) {
      throw new ConflictException('El usuario ya es miembro de esta organización');
    }

    await this.db.insert(membresias).values({
      usuarioId: usuario.id,
      organizacionId,
      roles: dto.roles as Rol[],
    });

    return {
      creado,
      roles: dto.roles,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
      },
    };
  }

  /** Quita (elimina) un miembro de la organización. */
  async quitarMiembro(organizacionId: string, membresiaId: string) {
    const m = await this.obtenerMembresia(organizacionId, membresiaId);
    await this.protegerUltimoPropietario(organizacionId, m);
    await this.db.delete(membresias).where(eq(membresias.id, membresiaId));
    return { ok: true };
  }

  /** Activa o desactiva un miembro (desactivado = no puede operar). */
  async setMiembroActivo(organizacionId: string, membresiaId: string, activo: boolean) {
    const m = await this.obtenerMembresia(organizacionId, membresiaId);
    if (!activo) await this.protegerUltimoPropietario(organizacionId, m);
    await this.db
      .update(membresias)
      .set({ activo, updatedAt: new Date() })
      .where(eq(membresias.id, membresiaId));
    return { ok: true, activo };
  }

  // ── Helpers ───────────────────────────────────────────────────────────
  private async verificarOrg(organizacionId: string) {
    const [org] = await this.db
      .select({ id: organizaciones.id })
      .from(organizaciones)
      .where(eq(organizaciones.id, organizacionId))
      .limit(1);
    if (!org) throw new NotFoundException('Organización no encontrada');
  }

  private async obtenerMembresia(organizacionId: string, membresiaId: string) {
    const [m] = await this.db
      .select({ id: membresias.id, roles: membresias.roles, activo: membresias.activo })
      .from(membresias)
      .where(and(eq(membresias.id, membresiaId), eq(membresias.organizacionId, organizacionId)))
      .limit(1);
    if (!m) throw new NotFoundException('Miembro no encontrado');
    return m;
  }

  /** Evita dejar la organización sin ningún propietario activo. */
  private async protegerUltimoPropietario(
    organizacionId: string,
    m: { roles: string[]; activo: boolean },
  ) {
    if (!m.roles.includes('propietario') || !m.activo) return;
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

  /** Actualiza los roles apilados de una membresía (reemplaza el conjunto completo). */
  async setRoles(organizacionId: string, membresiaId: string, roles: Rol[]) {
    const m = await this.obtenerMembresia(organizacionId, membresiaId);
    // Si se le está quitando "propietario", aplica la misma protección que
    // desactivar/quitar: no puede quedar la organización sin propietario activo.
    if (m.roles.includes('propietario') && !roles.includes('propietario')) {
      await this.protegerUltimoPropietario(organizacionId, m);
    }
    await this.db
      .update(membresias)
      .set({ roles, updatedAt: new Date() })
      .where(eq(membresias.id, membresiaId));
    return { ok: true, roles };
  }
}

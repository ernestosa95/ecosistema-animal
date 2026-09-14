import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import { JwtService } from '@nestjs/jwt';
import { DRIZZLE, DrizzleDB } from '../database/drizzle.provider';
import { solicitudes, usuarios, organizaciones, membresias, planes, configuracion } from '../database/schema';
import { CrearSolicitudDto } from './dto/crear-solicitud.dto';
import { AprobarSolicitudDto, RechazarSolicitudDto } from './dto/aprobar-solicitud.dto';
import { ActualizarConfiguracionDto } from './dto/actualizar-configuracion.dto';
import { MailService } from '../common/mail/mail.service';
import { envolverEmailHuella } from '../common/mail/plantilla';

type Rol = 'propietario' | 'admin' | 'capataz' | 'veterinario' | 'recepcion';

/** Código de 6 dígitos, siempre con ceros a la izquierda (ej. "004821"). */
function generarCodigoVerificacion(): string {
  return Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0');
}

/**
 * El form público de alta sigue pidiendo un único "tipo" (clínica/
 * establecimiento/mixta, texto libre en `solicitudes.tipoOrganizacion`) — más
 * simple para quien se da de alta por primera vez. Se traduce a los dos
 * booleans de `organizaciones` recién acá, al aprobar (el super-admin puede
 * ajustarlos después desde /admin si hace falta).
 */
function solucionesDeTipoOrg(tipo: string | null): { huellaActiva: boolean; troperaActiva: boolean } {
  const t = tipo ?? 'clinica';
  return {
    huellaActiva: t === 'clinica' || t === 'mixta',
    troperaActiva: t === 'establecimiento' || t === 'mixta',
  };
}

// Campos que se exponen (sin passwordHash).
const CAMPOS = {
  id: solicitudes.id,
  tipo: solicitudes.tipo,
  estado: solicitudes.estado,
  nombre: solicitudes.nombre,
  apellido: solicitudes.apellido,
  dni: solicitudes.dni,
  email: solicitudes.email,
  telefono: solicitudes.telefono,
  planId: solicitudes.planId,
  nombreOrganizacion: solicitudes.nombreOrganizacion,
  tipoOrganizacion: solicitudes.tipoOrganizacion,
  direccionOrganizacion: solicitudes.direccionOrganizacion,
  localidadOrganizacion: solicitudes.localidadOrganizacion,
  provinciaOrganizacion: solicitudes.provinciaOrganizacion,
  telefonoOrganizacion: solicitudes.telefonoOrganizacion,
  emailOrganizacion: solicitudes.emailOrganizacion,
  organizacionSolicitada: solicitudes.organizacionSolicitada,
  motivoRechazo: solicitudes.motivoRechazo,
  terminosAceptadosEn: solicitudes.terminosAceptadosEn,
  terminosVersion: solicitudes.terminosVersion,
  createdAt: solicitudes.createdAt,
  resolvedAt: solicitudes.resolvedAt,
};

// Debe coincidir con TERMINOS_VERSION en apps/web/src/legal/terminos.ts —
// si cambia el texto de los términos, subir la fecha acá también.
const TERMINOS_VERSION = '2026-08-30';

@Injectable()
export class SolicitudesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
  ) {}

  /**
   * Envía un código de 6 dígitos al email para verificarlo ANTES de poder
   * mandar la solicitud (a pedido del negocio: evita que lleguen solicitudes
   * con emails inventados o mal tipeados a la bandeja del super-admin).
   * Stateless, mismo patrón que el reset de contraseña: el código viaja
   * embebido en un JWT de vida corta que el cliente retiene y manda de
   * vuelta en `confirmarCodigoVerificacion()` — no hace falta tabla nueva.
   */
  async enviarCodigoVerificacion(email: string): Promise<{ token: string }> {
    const codigo = generarCodigoVerificacion();
    const token = this.jwt.sign({ email, codigo, scope: 'verificar_email' }, { expiresIn: '10m' });
    await this.mail.enviar(
      email,
      'Tu código de verificación',
      `<p>Usá este código para confirmar tu email y terminar de crear tu cuenta:</p>
       <p style="font-size:1.6rem;font-weight:700;letter-spacing:0.25em">${codigo}</p>
       <p>Vale por 10 minutos. Si no fuiste vos, podés ignorar este email.</p>`,
    );
    return { token };
  }

  /**
   * Confirma el código contra el token que devolvió `enviarCodigoVerificacion()`.
   * Si coincide, emite un segundo token de vida un poco más larga
   * (`scope: 'email_verificado'`) que el cliente adjunta al mandar la
   * solicitud — `crear()` valida que el email embebido coincida con el del
   * formulario antes de aceptarla.
   */
  confirmarCodigoVerificacion(token: string, codigo: string): { emailVerificadoToken: string } {
    let payload: { email?: string; codigo?: string; scope?: string };
    try {
      payload = this.jwt.verify(token);
    } catch {
      throw new BadRequestException('El código venció, pedí uno nuevo');
    }
    if (payload.scope !== 'verificar_email' || !payload.email || !payload.codigo) {
      throw new BadRequestException('El código venció, pedí uno nuevo');
    }
    if (payload.codigo !== codigo.trim()) {
      throw new BadRequestException('El código no es correcto');
    }
    const emailVerificadoToken = this.jwt.sign(
      { email: payload.email, scope: 'email_verificado' },
      { expiresIn: '30m' },
    );
    return { emailVerificadoToken };
  }

  /** Alta pública de una solicitud de registro. */
  async crear(dto: CrearSolicitudDto) {
    let verifPayload: { email?: string; scope?: string };
    try {
      verifPayload = this.jwt.verify(dto.emailVerificadoToken);
    } catch {
      throw new BadRequestException('Verificá tu email antes de enviar la solicitud');
    }
    if (verifPayload.scope !== 'email_verificado' || verifPayload.email !== dto.email) {
      throw new BadRequestException('Verificá tu email antes de enviar la solicitud');
    }

    const [usuarioExistente] = await this.db
      .select({ id: usuarios.id })
      .from(usuarios)
      .where(eq(usuarios.email, dto.email))
      .limit(1);
    if (usuarioExistente) {
      throw new ConflictException('Ese email ya tiene una cuenta');
    }

    const [pendiente] = await this.db
      .select({ id: solicitudes.id })
      .from(solicitudes)
      .where(and(eq(solicitudes.email, dto.email), eq(solicitudes.estado, 'pendiente')))
      .limit(1);
    if (pendiente) {
      throw new ConflictException('Ya hay una solicitud pendiente con ese email');
    }

    const [plan] = await this.db
      .select({ activo: planes.activo })
      .from(planes)
      .where(and(eq(planes.id, dto.planId), isNull(planes.deletedAt)))
      .limit(1);
    if (!plan) throw new NotFoundException('Plan no encontrado');
    if (!plan.activo) throw new BadRequestException('Este plan no está disponible para nuevas organizaciones');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const [sol] = await this.db
      .insert(solicitudes)
      .values({
        tipo: dto.tipo,
        nombre: dto.nombre,
        apellido: dto.apellido,
        dni: dto.dni,
        email: dto.email,
        passwordHash,
        telefono: dto.telefono,
        planId: dto.planId,
        nombreOrganizacion: dto.nombreOrganizacion,
        tipoOrganizacion: dto.tipoOrganizacion ?? 'clinica',
        direccionOrganizacion: dto.direccionOrganizacion,
        localidadOrganizacion: dto.localidadOrganizacion,
        provinciaOrganizacion: dto.provinciaOrganizacion,
        telefonoOrganizacion: dto.telefonoOrganizacion,
        emailOrganizacion: dto.emailOrganizacion,
        terminosAceptadosEn: new Date(),
        terminosVersion: TERMINOS_VERSION,
      })
      .returning({ id: solicitudes.id });

    // Aprobación automática (config del super-admin, ver actualizarConfiguracion()):
    // salta la bandeja manual y activa la cuenta al toque. adminUserId null —
    // no hay una persona resolviendo esto, y resolvedPor acepta null.
    const { aprobacionAutomatica } = await this.obtenerConfiguracion();
    if (aprobacionAutomatica) {
      await this.aprobar(sol.id, null, {});
    }

    return { ok: true, id: sol.id };
  }

  /**
   * Fila única (id fijo 'global'), creada perezosamente la primera vez que
   * se lee o se escribe — no depende de un seed en el flujo de deploy.
   */
  private async obtenerOCrearConfiguracion() {
    const [fila] = await this.db.select().from(configuracion).where(eq(configuracion.id, 'global')).limit(1);
    if (fila) return fila;
    const [nueva] = await this.db
      .insert(configuracion)
      .values({ id: 'global' })
      .onConflictDoNothing()
      .returning();
    if (nueva) return nueva;
    // Carrera rara (dos requests concurrentes creándola a la vez): releer.
    const [fila2] = await this.db.select().from(configuracion).where(eq(configuracion.id, 'global')).limit(1);
    return fila2;
  }

  /** STAFF (super-admin) — para el toggle de "aprobación automática" del panel. */
  async obtenerConfiguracion(): Promise<{ aprobacionAutomatica: boolean }> {
    const c = await this.obtenerOCrearConfiguracion();
    return { aprobacionAutomatica: c.aprobacionAutomatica };
  }

  /** STAFF (super-admin). */
  async actualizarConfiguracion(dto: ActualizarConfiguracionDto): Promise<{ aprobacionAutomatica: boolean }> {
    await this.obtenerOCrearConfiguracion();
    const [fila] = await this.db
      .update(configuracion)
      .set({ aprobacionAutomatica: dto.aprobacionAutomatica, updatedAt: new Date() })
      .where(eq(configuracion.id, 'global'))
      .returning();
    return { aprobacionAutomatica: fila.aprobacionAutomatica };
  }

  /** Planes disponibles para elegir en el form público de alta (sólo los habilitados para altas nuevas). */
  planesDisponibles() {
    return this.db
      .select({
        id: planes.id,
        nombre: planes.nombre,
        precioMensual: planes.precioMensual,
        precioAnual: planes.precioAnual,
        limitesRoles: planes.limitesRoles,
        descripcion: planes.descripcion,
        mesesBonificados: planes.mesesBonificados,
      })
      .from(planes)
      .where(and(eq(planes.activo, true), isNull(planes.deletedAt)))
      .orderBy(asc(planes.precioMensual));
  }

  /** Bandeja del admin: solicitudes por estado ('pendiente' por defecto, 'todas' para todo). */
  listar(estado = 'pendiente') {
    const base = this.db.select(CAMPOS).from(solicitudes);
    const q = estado === 'todas' ? base : base.where(eq(solicitudes.estado, estado));
    return q.orderBy(desc(solicitudes.createdAt));
  }

  /**
   * Aprueba una solicitud: crea usuario/organización/membresía según
   * corresponda y avisa por mail que la cuenta ya está lista. `adminUserId`
   * es null cuando la aprobación es automática (ver `crear()` arriba) — no
   * hay una persona resolviéndola, y `resolvedPor` acepta null.
   */
  async aprobar(id: string, adminUserId: string | null, dto: AprobarSolicitudDto) {
    const [sol] = await this.db.select().from(solicitudes).where(eq(solicitudes.id, id)).limit(1);
    if (!sol) throw new NotFoundException('Solicitud no encontrada');
    if (sol.estado !== 'pendiente') throw new BadRequestException('La solicitud ya fue resuelta');

    if (sol.tipo === 'unirse' && !dto.organizacionId) {
      throw new BadRequestException('Elegí la organización destino para aprobar el "unirse"');
    }

    let [usuario] = await this.db
      .select()
      .from(usuarios)
      .where(eq(usuarios.email, sol.email))
      .limit(1);

    await this.db.transaction(async (tx) => {
      if (!usuario) {
        [usuario] = await tx
          .insert(usuarios)
          .values({
            email: sol.email,
            passwordHash: sol.passwordHash,
            nombre: sol.nombre,
            apellido: sol.apellido,
            dni: sol.dni,
          })
          .returning();
      }

      if (sol.tipo === 'crear') {
        const [org] = await tx
          .insert(organizaciones)
          .values({
            nombre: sol.nombreOrganizacion ?? `${sol.nombre} ${sol.apellido}`,
            ...solucionesDeTipoOrg(sol.tipoOrganizacion),
            direccion: sol.direccionOrganizacion,
            localidad: sol.localidadOrganizacion,
            provincia: sol.provinciaOrganizacion,
            telefono: sol.telefonoOrganizacion,
            email: sol.emailOrganizacion,
            // El plan elegido al solicitar la cuenta pasa directo a la
            // organización, y queda activada (para el cálculo de "próximo
            // vencimiento" de /admin) desde el momento en que se aprueba,
            // no desde que se cargó la solicitud.
            planId: sol.planId,
            fechaActivacion: new Date(),
          })
          .returning();
        await tx.insert(membresias).values({
          usuarioId: usuario.id,
          organizacionId: org.id,
          roles: ['propietario'],
        });
      } else {
        const [org] = await tx
          .select({ id: organizaciones.id })
          .from(organizaciones)
          .where(eq(organizaciones.id, dto.organizacionId!))
          .limit(1);
        if (!org) throw new NotFoundException('Organización destino no encontrada');

        const [ya] = await tx
          .select({ id: membresias.id })
          .from(membresias)
          .where(
            and(
              eq(membresias.usuarioId, usuario.id),
              eq(membresias.organizacionId, dto.organizacionId!),
            ),
          )
          .limit(1);
        if (!ya) {
          await tx.insert(membresias).values({
            usuarioId: usuario.id,
            organizacionId: dto.organizacionId!,
            roles: [(dto.rol ?? 'veterinario') as Rol],
          });
        }
      }

      await tx
        .update(solicitudes)
        .set({ estado: 'aprobada', resolvedAt: new Date(), resolvedPor: adminUserId })
        .where(eq(solicitudes.id, id));
    });

    // No bloquea la aprobación si el mail falla — mismo criterio que el
    // resto de las notificaciones fire-and-forget (interesados/, analitica/).
    void this.enviarCuentaLista(sol.nombre, sol.email).catch(() => {});

    return { ok: true };
  }

  /** Mail de bienvenida al aprobar — dispara igual si la aprobación fue manual o automática. */
  private async enviarCuentaLista(nombre: string, email: string): Promise<void> {
    const frontendUrl = process.env.PORTAL_BASE_URL ?? 'http://localhost:5173';
    const html = envolverEmailHuella({
      contenidoHtml: `<p style="margin:0 0 12px;">Hola ${nombre},</p>
        <p style="margin:0 0 12px;">¡Buenas noticias! Tu cuenta de <b>Huella</b> ya está activa — podés iniciar
        sesión con el email y la contraseña que elegiste al registrarte.</p>`,
      botonTexto: 'Iniciar sesión',
      botonUrl: `${frontendUrl}/login`,
    });
    await this.mail.enviar(email, '¡Tu cuenta de Huella ya está lista!', html);
  }

  /** Rechaza una solicitud. */
  async rechazar(id: string, adminUserId: string, dto: RechazarSolicitudDto) {
    const [sol] = await this.db
      .select({ estado: solicitudes.estado })
      .from(solicitudes)
      .where(eq(solicitudes.id, id))
      .limit(1);
    if (!sol) throw new NotFoundException('Solicitud no encontrada');
    if (sol.estado !== 'pendiente') throw new BadRequestException('La solicitud ya fue resuelta');

    await this.db
      .update(solicitudes)
      .set({
        estado: 'rechazada',
        motivoRechazo: dto.motivo,
        resolvedAt: new Date(),
        resolvedPor: adminUserId,
      })
      .where(eq(solicitudes.id, id));

    return { ok: true };
  }
}

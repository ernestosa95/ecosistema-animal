import { ConflictException, Inject, Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { desc, eq, sql } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../database/drizzle.provider';
import { interesados, usuarios, organizaciones, membresias } from '../database/schema';
import { MailService } from '../common/mail/mail.service';
import { envolverEmailHuella } from '../common/mail/plantilla';
import { AuthService } from '../core/auth/auth.service';
import { CrearInteresadoDto } from './dto/crear-interesado.dto';
import { EditarInteresadoDto } from './dto/editar-interesado.dto';
import { ActivarInteresadoDto } from './dto/activar-interesado.dto';

/**
 * Cupo fijo para el lanzamiento — a propósito en el código, no en una tabla
 * de configuración: es una decisión puntual de esta etapa, no un parámetro
 * que el super-admin necesite tocar desde una pantalla.
 */
const CUPO_MAXIMO = 10;

/** Distingue este token de otros JWT stateless del sistema (reset_password, portal) — ver `activar()`. */
const SCOPE_ACTIVACION = 'activar_interesado';

@Injectable()
export class InteresadosService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly mail: MailService,
    private readonly jwt: JwtService,
    private readonly auth: AuthService,
  ) {}

  private async contar(): Promise<number> {
    const [{ count }] = await this.db.select({ count: sql<number>`count(*)::int` }).from(interesados);
    return count;
  }

  /** Público — la landing lo consulta al cargar para decidir si muestra el botón o el aviso de cupo lleno. */
  async cupo(): Promise<{ disponible: boolean; restantes: number }> {
    const usados = await this.contar();
    const restantes = Math.max(0, CUPO_MAXIMO - usados);
    return { disponible: restantes > 0, restantes };
  }

  /**
   * Público — registra un interesado si todavía hay cupo. Dispara dos mails
   * en paralelo (no bloquean el alta si fallan — mismo criterio que
   * `analitica/`, esta acción nunca debe romperse por el envío de mail):
   * confirmación al interesado y aviso a cada email de SUPERADMIN_EMAILS,
   * para que el seguimiento no dependa de entrar a mirar el panel.
   */
  async crear(dto: CrearInteresadoDto): Promise<{ ok: true }> {
    const usados = await this.contar();
    if (usados >= CUPO_MAXIMO) {
      throw new ConflictException('Ya completamos las primeras 10 solicitudes de esta etapa.');
    }
    await this.db.insert(interesados).values(dto);
    void this.notificar(dto).catch(() => {});
    return { ok: true };
  }

  private async notificar(dto: CrearInteresadoDto): Promise<void> {
    const admins = (process.env.SUPERADMIN_EMAILS ?? '')
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);
    const avisos = admins.map((admin) =>
      this.mail.enviar(
        admin,
        `Nuevo interesado: ${dto.nombreVeterinaria}`,
        `<p><b>${dto.nombre}</b> (${dto.nombreVeterinaria}) dejó sus datos en la landing.</p>
         <p>Email: ${dto.email}${dto.celular ? `<br>Celular: ${dto.celular}` : ''}</p>`,
      ),
    );
    await Promise.all([this.enviarConfirmacion(dto.nombre, dto.email, dto.nombreVeterinaria), ...avisos]);
  }

  private async enviarConfirmacion(nombre: string, email: string, nombreVeterinaria: string): Promise<void> {
    const html = envolverEmailHuella({
      contenidoHtml: `<p style="margin:0 0 12px;">Hola ${nombre},</p>
        <p style="margin:0 0 12px;">Ya anotamos a <b>${nombreVeterinaria}</b> entre los primeros en probar Huella
        — te vamos a contactar en breve para coordinar el alta y los primeros 3 meses gratis.</p>
        <p style="margin:0; color:#6c6650;">Gracias por las ganas de probarlo 🐾</p>`,
    });
    await this.mail.enviar(email, '¡Recibimos tu interés en Huella!', html);
  }

  /** STAFF (super-admin) — lista completa para hacer el seguimiento manual. */
  async listar() {
    return this.db.select().from(interesados).orderBy(desc(interesados.createdAt));
  }

  private async obtener(id: string) {
    const [fila] = await this.db.select().from(interesados).where(eq(interesados.id, id)).limit(1);
    if (!fila) throw new NotFoundException('Interesado no encontrado');
    return fila;
  }

  /** STAFF — corrige/completa datos a mano (ej. cargar el email de alguien que se anotó antes de que fuera obligatorio). */
  async editar(id: string, dto: EditarInteresadoDto) {
    await this.obtener(id);
    const [fila] = await this.db
      .update(interesados)
      .set(dto)
      .where(eq(interesados.id, id))
      .returning();
    return fila;
  }

  /** STAFF — saca el registro y libera su lugar en el cupo (spam, duplicados, no-shows). */
  async eliminar(id: string): Promise<{ ok: true }> {
    await this.obtener(id);
    await this.db.delete(interesados).where(eq(interesados.id, id));
    return { ok: true };
  }

  /** STAFF — reenvía el mail de confirmación (ej. si no le llegó, o como recordatorio). Sólo si ya tiene email cargado. */
  async reenviarConfirmacion(id: string): Promise<{ ok: true }> {
    const fila = await this.obtener(id);
    if (!fila.email) {
      throw new BadRequestException('Este interesado todavía no tiene un email cargado — completalo primero.');
    }
    await this.enviarConfirmacion(fila.nombre, fila.email, fila.nombreVeterinaria);
    return { ok: true };
  }

  /**
   * STAFF — dispara el link de "terminá tu alta" a todos los que tengan
   * email cargado. Pensado para apretarse UNA vez (o de nuevo, sin problema:
   * a quien ya activó su cuenta, `activar()` le va a devolver un error claro
   * de "ya existe una cuenta" en vez de duplicar nada) cuando la app esté
   * lista para usuarios reales — no hay aprobación manual después: son los
   * 10 que el super-admin ya eligió a mano.
   */
  async invitarTodos(): Promise<{ enviados: number }> {
    const todos = await this.listar();
    const conEmail = todos.filter((i): i is typeof i & { email: string } => !!i.email);
    const frontendUrl = process.env.PORTAL_BASE_URL ?? 'http://localhost:5173';

    await Promise.all(
      conEmail.map((i) => {
        const token = this.jwt.sign({ sub: i.id, scope: SCOPE_ACTIVACION }, { expiresIn: '30d' });
        const link = `${frontendUrl}/?activarToken=${token}`;
        const html = envolverEmailHuella({
          contenidoHtml: `<p style="margin:0 0 12px;">Hola ${i.nombre},</p>
            <p style="margin:0 0 12px;">¡Ya podés terminar de configurar la cuenta de <b>${i.nombreVeterinaria}</b>
            en Huella! Elegí tu contraseña y arrancá.</p>`,
          botonTexto: 'Completar mi cuenta',
          botonUrl: link,
        });
        return this.mail.enviar(i.email, '¡Ya podés activar tu cuenta en Huella!', html);
      }),
    );
    return { enviados: conEmail.length };
  }

  /** Público — decodifica el token del link y devuelve el nombre/veterinaria ya conocidos, para precargar el form. */
  async datosActivacion(token: string) {
    const interesado = await this.verificarToken(token);
    return { nombre: interesado.nombre, email: interesado.email, nombreVeterinaria: interesado.nombreVeterinaria };
  }

  private async verificarToken(token: string) {
    let payload: { sub?: string; scope?: string };
    try {
      payload = this.jwt.verify(token);
    } catch {
      throw new BadRequestException('Este link no es válido o venció — pedí uno nuevo.');
    }
    if (payload.scope !== SCOPE_ACTIVACION || !payload.sub) {
      throw new BadRequestException('Este link no es válido.');
    }
    return this.obtener(payload.sub);
  }

  /**
   * Público — crea la organización + usuario propietario y devuelve la
   * sesión ya lista (mismos tokens que `AuthService.register()`, más
   * organizacionId/roles para que el cliente arme la sesión sin un login
   * aparte). Sin aprobación manual a propósito, a diferencia de
   * `solicitudes/` — ver el comentario de `invitarTodos()`.
   */
  async activar(dto: ActivarInteresadoDto) {
    const interesado = await this.verificarToken(dto.token);
    if (!interesado.email) {
      throw new BadRequestException('Este interesado no tiene un email cargado — pedile al staff que lo complete.');
    }

    const yaExiste = await this.db
      .select({ id: usuarios.id })
      .from(usuarios)
      .where(eq(usuarios.email, interesado.email))
      .limit(1);
    if (yaExiste.length) {
      throw new ConflictException('Ya existe una cuenta con este email — iniciá sesión normalmente.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const { usuario, org } = await this.db.transaction(async (tx) => {
      const [org] = await tx
        .insert(organizaciones)
        .values({ nombre: dto.nombreOrganizacion?.trim() || interesado.nombreVeterinaria })
        .returning();
      const [usuario] = await tx
        .insert(usuarios)
        .values({
          email: interesado.email!,
          passwordHash,
          nombre: interesado.nombre,
          apellido: dto.apellido,
        })
        .returning();
      await tx.insert(membresias).values({ usuarioId: usuario.id, organizacionId: org.id, roles: ['propietario'] });
      return { usuario, org };
    });

    return {
      ...this.auth.emitirTokens(usuario.id, usuario.email),
      organizacionId: org.id,
      roles: ['propietario'],
      huellaActiva: org.huellaActiva,
      troperaActiva: org.troperaActiva,
    };
  }
}

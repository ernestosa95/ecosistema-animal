import { ConflictException, Inject, Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { desc, eq, sql } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../database/drizzle.provider';
import { interesados } from '../database/schema';
import { MailService } from '../common/mail/mail.service';
import { CrearInteresadoDto } from './dto/crear-interesado.dto';
import { EditarInteresadoDto } from './dto/editar-interesado.dto';

/**
 * Cupo fijo para el lanzamiento — a propósito en el código, no en una tabla
 * de configuración: es una decisión puntual de esta etapa, no un parámetro
 * que el super-admin necesite tocar desde una pantalla.
 */
const CUPO_MAXIMO = 10;

@Injectable()
export class InteresadosService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly mail: MailService,
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
    await this.mail.enviar(
      email,
      '¡Recibimos tu interés en Huella!',
      `<p>Hola ${nombre},</p>
       <p>Ya anotamos a <b>${nombreVeterinaria}</b> entre los primeros en probar Huella — te vamos a contactar en breve para coordinar el alta y los primeros 3 meses gratis.</p>
       <p>Gracias por las ganas de probarlo.</p>`,
    );
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
}

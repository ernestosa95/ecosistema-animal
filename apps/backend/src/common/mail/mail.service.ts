import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

/**
 * Envío de emails transaccionales — usado por "olvidé mi contraseña"
 * (`auth.service.ts`), verificación de email y aviso de cuenta lista
 * (`solicitudes.service.ts`) e interesados/. Usa Resend (`RESEND_API_KEY`);
 * si no está configurada, loguea el email en vez de fallar — así el resto
 * del flujo (dev local sin cuenta de Resend) sigue funcionando, sólo sin el
 * envío real.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    this.resend = apiKey ? new Resend(apiKey) : null;
    this.from = process.env.MAIL_FROM ?? 'Huella <onboarding@resend.dev>';
  }

  async enviar(destinatario: string, asunto: string, html: string): Promise<void> {
    if (!this.resend) {
      this.logger.warn(
        `RESEND_API_KEY no configurada — no se envió el email a ${destinatario} (asunto: "${asunto}")`,
      );
      return;
    }
    const { error } = await this.resend.emails.send({
      from: this.from,
      to: destinatario,
      subject: asunto,
      html,
    });
    if (error) {
      this.logger.error(`Error al enviar email a ${destinatario}: ${error.message}`);
    }
  }
}

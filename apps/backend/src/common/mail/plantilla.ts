/**
 * Envoltorio visual para los emails transaccionales — kit de marca Huella
 * (docs/Kit_Marca_Huella.html): verde #0e7c6b, "papel" cálido de fondo.
 * Todo inline (nada de <style> ni fuentes de Google Fonts): los clientes de
 * mail más usados (Gmail, Outlook) ignoran o recortan el <head>, así que
 * cualquier estilo tiene que viajar en el atributo `style` de cada elemento.
 * Fuente: stack web-safe (Georgia/Arial) — Sora/Work Sans no están
 * garantizadas en un cliente de mail.
 *
 * `botonTexto`/`botonUrl` son opcionales — sin ellos no se renderiza el CTA.
 */
export function envolverEmailHuella(params: {
  contenidoHtml: string;
  botonTexto?: string;
  botonUrl?: string;
}): string {
  const { contenidoHtml, botonTexto, botonUrl } = params;
  const boton =
    botonTexto && botonUrl
      ? `<tr><td style="padding: 8px 0 4px;">
           <a href="${botonUrl}" style="display:inline-block; background:#0e7c6b; color:#ffffff; text-decoration:none;
              font-family: Arial, Helvetica, sans-serif; font-size:15px; font-weight:bold; padding:12px 24px;
              border-radius:9px;">
             ${botonTexto}
           </a>
         </td></tr>`
      : '';

  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f5f1; padding: 32px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" style="max-width:480px; background:#ffffff; border:1px solid #e2dfd6;
        border-radius:14px; overflow:hidden; font-family: Arial, Helvetica, sans-serif;">
        <tr>
          <td style="background:#0e7c6b; padding:20px 28px;">
            <span style="color:#ffffff; font-size:20px; font-weight:bold; letter-spacing:0.01em;">🐾 Huella</span>
          </td>
        </tr>
        <tr>
          <td style="padding:28px; color:#1e2a23; font-size:15px; line-height:1.55;">
            ${contenidoHtml}
            <table role="presentation" cellpadding="0" cellspacing="0">${boton}</table>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 28px; background:#f6f5f1; border-top:1px solid #e2dfd6;
            color:#6c6650; font-size:12px;">
            Huella — gestión clínica veterinaria
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

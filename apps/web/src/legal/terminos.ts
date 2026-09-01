// Contenido de "Términos y condiciones y política de privacidad", mostrado
// en el alta de cuenta (LoginPage.tsx, modo "registro") vía TerminosModal.
//
// ⚠️ Es un borrador de partida, no un documento legal validado. Antes de
// usarlo en producción hace falta: completar los datos reales del
// responsable del tratamiento (razón social, CUIT, email de contacto) donde
// dice [ ], y que lo revise un abogado — sobre todo lo referido a la Ley
// 25.326 de Protección de Datos Personales.
//
// TERMINOS_VERSION debe coincidir con la constante homónima en
// apps/backend/src/solicitudes/solicitudes.service.ts — si el texto cambia,
// subir la fecha en los dos lugares (permite en el futuro saber qué versión
// aceptó cada solicitud, vía `solicitudes.terminosVersion`).
export const TERMINOS_VERSION = '2026-08-30';

export interface SeccionTerminos {
  titulo: string;
  parrafos: string[];
}

export const SECCIONES_TERMINOS: SeccionTerminos[] = [
  {
    titulo: '1. Aceptación de los términos',
    parrafos: [
      'Al crear una cuenta en el Ecosistema de Salud Animal aceptás estos Términos y Condiciones y la Política de Privacidad descriptos en este documento. Si no estás de acuerdo, no debés crear una cuenta ni usar la plataforma.',
    ],
  },
  {
    titulo: '2. Responsable del tratamiento de datos',
    parrafos: [
      '[Razón social del responsable] (CUIT [__-________-_]), en adelante "la Plataforma", es responsable del tratamiento de los datos personales descriptos en este documento, de acuerdo con la Ley N.º 25.326 de Protección de Datos Personales de la República Argentina.',
    ],
  },
  {
    titulo: '3. Qué datos recopilamos',
    parrafos: [
      'a) Datos de tu cuenta: nombre, apellido, DNI, email, teléfono y contraseña (guardada encriptada, nunca en texto plano).',
      'b) Datos de tu organización (veterinaria, clínica o establecimiento ganadero): nombre, dirección, localidad, provincia, teléfono, email de contacto y CUIT.',
      'c) Datos que vos cargás sobre terceros: si usás la Plataforma para gestionar una veterinaria, un campo o un establecimiento, vas a cargar datos personales de dueños de animales (nombre, DNI, contacto, domicilio) y datos vinculados a los animales bajo tu cuidado (historia clínica, vacunas, tratamientos, existencias). Sos responsable de contar con el consentimiento correspondiente de esas personas para cargar sus datos en la Plataforma, y de la exactitud de la información que ingresás.',
      'd) Datos de uso: registros técnicos de acceso (fecha y hora de inicio de sesión) con fines de seguridad y auditoría.',
    ],
  },
  {
    titulo: '4. Para qué usamos tus datos',
    parrafos: [
      'Para darte acceso a tu cuenta y a las funcionalidades de la Plataforma (historia clínica, turnero, gestión de hacienda, farmacia, caja, según la solución habilitada para tu organización), para comunicarnos con vos por soporte o avisos de la Plataforma, y para prevenir usos indebidos y proteger su seguridad.',
      'No usamos tus datos con fines de marketing de terceros ni los vendemos.',
    ],
  },
  {
    titulo: '5. Con quién compartimos datos',
    parrafos: [
      'No compartimos tus datos personales con terceros, salvo con proveedores de infraestructura técnica (hosting, backups) estrictamente necesarios para operar la Plataforma —bajo las mismas obligaciones de confidencialidad— o cuando la ley lo exija (requerimiento judicial o de una autoridad competente).',
      'Los dueños de animales pueden acceder a un resumen limitado de la historia clínica de su mascota a través del portal del dueño (por código o enlace emitido por la veterinaria), sin necesidad de crear una cuenta propia.',
    ],
  },
  {
    titulo: '6. Cuánto tiempo conservamos los datos',
    parrafos: [
      'Conservamos los datos mientras tu cuenta u organización estén activas. Si solicitás la baja, tus datos se eliminan de forma permanente (incluidos los registros que hayas cargado), salvo que la ley exija conservarlos por un plazo mayor.',
    ],
  },
  {
    titulo: '7. Tus derechos',
    parrafos: [
      'Como titular de tus datos tenés derecho a acceder, rectificar, actualizar y solicitar la supresión de tus datos personales, así como a revocar el consentimiento otorgado, escribiendo a [email de contacto]. La Agencia de Acceso a la Información Pública, como Órgano de Control de la Ley N.º 25.326, tiene la atribución de atender denuncias y reclamos relacionados con el incumplimiento de las normas de protección de datos personales.',
    ],
  },
  {
    titulo: '8. Seguridad',
    parrafos: [
      'Tu contraseña se guarda encriptada y las comunicaciones con la Plataforma viajan cifradas. Ningún sistema es infalible: te pedimos usar una contraseña única y no compartirla con nadie.',
    ],
  },
  {
    titulo: '9. Cuentas y organizaciones',
    parrafos: [
      'El acceso a la Plataforma se otorga por organización, con roles definidos (propietario, administrador, veterinario, recepción, capataz, según corresponda). Quien administra la organización puede gestionar qué miembros tienen acceso y con qué rol, y dar de baja a un miembro en cualquier momento.',
    ],
  },
  {
    titulo: '10. Modificaciones',
    parrafos: [
      'Podemos actualizar estos términos. Si el cambio es sustancial te lo vamos a avisar dentro de la Plataforma y, si corresponde, te vamos a pedir que los aceptes de nuevo para seguir usando el servicio.',
    ],
  },
  {
    titulo: '11. Contacto',
    parrafos: [
      'Para consultas sobre estos términos o el tratamiento de tus datos, escribinos a [email de contacto].',
      `Última actualización: ${TERMINOS_VERSION}.`,
    ],
  },
];

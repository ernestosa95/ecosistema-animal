/**
 * Catálogo base de macros con el que arranca cada organización (sembrado
 * lazy por MacrosService.listar() la primera vez que pide sus macros y no
 * tiene ninguna todavía). A partir de acá cada una arma/edita la suya.
 */
export interface MacroDefault {
  categoria: 'anamnesis' | 'examenFisico' | 'diagnostico' | 'tratamiento';
  tag: string;
  texto: string;
}

export const MACROS_DEFAULT: MacroDefault[] = [
  { categoria: 'anamnesis', tag: '#control', texto: 'Consulta de control. Sin signos clínicos referidos por el tutor.' },
  { categoria: 'anamnesis', tag: '#vomito', texto: 'Tutor refiere episodios de vómito en las últimas 24-48hs. Consultar frecuencia, contenido y relación con la ingesta.' },
  { categoria: 'anamnesis', tag: '#decaimiento', texto: 'Tutor refiere decaimiento y menor apetito en los últimos días.' },
  { categoria: 'anamnesis', tag: '#cojera', texto: 'Tutor refiere cojera de inicio agudo/progresivo. Consultar miembro afectado y antecedente traumático.' },

  { categoria: 'examenFisico', tag: '#normal', texto: 'Actitud alerta y responsiva. Mucosas rosadas, TRC < 2seg. Auscultación cardiopulmonar sin alteraciones. Abdomen blando, no doloroso a la palpación.' },
  { categoria: 'examenFisico', tag: '#deshidratacion', texto: 'Pliegue cutáneo persistente. Mucosas secas. Se estima deshidratación leve/moderada.' },
  { categoria: 'examenFisico', tag: '#dental', texto: 'Presencia de sarro dental y gingivitis leve/moderada/severa. Sin piezas dentales faltantes evidentes.' },
  { categoria: 'examenFisico', tag: '#otitis', texto: 'Conducto auditivo con eritema y secreción. Dolor a la manipulación del pabellón.' },

  { categoria: 'diagnostico', tag: '#gastroenteritis', texto: 'Gastroenteritis aguda, a confirmar origen (dietético/infeccioso/parasitario).' },
  { categoria: 'diagnostico', tag: '#dermatitis', texto: 'Dermatitis a caracterizar (alérgica/parasitaria/infecciosa).' },
  { categoria: 'diagnostico', tag: '#otitis_ext', texto: 'Otitis externa, a confirmar agente (bacteriano/fúngico/mixto) con citología.' },

  { categoria: 'tratamiento', tag: '#dieta_blanda', texto: 'Dieta blanda de fácil digestión por 3-5 días. Reintroducir alimento habitual gradualmente.' },
  { categoria: 'tratamiento', tag: '#reposo', texto: 'Reposo relativo, evitar ejercicio intenso hasta la próxima revisión.' },
  { categoria: 'tratamiento', tag: '#control_7d', texto: 'Control clínico en 7 días para reevaluar evolución.' },
];

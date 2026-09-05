// apps/web/src/config/rolesInfo.ts
// Catálogo de qué incluye cada rol — pensado para dos lugares: el form
// público de solicitud de cuenta (para que quien se da de alta entienda qué
// va a poder hacer cada usuario del plan que elige) y el panel de Planes en
// /admin (para el super-admin, que con todo lo que se fue agregando ya no
// tiene a mano qué desbloquea cada rol). Reflejan los sets ROLES_* de
// `nav/config.ts` y los guards reales del backend — si un rol gana o pierde
// acceso a algo, actualizar acá también.
export interface RolInfo {
  id: string;
  label: string;
  resumen: string;
  incluye: string[];
}

export const ROLES_INFO: RolInfo[] = [
  {
    id: 'propietario',
    label: 'Propietario',
    resumen: 'Acceso completo a la organización. Es el único rol que no puede quedar en cero: siempre tiene que haber al menos un propietario activo.',
    incluye: [
      'Todo Huella: turnos, animales, dueños, historia clínica (consultas, vacunaciones, indicaciones, macros), recordatorios, farmacia y stock, caja',
      'Todo Tropera: hacienda, potreros, seguimiento individual, plantillas y protocolos (si la organización tiene Tropera habilitada)',
      'Alta y gestión de usuarios de la organización, incluido el restablecimiento de contraseñas',
      'Panel de indicadores (Home) con métricas del negocio',
    ],
  },
  {
    id: 'admin',
    label: 'Administrador',
    resumen: 'Mismo nivel de acceso operativo que Propietario. La diferencia es sólo esa protección: la organización necesita siempre un Propietario, no un Administrador.',
    incluye: [
      'Todo Huella y todo Tropera, igual que Propietario',
      'Alta y gestión de usuarios de la organización',
      'Panel de indicadores (Home)',
    ],
  },
  {
    id: 'veterinario',
    label: 'Veterinario',
    resumen: 'El trabajo clínico del día a día: turnos, pacientes e historia clínica.',
    incluye: [
      'Turnos, animales y dueños',
      'Historia clínica: consultas, vacunaciones, indicaciones y macros',
      'Farmacia y stock, incluida la dispensa ligada a una consulta',
      'Recordatorios de vacunación',
      'No tiene acceso a Caja ni a la gestión de usuarios de la organización',
    ],
  },
  {
    id: 'recepcion',
    label: 'Administrativa / Recepción',
    resumen: 'El mostrador: turnos, cobros y venta de productos, sin historia clínica.',
    incluye: [
      'Turnos, animales y dueños',
      'Recordatorios de vacunación',
      'Caja: apertura/cierre, cobros y venta de mostrador',
      'No puede cargar consultas ni vacunaciones, ni editar el catálogo de Farmacia',
    ],
  },
  {
    id: 'capataz',
    label: 'Capataz',
    resumen: 'Gestión de campo en Tropera.',
    incluye: [
      'Hacienda: existencias y movimientos (nacimientos, compras, ventas, traslados, bajas)',
      'Potreros, seguimiento individual, plantillas de tareas y protocolos IATF',
      'Eventos sanitarios y reproductivos',
      'No tiene acceso a Huella ni a la gestión de usuarios de la organización',
    ],
  },
];

export const rolInfoDe = (id: string): RolInfo | undefined => ROLES_INFO.find((r) => r.id === id);

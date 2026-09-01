# 🐾 Huella — Ficha comercial

> Documento de apoyo para estrategia comercial. Describe funcionalidades, ventajas y público objetivo desde el punto de vista de venta, basado en lo que la plataforma efectivamente hace hoy (no en funcionalidades planeadas). Complementa `Roadmap_Ecosistema.md` (estado técnico).

---

## Qué es

**Huella** es el sistema de gestión clínica veterinaria del Ecosistema de Salud Animal: historia clínica electrónica, turnero, farmacia, caja y portal del dueño en un solo lugar, pensado para que el consultorio funcione de punta a punta sin planillas sueltas ni WhatsApp como sistema de turnos.

No reemplaza el criterio profesional del veterinario — le saca de encima la carga administrativa: buscar la ficha de un paciente, calcular una dosis, recordar quién tiene una vacuna vencida, cerrar la caja del día, o mandarle el carnet al dueño.

---

## Público objetivo

| Perfil | Por qué le sirve |
|---|---|
| **Veterinaria / clínica chica o mediana** | Reemplaza la combinación planilla + agenda de papel + grupo de WhatsApp por un sistema único, con historia clínica, turnero y caja conectados entre sí. |
| **Veterinario independiente** | Lleva la historia clínica de sus pacientes, cobra en el mostrador y manda recordatorios de vacunas sin necesitar un sistema pensado para clínicas grandes. |
| **Equipos con recepción + varios profesionales** | Turnero con asignación por profesional, roles diferenciados (propietario, administrador, veterinario, recepción) y caja de mostrador operable por recepción sin exponer el resto del sistema. |
| **Clínicas multi-especie** | El catálogo de datos por especie es configurable — no está atado a "perro/gato"; sirve igual para una clínica de exóticos o mixta. |
| **Dueños de mascotas de esos clientes** | Acceden al resumen de la historia clínica de su mascota desde el celular, sin instalar nada ni crear cuenta — mejora la percepción de profesionalismo de la veterinaria que los atiende. |

**No es para:** consultorios que no quieren informatizarse en absoluto. Para todo lo demás — desde un veterinario solo hasta una clínica con varios profesionales y mostrador — el sistema escala con roles y permisos, no con módulos que hay que comprar aparte.

---

## Funcionalidades

### Historia clínica electrónica
- Ficha de paciente con **datos específicos por especie** (catálogo configurable, no hardcodeado a perro/gato).
- **Identificación unívoca**: código legible con dígito verificador + soporte para microchip ISO — sin ambigüedad de "cuál Firulais es".
- **Consultas** completas: motivo, anamnesis, examen físico, diagnóstico, tratamiento, peso, temperatura y observaciones — editables y con borrado auditado.
- **Timeline médica**: línea de tiempo visual de la historia del paciente, con precarga automática del último peso/temperatura al abrir una consulta nueva.
- **Macros**: bloques de texto predefinidos para no volver a escribir lo mismo en cada consulta (catálogo por organización, editable).

### Vacunaciones y recordatorios
- Registro de vacunación (producto, fecha, próxima dosis, lote).
- Pestaña de **recordatorios** con vencimientos próximos y contacto directo al dueño por WhatsApp o llamada — sin exportar listas a mano.

### Carnet y ficha del paciente
- **Carnet tipo DNI** (tarjeta chica) para que el dueño lleve encima, con QR al portal.
- **Ficha completa en A4** para archivo/impresión de la clínica, con historial de vacunas y tratamientos.

### Turnero
- Agenda diaria + calendario mensual, con contador de turnos por día.
- Alta de turno desde el mostrador con **alta de paciente y dueño inline** (no hace falta salir del formulario si el paciente es nuevo).
- Asignación de profesional y estados completos: solicitado, confirmado, reprogramado, cancelado, atendido, ausente.
- "Atender" un turno abre directo la ficha del paciente con la consulta lista para cargar.

### Portal del dueño (dos caminos, sin fricción)
- **Público por código QR**: el dueño escanea el carnet y ve el resumen de su mascota, sin login.
- **Magic-link emitido por la veterinaria**: acceso a todas las mascotas del dueño + solicitud de turno propia, sin crear cuenta.

### Farmacia y stock
- Catálogo de productos (vademécum) con stock por producto.
- Movimientos con historial (compra, uso, vencimiento, merma) y validación — no se puede dispensar más de lo que hay.
- **Dispensa ligada a la consulta**: al atender, se descuenta stock real desde la misma ficha del paciente.
- **Calculadora de dosis**: a partir del peso del paciente y la concentración del producto, sugiere la dosis — con confirmación explícita del profesional, nunca automática.

### Caja de mostrador
- Apertura y cierre de caja diaria, con cálculo automático de lo esperado (inicial + cobros − egresos) contra lo contado.
- **Auditoría de diferencias**: si no cierra, queda marcada para revisión de la gerencia — sin necesitar que alguien la detecte a mano.
- **Liquidación de honorarios** por profesional, exportable.
- Venta de mostrador de productos de farmacia con descuento real de stock.

### Gestión del equipo
- Roles apilables (un usuario puede ser, por ejemplo, veterinario + administrador) sin necesitar cuentas separadas.
- Reseteo de contraseña de miembros del equipo desde la propia plataforma.

### Panel de indicadores
- Pacientes activos, consultas y turnos del mes, vacunas por vencer — con detalle desglosado y exportación (CSV / Excel / PDF).

### Onboarding
- **Tutorial guiado** interactivo por rol la primera vez que cada usuario entra, y reabrible en cualquier momento.
- **Búsqueda rápida** (Ctrl+K) de pacientes y dueños desde cualquier pantalla.

---

## Ventajas comerciales

1. **Todo conectado, no todo junto por casualidad.** La dispensa de farmacia descuenta de la misma consulta; el cobro de caja se liquida al profesional que atendió; el turno atendido abre la consulta lista — no son módulos aislados que alguien tiene que sincronizar a mano.
2. **El dueño de la mascota también gana.** El portal (sin instalar nada) es un diferencial que el cliente final nota y valora — mejora la percepción de la clínica frente a la competencia que sigue en papel.
3. **Pensado para el mostrador real.** Alta de paciente/dueño inline, calculadora de dosis con confirmación explícita, caja con auditoría automática: resuelve fricciones reales del día a día, no funcionalidades de catálogo.
4. **Escala con el equipo, no con el presupuesto.** Roles apilables y turnero con asignación por profesional sirven igual para un veterinario solo que para un equipo con recepción — sin módulos adicionales que vender por separado.
5. **Onboarding sin curva de aprendizaje larga.** Tutorial guiado por rol desde el primer login — el equipo no necesita una capacitación externa para empezar a usarlo.
6. **Sin licencias por puesto ni instalación.** Plataforma web, accesible desde cualquier navegador, con costo de infraestructura tendiente a cero.

---

## Un dato para la conversación de venta

El circuito clínico completo (consultas, vacunaciones, carnet, turnero, portal, farmacia con dispensa, caja con auditoría) está construido, probado y — en varios de estos flujos — verificado contra datos reales de uso, no sólo en ambiente de prueba. Lo que todavía no incluye es facturación electrónica (integración con ARCA/AFIP) ni notificaciones automáticas proactivas (hoy el contacto por vencimientos lo inicia el staff, no un envío automático) — ambas cosas están identificadas y fuera de alcance por decisión explícita, no por limitación técnica.

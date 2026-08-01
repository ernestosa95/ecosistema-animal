## Alcance del Desarrollo: Tropera (MVP)

---

### 1. Resumen Ejecutivo

**Tropera** es la solución de gestión ganadera dentro de un **ecosistema de soluciones de salud y gestión animal** (nombre paraguas a definir). Permite a los responsables y encargados administrar de forma centralizada los aspectos operativos del campo, abarcando desde el control de existencias y evolución de hacienda hasta el registro de eventos sanitarios y reproductivos clave. El sistema cuenta con una plataforma web para funciones extendidas y una aplicación móvil orientada al trabajo de campo con soporte **offline-first**.

Como parte del ecosistema, Tropera comparte con las demás soluciones (ej. **HCE Animal** — Historia Clínica Electrónica veterinaria) un **tronco común de datos** (usuarios, personas/dueños y animales). Esto permite que un mismo animal sea, a la vez, una cabeza de hacienda en Tropera y un paciente con historia clínica, habilitando el seguimiento individual sin duplicar información. El detalle de fases y arquitectura del conjunto vive en `Roadmap_Ecosistema.md`.

---

### 2. Arquitectura y Plataforma

* **Aplicación Web:** Interfaz principal para la gestión avanzada, consulta de informes y administración general del campo.
* **Aplicación Móvil:** Diseñada para uso en dispositivos móviles en entornos de campo.
* **Sincronización Offline:**
* Capacidad de operar y realizar registros sin conectividad a internet.
* **Sincronización automática** en segundo plano una vez que el dispositivo detecta conexión a la red.
* **Infraestructura compartida del ecosistema:** Tropera se apoya en el **backend propio** común (PostgreSQL self-hosted + API en NestJS, con autenticación y motor de sincronización propios), en reemplazo de un BaaS gestionado. Los datos de Tropera se organizan en el *schema* `tropera`, colgando del tronco común `core`. Ver `Roadmap_Ecosistema.md` para el detalle del stack.



---

### 3. Alcance Funcional del MVP

#### A. Gestión de Autenticación y Campos

* **Gestión de Usuarios:** Registro e inicio de sesión de usuario único (proyectando a futuro un esquema de trabajo colaborativo multi-rol).
* **Gestión de Campos:** Creación y administración de establecimientos agropecuarios.

#### B. Identificación y Control de Hacienda

* **Modelo Flexible:** Permite la gestión por lotes y cantidades totales por categoría, así como soporte para métodos de identificación combinados cuando se requiera.
* **Seguimiento individual (vía ecosistema):** Cuando se requiere trazabilidad de un animal en particular (ej. cría de animales de raza), el animal se registra en el tronco común `core` y puede vincularse a la **HCE Animal** para llevar su historia clínica individual, sin salir del ecosistema.
* **Categorías Base Incluidas:**
* Vacas
* Toros
* Terneros / Terneras
* Vaquillonas
* Novillos *(y equivalentes básicos de la cría/recría)*



#### C. Evolución y Movimientos de Stock

* **Registro de Variaciones:** Aumento o disminución de existencias respaldado con **metadata asociada** (fecha, motivo, observaciones, etc.).
* **Tipos de Movimientos:**
* Altas: Nacimientos, compras.
* Bajas: Ventas, muertes.
* Traslados: Movimientos internos entre potreros/lotes dentro del mismo campo o traslados hacia campos externos.



#### D. Eventos Sanitarios y Reproductivos

* **Registro de Fechas Clave:** Carga y seguimiento de eventos sanitarios fundamentales (ej. vacunaciones) y eventos reproductivos (ej. inicio y fecha de entoramiento).

#### E. Reportes e Informes

* **Panel de Resumen Básico:** Visualización clara de la cantidad total de hacienda agrupada por categorías en la interfaz web y móvil.

---

### 4. Próximas Fases (Fuera del MVP)

* Roles de usuario diferenciados (propietario, capataz) para trabajo colaborativo. *El rol veterinario y su operatoria clínica se abordan desde la solución HCE Animal del ecosistema.*
* Trazabilidad individual avanzada (caravanas electrónicas/RFID), apoyada en el `core` compartido para permitir el cruce con la HCE Animal.
* Reportes analíticos avanzados y proyecciones financieras o de engorde.
* Sistema de alertas automatizadas para recordatorios próximos de vacunación.

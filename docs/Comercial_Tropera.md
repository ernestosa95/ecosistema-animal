# 🐄 Tropera — Ficha comercial

> Documento de apoyo para estrategia comercial. Describe funcionalidades, ventajas y público objetivo desde el punto de vista de venta, basado en lo que la plataforma efectivamente hace hoy (no en funcionalidades planeadas). Complementa `Roadmap_Ecosistema.md` (estado técnico) e `Identidad_Visual_Tropera.pdf` (marca).

---

## Qué es

**Tropera** es el sistema de gestión ganadera del Ecosistema de Salud Animal: lleva el control de existencias, movimientos, sanidad y reproducción de un establecimiento (o varios) desde el celular o la computadora, con o sin señal.

No es una planilla de Excel ni un cuaderno de campo digitalizado: es un sistema pensado para que el dato se cargue una sola vez, en el momento en que ocurre, y quede disponible para todo el equipo — del capataz que carga un movimiento en el potrero al productor que mira el stock consolidado de sus tres campos desde la oficina.

---

## Público objetivo

| Perfil | Por qué le sirve |
|---|---|
| **Productor / dueño de establecimiento** | Ve el estado real de su hacienda sin llamar al capataz — stock consolidado de todos sus campos en una pantalla, con historial auditable de cada movimiento. |
| **Estancias y establecimientos con más de un campo** | El panel consolidado cruza existencias por establecimiento × categoría con totales, algo que a mano (Excel, cuadernos) es tedioso de mantener actualizado. |
| **Capataz / encargado de campo** | Carga altas, bajas y traslados desde el celular, incluso sin señal — se sincroniza solo cuando vuelve a tener conexión. |
| **Veterinario sanitarista de campo** | Registra vacunaciones, desparasitaciones, diagnósticos de preñez y evaluaciones andrológicas por animal o por lote, con retiro sanitario visible en la ficha del animal. |
| **Establecimientos con genética de valor / cabaña** | El seguimiento individual (caravana real o transitoria) permite trazabilidad por cabeza sin perder el conteo agregado del resto del rodeo — no hace falta identificar animal por animal si no lo necesitás. |

**No es para:** productores que sólo quieren un conteo de cabezas sin trazabilidad ni historial — para eso alcanza con una libreta. Tropera rinde cuando hay más de un campo, más de una persona operando, o necesidad real de auditar qué pasó con la hacienda.

---

## Funcionalidades

### Hacienda y stock
- Alta y administración de **establecimientos** (uno o varios por cuenta).
- **Existencias por categoría** (vaca, toro, ternero, ternera, vaquillona, novillo) — conteo agregado, sin necesidad de cargar animal por animal.
- **Panel consolidado**: matriz establecimiento × categoría con totales por fila y columna, para quien maneja más de un campo.

### Movimientos con trazabilidad
- **Altas** (nacimiento, compra), **bajas** (muerte, venta) y **traslados** entre establecimientos propios.
- Cada movimiento ajusta el stock automáticamente y queda en un **historial auditable** — nada se pierde ni se pisa.
- Una baja que dejaría stock negativo se **rechaza automáticamente**, protegiendo la integridad del dato.

### Sanidad y reproducción
- Eventos sanitarios: vacunación, desparasitación, tratamiento — a nivel de lote o de animal puntual.
- Eventos reproductivos: servicio (con referencia a toro/pajuela), diagnóstico de preñez (grilla de un toque: preñada / vacía / anestro), destete.
- **Retiro sanitario** con alerta visible en la ficha del animal, para no procesarlo antes de tiempo.
- **Evaluación andrológica** de toros (circunferencia escrotal + motilidad → apto/no apto calculado automáticamente).

### Seguimiento individual (modelo híbrido)
- Fichas por **caravana** (real o transitoria, para identificar en el momento y asignar la caravana definitiva después).
- **Potreros**: subdivisión del establecimiento, con reasignación rápida ("apartado") y alerta si el animal tiene un retiro sanitario vigente.
- **Muestreos** caravana-tubo para toros, con numeración correlativa sugerida automáticamente.
- Convive con los conteos agregados sin duplicar trabajo — se usa sólo donde aporta valor (reproductores, cabaña, lotes de valor).

### Productividad de campo
- **Plantillas 1-tap**: aplicar un combo de tareas (ej. "Vacuna + Antiparasitario + Pesaje") a un animal en un solo toque, sin cargar cada evento por separado.
- **Protocolos IATF**: aplicar un protocolo genera automáticamente las tareas programadas en las fechas correspondientes (día 0, 7, 9...), con agenda de pendientes.

### Offline real
- La app **móvil funciona sin conexión**: alta de movimientos y consulta de existencias en el momento, sincronización automática al recuperar señal — verificado en campo, no es una promesa.

### Panel de indicadores
- Resumen de movimientos del mes por tipo y existencias actuales, con detalle exportable (CSV / Excel / PDF).

---

## Ventajas comerciales

1. **Pensado para el campo, no adaptado al campo.** Identidad visual de alto contraste para uso bajo sol directo, interfaz simple para cargar datos con el celular en una mano y un animal en la otra.
2. **Offline de verdad.** La mayoría de las herramientas de gestión ganadera asumen conexión constante; Tropera no.
3. **Un solo dato, todo el equipo.** El capataz carga, el veterinario registra sanidad, el productor mira el consolidado — todos ven lo mismo, actualizado.
4. **Trazabilidad sin sobrecarga.** El modelo híbrido (agregado + individual) evita el falso dilema entre "cargar cada cabeza" y "no tener ningún historial".
5. **Sin licencias por PC ni instalación.** Es una plataforma web + app, con costo de infraestructura tendiente a cero — accesible para un establecimiento chico o mediano, no sólo para los grandes jugadores del agro-tech.
6. **Crece con la operación.** Un establecimiento chico puede arrancar sólo con existencias y movimientos; uno grande o una cabaña puede sumar seguimiento individual, protocolos y evaluación andrológica sin migrar de sistema.

---

## Un dato para la conversación de venta

Todo lo listado arriba está construido y probado — no es un plan a futuro. Lo único que todavía no está resuelto para producción es la infraestructura de despliegue en la nube (hoy corre en ambiente de desarrollo); el software en sí está completo y validado de punta a punta, incluido el circuito offline en un dispositivo real.

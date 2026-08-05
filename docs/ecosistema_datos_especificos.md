# 📋 Datos Específicos por Especie (Ecosistema de Salud Animal)

Este documento consolida los requerimientos de metadatos (JSONB) por tipo de animal para las aplicaciones del ecosistema. Estos datos complementan la información transversal del `core` (identificación, dueño, especie).

---

## 1. 🐓 Aves

### Identificación y Clasificación Zootécnica / Clínicas
* **Tipo de Producción / Propósito:** Producción de carne (Broiler / Parrillera), Producción de huevo (Postura comercial), Reproductoras, Traspatio / Granja familiar, Ornato / Exóticas, Cetrería / Rapaces.
* **Línea genética / Raza específica:** (Ej. *Ross 308, Cobb 500, Leghorn, Rhode Island Red, Gallina Mapuche/Araucana, Canario Roller, etc.*).
* **Sistema de Alojamiento / Manejo:** Galpón de ambiente controlado (Cercado/Intensivo), Pastoreo / Camperas (Free-range), Jaula en batería, Suelo con cama, Aviario libre.

### Datos Biométricos y Fisiológicos
* **Peso Vivo Actual:** Registrado en gramos o kilogramos. Crítico para el cálculo de dosis farmacológicas precisas.
* **Categoría Etaria / Estado Productivo:** Bebé / Recría (Pío / Pollito de 1 día), Inmaduro / Desarrollo (Pollo de reemplazo / Pollona), Adulto en postura, Adulto en muda, Macho reproductor.
* **Estado de Plumaje / Condición Corporal:** Escala específica o descriptor rápido (ej. *Muda activa, plumas quebradas, picaje/canibalismo visible*).

### Parámetros Sanitarios y de Bioseguridad
* **Plan de Vacunación Activo:** Registro de inmunizaciones clave (ej. *Newcastle, Bronquitis Infecciosa, Marek, Gumboro, Viruela aviar, Laringotraqueitis*).
* **Control Parasitario:** Fecha de última desparasitación interna (coccidios / nematodos) y tratamiento externo (ácaros rojos o piojillo).
* **Estado de Vuelo / Manejo Físico:** Indicador binario o descriptivo (Desportillado/Corte de alas, uñas recortadas, anillado cerrado/abierto con numeración).

---

## 2. 🐄 Bovinos

### Clasificación Zootécnica y Propósito
* **Orientación Productiva:** Cría, Recría / Invernada, Tambo / Producción Lechera, Cabaña / Genética, Doble Propósito.
* **Raza Predominante o Cruza:** (Ej. *Angus, Hereford, Braford, Brangus, Holando Argentino, Jersey, Criollo, Cruza industrial, etc.*).
* **Sistema de Producción / Manejo:** Past Gating / Pastoreo rotativo, Campo natural extensivo, Feedlot / Engorde a corral, Sistema mixto (pastoreo + suplementación).

### Datos Biométricos, Etarios y Productivos
* **Categoría Zootécnica Actual:** Vaca (con o sin cría), Vaca vieja / Descarte, Vaquillona (reposición / servicio), Toro, Novillo, Novillito, Ternero / Ternera (recorrido de lactancia / destete).
* **Peso Vivo Actual y Fecha de Registro:** Crítico para control de evolución de engorde y cálculo de dosificación.
* **Condición Corporal (CC):** Sistema del 1 al 9 (Bos taurus/indicus) o del 1 al 5.

### Parámetros Sanitarios y Reproductivos Específicos
* **Plan de Vacunación:** Inmunizaciones clave (ej. *Fiebre Aftosa, Carbunco / Mancha, Brucelosis, complejo respiratorio bovino / IBR-BVD, Leptospirosis*).
* **Estado Reproductivo (Hembras):** Vacía / Preñada (meses de gestación), En servicio (Entoramiento / IATF), Lactante, Inútil reproductiva.
* **Identificación de Trazabilidad Oficial:** RENSPA/Caravana, complementando al código legible con Luhn del `core`.

---

## 3. 🐕 Caninos

### Identificación y Perfil Zootécnico / Funcional
* **Propósito / Rol Principal:** Compañía / Mascota, Deporte / Agility, Trabajo (Policía / Rescate / Dto. Fitosanitario), Reproducción / Cabaña, Asistencia / Terapia.
* **Raza / Tipo Morfológico:** Raza pura (ej. *Border Collie, Ovejero Alemán*), Mestizo / Cruza (con descripción).
* **Tamaño / Categoría Morfológica (Adulto):** Toy (< 5 kg), Pequeño (5-10 kg), Mediano (10-25 kg), Grande (25-45 kg), Gigante (> 45 kg).

### Datos Biométricos, Fisiológicos y de Estilo de Vida
* **Peso Vivo Actual y Fecha:** Crítico para protocolos anestésicos o farmacológicos.
* **Entorno de Hábitat / Estilo de Vida:** Urbano / Departamento, Casa con parque / Patio cerrado, Rural / Campo abierto.
* **Estado Reproductivo:** Entero/a (No castrado/a), Castrado/a quirúrgicamente, Gestante, Lactante.

### Parámetros Sanitarios Específicos
* **Plan de Vacunación:** Inmunizaciones clave (ej. *Séxtuple / Óctuple, Antirrábica, Tos de las perreras, Leishmaniasis*).
* **Control Parasitario y Preventivos:** Última aplicación de ectoparasiticidas y endoparasiticidas.
* **Estado de Alergias / Sensibilidades:** Reacciones adversas previas a fármacos, anestésicos o alimentos (ej. *sensibilidad a ivermectina en razas collie*).

---

## 4. 🐐 Caprinos

### Clasificación Zootécnica y Propósito
* **Orientación Productiva:** Producción láctea (Tambo caprino), Producción cárnica (Cabritos / Carne), Producción de fibra (Cashemere / Mohair - Angora), Doble propósito, Ornato / Mascotas.
* **Raza Predominante o Cruza:** (Ej. *Saanen, Alpina, Toggenburg, Anglo-Nubian, Boer, Criolla, Angora, etc.*).
* **Sistema de Producción / Manejo:** Intensivo / Estabulado, Extensivo / Pastoreo libre en monte, Sistema semi-intensivo (mixto).

### Datos Biométricos, Etarios y Productivos
* **Categoría Zootécnica Actual:** Cabra (madre en servicio / lactancia), Macho reproductor (Chivato / Padrillo), Vaququillona / Cabritilla de reposición, Cabrito / Cabrita de recría o destete.
* **Peso Vivo Actual y Fecha de Registro:** Clave para control de ganancia de peso y cálculo de dosificaciones.
* **Condición Corporal (CC):** Sistema del 1 al 5.

### Parámetros Sanitarios y Reproductivos Específicos
* **Plan de Vacunación y Control Sanitario:** Inmunizaciones críticas (ej. *Mancha / Enterotoxemia, Queratoconjuntivitis, Rabia, Brucelosis caprina*).
* **Control Parasitario:** Tratamientos contra parásitos gastrointestinales (evaluados mediante FAMACHA) y externos (sarna, piojos).
* **Estado Reproductivo (Hembras):** Vacía, En servicio (empadre controlado o continuo), Gestante, Lactante.

---

## 5. 🐎 Equinos

### Identificación, Reseña y Propósito Funcional
* **Propósito / Disciplina Principal:** Deporte / Comprensión, Trabajo rural / Estancia, Reproducción / Cabaña, Paseo / Escuela, Recuperación / Retiro.
* **Raza Predominante / Tipo:** (Ej. *Criollo, Puro Sangre Inglés [PSI], Silla Argentino, Cuarto de Milla [QH], Percheron, Polo Argentino, Mestizo*).
* **Reseña Gráfica y Datos de Marca:** Pelaje, calzados, particularidades en cabeza, seña o hierro de marcación.

### Datos Biométricos, Fisiológicos y de Estado
* **Peso Vivo Estimado o Real:** Crítico para anestesia y dosificación de desparasitantes.
* **Alzada (Altura a la cruz):** Medida en centímetros o pulgadas.
* **Categoría Etaria y Estado Reproductivo:** Padrillo / Entero, Yegua madre (vacía, gestante, lactante), Criptorquídeo, Caballo castrado, Potrillo / Potranca.

### Parámetros Sanitarios Específicos
* **Plan de Vacunación:** Inmunizaciones críticas (ej. *Encefalomielitis Equina, Influenza Equina, Tétanos, Rabia, Adenitis equina*).
* **Control Parasitario y Odontológico:** Coprologías, desparasitaciones, revisión y nivelación odontológica.
* **Historial Podal / Herraje:** Frecuencia de atención del herrador, tipo de herraje (plano, correctivo, ortopédico, descalzo).

---

## 6. 🐑 Ovinos

### Clasificación Zootécnica y Propósito
* **Orientación Productiva:** Producción de carne, Producción de lana, Producción lechera, Doble propósito, Cabaña / Genética.
* **Raza Predominante o Cruza:** (Ej. *Corriedale, Merino, Texel, Hampshire Down, Dorper, Romney Marsh, Ideal, etc.*).
* **Sistema de Producción / Manejo:** Pastoreo extensivo, Pastoreo intensivo en pasturas, Sistema mixto / Estabulación parcial.

### Datos Biométricos, Etarios y Productivos
* **Categoría Zootécnica Actual:** Oveja / Madre (con o sin cría), Carnero / Padrillo, Borrega, Capón (castrado), Cordero / Cordera de destete o recría.
* **Peso Vivo Actual y Fecha de Registro:** Esencial para control de evolución de engorde y dosificaciones antiparasitarias.
* **Condición Corporal (CC):** Sistema del 1 al 5.

### Parámetros Sanitarios y Reproductivos Específicos
* **Plan de Vacunación:** Inmunizaciones críticas (ej. *Clostridiosis, Mancha/Gangrena, Queratoconjuntivitis, Complejo respiratorio*).
* **Control Parasitario:** Tratamientos y uso del método FAMACHA, control de sarna ovina, melófagos y piojos.
* **Estado Reproductivo (Hembras):** Vacía, En servicio, Gestante, Lactante.

---

## 7. 🐖 Porcinos

### Clasificación Zootécnica y Propósito
* **Orientación Productiva:** Ciclo completo, Cría / Producción de lechones, Recría / Engorde, Cabaña / Núcleo genético, Producción a campo / Alternativa.
* **Línea Genética o Cruza:** (Ej. *Landrace, Large White / Yorkshire, Duroc, Pietrain, Híbridos comerciales*).
* **Sistema de Alojamiento y Manejo:** Confinamiento estricto, Sistema de parideras a campo, Sistema semi-confinado.

### Datos Biométricos, Etarios y Productivos
* **Categoría Zootécnica Actual:** Cerdas reproductoras, Verrajos / Padrillos, Cerdas de reposición, Lechones lactantes, Cachorros en recría, Cerdos en terminación / Engorde.
* **Peso Vivo Actual y Fecha de Registro:** Clave para monitoreo de conversión alimenticia y dosificaciones farmacológicas.
* **Condición Corporal (CC):** Sistema visual y táctil del 1 al 5.

### Parámetros Sanitarios y Reproductivos Específicos
* **Plan de Vacunación y Bioseguridad:** Inmunizaciones clave (ej. *Parvovirus porcino y Leptospirosis, Neumonía Enzoótica, Circovirus porcino, PRRS, Erisipela*).
* **Control Parasitario:** Tratamientos contra parásitos internos y externos (sarna sarcóptica).
* **Parámetros Reproductivos:** Número de parto actual, tamaño de camada nacida viva / momificados / nacidos muertos, y fecha estimada del próximo parto o destete.

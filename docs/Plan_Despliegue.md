# 🚀 Plan de despliegue — Ecosistema de Salud Animal

**Fecha:** 2026-09-03, revisado 2026-09-05 (arquitectura pasada a Docker — ver nota abajo), 2026-09-10 (compra de la VPS confirmada para el **sábado 12/09**) y 2026-09-13 (**deploy ejecutado de punta a punta** — ver la sección 0). Estado: **en producción** — `https://app.huella.site` / `https://api.huella.site`, IP `149.34.225.152`, DonWeb Cloud Server (4 vCPU/8GB/30GB, Ubuntu 24.04). F0.1 del Roadmap pasa de ⏳ a ✅. Dominio verificado en Resend el mismo día. Pendiente antes de invitar una clínica real: error tracking y correr `Protocolo_Pruebas.md` — ver el detalle al final de la sección 0.

> Este documento asume una **VPS paga** contratada por el usuario (self-hosted, no un PaaS tipo Railway/Render). Se descartó la idea original del Roadmap de una VM de Oracle Cloud Always Free — ver la sección de recursos más abajo para por qué.

> **Revisión 2026-09-05**: la primera versión de este plan asumía Node/Postgres/Caddy/PM2 instalados directo en el sistema operativo ("bare-metal"). Se pasó a **Docker** porque esta VPS probablemente conviva con otros proyectos/ecosistemas del usuario a futuro — con procesos bare-metal, dos proyectos compitiendo por el mismo puerto, la misma instancia de Postgres o versiones de Node distintas es un problema real; con contenedores, cada proyecto queda aislado y un problema en uno no afecta a los demás. Todo el resto de las decisiones del plan original (Caddy para HTTPS automático, DonWeb como proveedor, los recursos recomendados, el checklist de endurecimiento, los backups) sigue en pie — sólo cambia el "cómo" se corre cada pieza.

> **Revisión 2026-09-10**: la VPS elegida (DonWeb Cloud Server, 4 vCPU / 8GB RAM / 30GB SSD, 12 meses, dominio gratis incluido) es exactamente la recomendada en la sección 2 — se compra el sábado 12/09. Se agregó la sección 0 con el cronograma concreto de esa compra y se re-verificaron las migraciones (ahora 35, `0000`–`0034`) contra un Postgres 16 limpio.

---

## 0. Cronograma de este despliegue — ejecutado el 13/09

Se corrió un día más tarde de lo planeado (domingo 13/09 en vez del sábado 12/09), sin cambios de fondo respecto al plan.

- [x] **Commiteado y pusheado a `main`.** Todo lo que vivía sin commitear en `feat/turnero-web-y-datos-especie` (rediseño de marca, costo de vacunación, portal por DNI+código, feedback en mensajes, captura de interesados, plantillas de Instagram) se separó en 6 commits temáticos, se corrieron las 19 suites `test:*-demo` + `tsc --noEmit` + `vite build` (todo verde), se pusheó la rama y se mergeó (fast-forward) a `main`. El deploy clonó `main`, no la rama feature.
- [x] **Migraciones verificadas**: las 37 (`0000`–`0037`) corrieron sin error contra el Postgres 16 real de producción.
- [x] **Dominio elegido: el gratis de DonWeb, `huella.site`** — no el `.com.ar` que sugiere la nota de abajo. Decisión consciente por rapidez el día del deploy; sigue siendo válido migrar a un `.com.ar` más adelante sin tocar nada de la arquitectura (sólo DNS + variables de entorno + rebuild de la imagen `web`).
- [x] Cuenta de Resend, dominio `huella.site` verificado (DKIM+SPF+DMARC vía DonWeb, ~12 min de propagación) y `RESEND_API_KEY`/`MAIL_FROM` cargados en producción — mismo día del deploy, más tarde. Los emails transaccionales ya se envían de verdad.
- [ ] Cuenta de Sentry / error tracking — no se creó.

**Ejecución real (13/09):**
1. VPS comprada (DonWeb Cloud Server, 4 vCPU/8GB/30GB, Ubuntu 24.04, IP `149.34.225.152`) y dominio gratis `huella.site` activado y delegado a los NS de DonWeb.
2. DNS: registros A de `app.huella.site` y `api.huella.site` → `149.34.225.152`, ya resolviendo (propagación fue rápida, sin la espera de 1-4hs anunciada).
3. Secciones 3 a 7 completas: usuario `deploy` (SSH sólo por clave, root/password deshabilitados, `ufw` + `fail2ban`), Docker + red `edge` + Caddy compartido, repo clonado desde `main`, `.env` de raíz y de `apps/backend/.env` armados, `docker compose build && up -d`, migraciones + los 4 seeds corridos.
4. Confirmado: `https://app.huella.site` y `https://api.huella.site/health` responden con HTTPS válido (Let's Encrypt vía `caddy-docker-proxy`).
5. Primera cuenta creada a mano contra `POST /auth/register` (endpoint todavía activo aunque la web ya no lo llame) — necesaria para poder loguear siquiera una vez, ya que `SuperAdminGuard` sólo chequea el email de un usuario ya autenticado, no reemplaza tener una cuenta.
6. Backups: script + cron diario (sección 9) **probados con un restore real** contra un Postgres descartable — 48 tablas, conteos de especies/usuarios/vademécum verificados iguales.

**Pendiente, antes de mandarle el link a una clínica real:**
- [x] Verificar el dominio en Resend (sección 8) — hecho el mismo 13/09, más tarde en el día.
- [ ] Backups fuera de la VPS (hoy sólo protegen contra "borré algo", no "se rompió el disco").
- [ ] Bloques 0/1/8 de `Protocolo_Pruebas.md` contra `https://app.huella.site` real.
- [ ] `eas.json`/`app.json` de mobile ya están listos (package `com.huella.app`, perfil `preview` → APK) — falta correr el build en sí con una cuenta de Expo.

**Nota sobre el dominio gratis (vigente, no se aplicó hoy)**: DonWeb ofrece `.ONLINE`, `.SITE`, `.WEBSITE` o `.UNO` gratis al comprar 12 meses. Ninguno transmite la misma confianza que un `.com`/`.com.ar` frente a una veterinaria evaluando pagar por un software — encaja raro con que "confiable" sea uno de los cinco rasgos de personalidad de la marca (Ficha de Marca, `docs/Kit_Marca_Huella.html`). Sigue siendo válido registrar aparte un `.com.ar` (por NIC.ar) para `app.`/`api.` más adelante — es una decisión de marca a revisar, no de infraestructura, y no bloquea nada técnico mientras tanto.

---

## 1. Resumen de la arquitectura recomendada

Todo en **una sola VPS** (no hace falta separar backend/DB/frontend en máquinas distintas a esta escala), pero cada pieza corre en su propio contenedor Docker en vez de instalada directo en el sistema:

```
                              Internet
                                 │
              ┌──────────────────────────────────────┐
              │   Stack "edge" (uno solo para TODA    │
              │   la VPS, compartido entre proyectos) │
              │                                        │
              │   Caddy + caddy-docker-proxy           │
              │   :80/:443, HTTPS automático,          │
              │   rutea por labels de Docker           │
              └──────────────────┬─────────────────────┘
                                 │  red "edge" (Docker network externa,
                                 │  compartida por todos los proyectos)
              ┌──────────────────┴──────────────────────┐
              │         docker-compose de ESTE           │
              │         proyecto (ecosistema-animal)      │
              │                                            │
      app.tudominio.com                            api.tudominio.com
      (contenedor "web": Caddy                  (contenedor "backend": NestJS,
       sirviendo apps/web/dist,                   imagen propia por Dockerfile)
       ya baked-in en el build)                            │
                                                    (red interna del proyecto,
                                                     NO conectada a "edge")
                                                             │
                                                     Postgres (contenedor propio
                                                      de este proyecto, no
                                                      compartido con otros)
                                                             │
                                                     volumen `uploads` (fotos,
                                                      volumen nombrado de Docker,
                                                      sobrevive a un rebuild)
```

**Por qué Docker y no bare-metal**: esta VPS va a alojar más de un proyecto con el tiempo. Sin contenedores, dos proyectos terminan peleándose por el mismo puerto 3000, la misma versión de Node instalada globalmente, o (peor) la misma instancia de Postgres — un cambio de configuración o un upgrade para un proyecto puede romper silenciosamente al otro. Con un contenedor por servicio, cada proyecto vive en su propia burbuja: se puede parar, actualizar o borrar sin tocar nada del resto de la VPS.

**Por qué un Caddy "edge" compartido con `caddy-docker-proxy`, y no un Caddy por proyecto**: HTTPS/Let's Encrypt sólo puede escuchar los puertos 80/443 una vez por servidor — si cada proyecto trajera su propio Caddy, sólo uno podría bindear esos puertos. La solución estándar es **un único** stack de Caddy para toda la VPS, corriendo el plugin [`caddy-docker-proxy`](https://github.com/lucaslorentz/caddy-docker-proxy): lee los *labels* de Docker de cualquier contenedor conectado a una red compartida (`edge`) y arma su config de reverse-proxy + certificados automáticamente, sin tocar un `Caddyfile` a mano cada vez que se agrega un proyecto nuevo. Se eligió por sobre Traefik para no sumar una herramienta nueva — el plan original ya había elegido Caddy por su HTTPS automático con configuración mínima, y ese razonamiento sigue siendo válido acá.

**Por qué un Postgres propio por proyecto, y no una instancia compartida con una base por proyecto**: aislamiento total. Un upgrade de versión de Postgres, un cambio de configuración/extensión, o un backup/restore de un proyecto nunca pueden afectar a otro — cada uno vive y muere con su propio contenedor y su propio volumen. El costo (algo de RAM extra por cada instancia de Postgres corriendo, aun en reposo) es aceptable a cambio de esa garantía en una VPS pensada para alojar varios proyectos no relacionados entre sí.

**Por qué dos subdominios (`app.` / `api.`) y no un solo dominio con rutas** (sin cambios respecto al plan original): `VITE_API_URL` (el cliente web) y `PORTAL_BASE_URL`/`BACKEND_PUBLIC_URL` (el backend) están pensados como **orígenes absolutos**, no rutas relativas — todo el código ya asume que el front y el back pueden vivir en dominios distintos (así funciona hoy en dev: `localhost:5173` hablando con `localhost:3000`). `/admin`, `/c/:codigo` y `?token=`/`?resetToken=` siguen siendo rutas *dentro* del mismo SPA (`app.tudominio.com`), no subdominios aparte — son ruteo 100% del lado del cliente (`main.tsx`), no necesitan nada especial del servidor.

---

## 2. Recursos de VPS recomendados

| Recurso | Recomendación | Por qué |
|---|---|---|
| **vCPU** | 2 (más si se planea alojar varios proyectos a la vez) | NestJS es single-threaded por proceso (un vCPU le alcanza de sobra en operación normal), pero el build de las imágenes Docker (que compila backend y web dentro del propio build, ver sección 5) se beneficia de un segundo núcleo — con 1 vCPU un deploy se siente notablemente más lento, no imposible. |
| **RAM** | 4 GB por proyecto activo, como piso | Postgres se beneficia de RAM para cache de páginas incluso a esta escala chica; el momento más pesado no es "servir tráfico" sino el propio **build** de las imágenes. Docker en sí agrega poco overhead — el costo real de "varios proyectos en la misma VPS" es la suma de sus propios Postgres + backend, no Docker de por sí. |
| **Disco** | 60–80 GB SSD por proyecto, más margen si van a convivir varios | Postgres + volumen `uploads` (fotos ya comprimidas a ~15-50KB cada una) + logs + las imágenes Docker construidas + margen para backups locales antes de subirlos afuera. NVMe/SSD importa más que el tamaño total para que Postgres responda bien. |
| **Transferencia** | Cualquier plan estándar (1–2TB/mes) | La app es texto (JSON) + PDFs generados on-demand + fotos chicas — tráfico bajo comparado con lo que casi cualquier proveedor incluye de base. |
| **SO** | Ubuntu 24.04 LTS (o 22.04) | Soporte largo, es lo que más documentación tiene para Docker si algo falla. |

**Sobre el proveedor — el factor que sí importa acá es la región/latencia, no sólo el precio:** las clínicas que van a usar esto están en Argentina. Un datacenter en Europa o en la costa este/oeste de EE.UU. agrega ~150-250ms de latencia de ida y vuelta a cada llamado a la API.

**Proveedor elegido: DonWeb** (Cloud Server, plan 4 vCPU / 8GB RAM) — confirmado contra su sitio (2026-09-03):
- Datacenter **en Argentina** (4 datacenters propios) — mejor latencia posible para este caso de uso.
- Permite elegir **Ubuntu con acceso SSH root** — sólo hace falta instalar Docker encima, todo lo demás (Postgres/Node/Caddy) queda dentro de contenedores.
- 1 TB de transferencia + 300 Mb/s dedicados y simétricos incluidos — de sobra para esta app.
- **Backup automático semanal + hasta 2 snapshots sin cargo** incluidos de fábrica, con backups diarios pagos como opción — complementa, no reemplaza, el `pg_dump` lógico de la sección 9 (ver esa sección para la distinción).
- 4 vCPU / 8GB es más que el piso recomendado por proyecto — da margen para que convivan un par de proyectos chicos sin pensar en upgrade por bastante tiempo.

Alternativas si en algún momento DonWeb no encaja: Vultr o AWS Lightsail (región São Paulo) o Hetzner Cloud (mejor relación precio/recursos, sin región LatAm).

---

## 3. Preparación del servidor (una sola vez para toda la VPS)

Con Docker, el servidor en sí necesita mucho menos instalado — ni Node, ni pnpm, ni Postgres, ni Caddy van directo al sistema operativo, todo vive en contenedores.

```bash
# Como root o con sudo, recién provisionada la VPS:
apt update && apt upgrade -y

# Usuario sin privilegios para correr la app (no correr Docker/deploys como root
# — igual necesita estar en el grupo `docker` para poder usarlo sin sudo)
adduser deploy
usermod -aG sudo deploy
# Copiar tu clave SSH pública a /home/deploy/.ssh/authorized_keys antes de deshabilitar
# el login por password — si no, quedás afuera del servidor.

# Firewall: sólo SSH, HTTP, HTTPS expuestos. Nada de Postgres/backend expuesto
# directo — ni siquiera hace falta abrirles puerto, porque sus contenedores
# no publican ningún puerto al host (ver docker-compose.yml más abajo), sólo
# son alcanzables entre contenedores de la misma red Docker.
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# Docker Engine + plugin de Compose (repo oficial de Docker, no el paquete de apt
# que suele venir desactualizado)
curl -fsSL https://get.docker.com | sh
usermod -aG docker deploy
# (cerrar y volver a abrir la sesión de `deploy` para que el grupo tome efecto)

# Red compartida para el reverse-proxy "edge" — se crea UNA sola vez para toda
# la VPS, no por proyecto. Cada proyecto que necesite quedar expuesto por
# dominio conecta sus contenedores públicos (backend, web) a esta red.
docker network create edge
```

**Hardening mínimo de SSH** (`/etc/ssh/sshd_config`, después de confirmar que tu clave pública ya funciona):
```
PasswordAuthentication no
PermitRootLogin no
```
`systemctl restart ssh` después de editar. Opcional pero recomendable: `apt install fail2ban`.

### El stack "edge" (Caddy + caddy-docker-proxy) — una sola vez para toda la VPS

`/home/deploy/edge/docker-compose.yml`:
```yaml
services:
  caddy:
    image: lucaslorentz/caddy-docker-proxy:2.9-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    environment:
      - CADDY_INGRESS_NETWORKS=edge
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - caddy_data:/data
    networks:
      - edge

networks:
  edge:
    external: true

volumes:
  caddy_data:
```
```bash
cd /home/deploy/edge && docker compose up -d
```
Este stack no se toca por proyecto — se levanta una vez y queda corriendo indefinidamente. Cada proyecto nuevo (incluido este) sólo necesita conectar sus contenedores públicos a la red `edge` y ponerles los labels correctos (ver sección 7) para que Caddy los descubra solo.

---

## 4. Base de datos (contenedor propio de este proyecto)

No hay paso manual de "crear la base" — el propio contenedor de Postgres la crea la primera vez que arranca, a partir de variables de entorno. Ver el `docker-compose.yml` de la sección 5 (servicio `postgres`).

**Importante — dentro de Docker, el hostname NO es `localhost`.** El backend de este proyecto habla con Postgres usando el **nombre del servicio** en `docker-compose.yml` (`postgres`), no `localhost` — `localhost` dentro de un contenedor apunta al contenedor mismo, no a otro contenedor de la misma red. `DATABASE_URL` para `apps/backend/.env` en producción:
```
postgres://ecosistema_app:elegí-algo-largo-y-random-acá@postgres:5432/ecosistema
```

El puerto 5432 del contenedor de Postgres **no se publica** al host (no hay `ports:` en su definición del compose) — sólo es alcanzable desde el contenedor del backend, en la misma red interna del proyecto. Ni siquiera hace falta el firewall para esto, ya no está expuesto en absoluto.

---

## 5. Clonar, configurar y levantar la app

```bash
# Como el usuario `deploy`:
cd /home/deploy
git clone <tu-repo> ecosistema
cd ecosistema
```

**`.env`** en la raíz del repo (variables que sólo usa `docker-compose.yml`, distinto de `apps/backend/.env`):
```bash
POSTGRES_PASSWORD=elegí-algo-largo-y-random-acá
```

**`apps/backend/.env`** (copiar de `apps/backend/.env.example` y completar):
```bash
PORT=3000
DATABASE_DRIVER=node-postgres
DATABASE_URL=postgres://ecosistema_app:<mismo-password-de-arriba>@postgres:5432/ecosistema
JWT_SECRET=<generar uno nuevo, NUNCA reusar el de dev — ver sección 8>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
SUPERADMIN_EMAILS=tu-email-real@dominio.com
PORTAL_URL=https://app.tudominio.com
PORTAL_BASE_URL=https://app.tudominio.com
BACKEND_PUBLIC_URL=https://api.tudominio.com
RESEND_API_KEY=<tu API key real de Resend, con el dominio verificado — ver sección 8>
MAIL_FROM=Huella <no-reply@tudominio.com>
```

**`docker-compose.yml`** (raíz del repo):
```yaml
services:
  backend:
    build:
      context: .
      dockerfile: apps/backend/Dockerfile
    env_file: apps/backend/.env
    restart: unless-stopped
    volumes:
      - uploads:/app/apps/backend/uploads
    networks:
      - default
      - edge
    labels:
      caddy: api.tudominio.com
      caddy.reverse_proxy: "{{upstreams 3000}}"
    depends_on:
      - postgres

  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: ecosistema
      POSTGRES_USER: ecosistema_app
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - default   # sin `edge` — nunca alcanzable desde afuera del proyecto

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
      args:
        VITE_API_URL: https://api.tudominio.com
    restart: unless-stopped
    networks:
      - default
      - edge
    labels:
      caddy: app.tudominio.com
      caddy.reverse_proxy: "{{upstreams 80}}"

networks:
  default:
  edge:
    external: true

volumes:
  pgdata:
  uploads:
```

**`apps/backend/Dockerfile`** (nuevo):
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN corepack enable && pnpm install --frozen-lockfile
RUN pnpm --filter backend build

FROM node:20-alpine
WORKDIR /app
# Se copia el node_modules del monorepo entero (pnpm lo hoistea a la raíz),
# no un subset "sólo backend en prod" — más grande de lo estrictamente
# necesario, pero evita tener que resolver a mano qué dependencias hoisted
# hacen falta en runtime (drizzle-kit incluido: es una devDependency pero
# hace falta *dentro del contenedor* para correr `db:migrate`/`db:generate`
# en producción). Para un solo operador sin equipo de infra dedicado, una
# imagen más pesada es un costo aceptable a cambio de que "un comando
# siempre funciona" en vez de depurar un recorte de dependencias que rompe
# algo en el peor momento.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend ./apps/backend
COPY --from=builder /app/db ./db
WORKDIR /app/apps/backend
EXPOSE 3000
CMD ["node", "dist/src/main.js"]
```

**`apps/web/Dockerfile`** (nuevo) — el build de Vite queda horneado adentro de la imagen, no hay ningún paso de build separado en el host:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN corepack enable && pnpm install --frozen-lockfile
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm --filter web build

FROM caddy:2-alpine
COPY --from=builder /app/apps/web/dist /srv
COPY apps/web/Caddyfile.prod /etc/caddy/Caddyfile
```
**`apps/web/Caddyfile.prod`** (nuevo, sólo sirve archivos estáticos dentro del contenedor — el HTTPS/dominio lo maneja el Caddy "edge" de la sección 3, este es el `file_server` interno):
```
:80
root * /srv
file_server
try_files {path} /index.html
```

Recordatorio del plan original, sigue aplicando: `VITE_API_URL` queda **horneado en el bundle** al momento del build de la imagen (es un `ARG` de Docker, no una variable de entorno de runtime) — cambiarlo implica reconstruir la imagen `web`, no alcanza con reiniciar el contenedor.

```bash
# Levantar todo (construye las imágenes la primera vez, o cuando cambió el código):
docker compose build
docker compose up -d

# Migraciones + seeds, corridos DENTRO del contenedor del backend ya levantado:
docker compose exec backend pnpm --filter backend db:migrate
docker compose exec backend pnpm --filter backend db:seed              # especies base — obligatorio
docker compose exec backend pnpm --filter backend db:seed:vacunas      # catálogo de vacunas por especie (sugerencias)
docker compose exec backend pnpm --filter backend db:seed:diagnosticos # catálogo de diagnósticos por especie (sugerencias)
docker compose exec backend pnpm --filter backend db:seed:vademecum    # vademécum SENASA (7003 productos, sugerencias de Farmacia)
```

Los tres últimos son opcionales en el sentido de que nada rompe si no corren — son sólo
catálogos de referencia para autocompletar (ver `hce/catalogo-vacunas/`,
`hce/catalogo-diagnosticos/`, `farmacia/vademecum-senasa/`) — pero sin ellos esas búsquedas con
sugerencias quedan vacías en silencio, sin ningún error visible. Re-verificado el 2026-09-10
corriendo las 35 migraciones (`0000`–`0034`) + el seed de especies contra un Postgres 16 real
desde cero (mismo escenario que un primer deploy) — 45 tablas resultantes en los 9 schemas del
proyecto, especies sembradas sin error.

---

## 6. Operación del día a día

```bash
docker compose ps                    # ver que los 3 servicios estén "Up"
docker compose logs -f backend       # logs en vivo del backend
docker compose logs -f postgres      # logs de Postgres
docker compose restart backend       # tras un deploy nuevo (ver sección 12)
```
`restart: unless-stopped` en cada servicio (ya en el compose de arriba) hace que Docker los reinicie solo si la VPS se reinicia o un contenedor se cae — equivalente al `pm2 startup`/`pm2 save` del plan original, sin nada que configurar aparte.

---

## 7. Cómo Caddy descubre este proyecto (labels, no `Caddyfile`)

El Caddy "edge" (sección 3) no tiene ningún `Caddyfile` con las rutas de este proyecto escritas a mano — las lee de los `labels` de Docker que ya están en el `docker-compose.yml` de la sección 5:
```yaml
labels:
  caddy: api.tudominio.com
  caddy.reverse_proxy: "{{upstreams 3000}}"
```
En cuanto `docker compose up -d` levanta el contenedor con esos labels conectado a la red `edge`, `caddy-docker-proxy` lo detecta solo y empieza a rutear `api.tudominio.com` hacia él — pide el certificado de Let's Encrypt automáticamente la primera vez (necesita que el DNS de `app.`/`api.tudominio.com` ya apunte a la IP de la VPS antes de este paso) y lo renueva solo. Agregar un proyecto nuevo a la misma VPS más adelante es exactamente este mismo patrón: su propio `docker-compose.yml`, conectado a la misma red `edge`, con sus propios labels — nunca hace falta tocar el stack de Caddy en sí.

---

## 8. Endurecer antes de abrir a usuarios reales

Nada de esto bloquea un primer deploy de prueba, pero **sí antes de dar el link a una clínica real**:

- [x] **`JWT_SECRET` nuevo y random** — generado con `openssl rand -hex 32` al armar el `.env` de producción (2026-09-13), nunca el valor de dev.
- [x] **`SUPERADMIN_EMAILS`** con el email real (`ridelernesto@gmail.com`), no uno de prueba.
- [x] **CORS** — resuelto (2026-09-05, commit `bfd10aeb`): `main.ts` ahora lee `CORS_ORIGIN` de env (`app.enableCors(corsOrigin ? { origin: corsOrigin.split(',').map(o => o.trim()) } : undefined)`); sin la variable, sigue abierto a cualquier origen (dev local). Sólo falta **cargar la variable en el `.env` de prod** con el dominio real (`CORS_ORIGIN=https://app.tudominio.com`, separado por coma si hace falta más de un origen).
- [x] **Rate-limiting en los endpoints de auth** — resuelto (2026-09-05, mismo commit): `/auth/login`, `/auth/forgot-password`, `/auth/reset-password` (y desde esa misma sesión, `/solicitudes/verificar-email` y su `/confirmar`) tienen `@Throttle` a 5 intentos / 15 min por IP, sobre el límite global de 100/min de toda la API.
- [x] **Dominio propio verificado en Resend** (2026-09-13): `huella.site` con DKIM/SPF/DMARC agregados en DonWeb, verificado en ~12 minutos. `MAIL_FROM=Huella <no-reply@huella.site>` en el `.env` de producción — "olvidé mi contraseña" y los mails de `interesados/` ya entregan de verdad, no sólo a la cuenta de Resend.
- [x] **`GET /health`** — resuelto (2026-09-05, mismo commit): sin guards, confirma que el proceso responde y que la conexión a Postgres está viva (`SELECT 1`), pensado para el `healthcheck:` de Docker Compose o un servicio de uptime externo (sección 10).
- [ ] **Error tracking** (Sentry o similar) — hoy no hay ninguno; un error en producción sólo se nota si el usuario se queja o alguien mira los logs a mano.
- [x] **`BACKEND_PUBLIC_URL`** correcto (`https://api.huella.site`) desde el primer deploy (2026-09-13) — configurado antes de que nadie subiera ninguna foto real.
- [x] **Backups** (sección 9) funcionando y **probados** (2026-09-13): cron diario + restore real contra un Postgres descartable, 48 tablas y conteos verificados. Sigue pendiente sumar una copia *fuera* de la VPS (hoy sólo protege contra "borré algo", no "se rompió el disco").
- [ ] **Build de mobile para testers reales.** `app.json`/`eas.json` ya están listos (2026-09-13: package `com.huella.app` en vez del placeholder `com.anonymous.mobile`, perfil `preview` con `buildType: apk` para EAS Build) — falta crear la cuenta de Expo y correr el build en sí. Si el testeo inicial es sólo vía web, este punto puede esperar.

---

## 9. Backups

Dos cosas para respaldar: la base (el volumen `pgdata` del contenedor Postgres) y los archivos subidos (el volumen `uploads` del contenedor backend). Ambos comandos corren *contra los contenedores*, no contra el sistema operativo — no hay Postgres ni carpeta `uploads/` sueltos en el host.

```bash
# /home/deploy/backup.sh
#!/usr/bin/env bash
set -e
cd /home/deploy/ecosistema
FECHA=$(date +%Y-%m-%d)
DESTINO=/home/deploy/backups
mkdir -p "$DESTINO"

# pg_dump corrido DENTRO del contenedor de Postgres de este proyecto
docker compose exec -T postgres pg_dump -U ecosistema_app ecosistema | gzip > "$DESTINO/db-$FECHA.sql.gz"

# El volumen `uploads` no es una carpeta del host — se lee montándolo en un
# contenedor descartable sólo para el tar.
docker run --rm -v ecosistema_uploads:/data -v "$DESTINO":/backup alpine \
  tar czf "/backup/uploads-$FECHA.tar.gz" -C /data .

# Conservar sólo los últimos 14 días localmente
find "$DESTINO" -type f -mtime +14 -delete
```
```bash
chmod +x /home/deploy/backup.sh
crontab -e
# 0 3 * * *  /home/deploy/backup.sh
```
Ajustar `ecosistema_uploads` al nombre real del volumen que Docker Compose termina creando (`docker volume ls` lo confirma — suele ser `<nombre-de-la-carpeta-del-proyecto>_uploads`).

**Importante:** esto backupea *al mismo disco* de la VPS — protege contra "borré algo por error", no contra "se rompió el disco/la VPS entera". En cuanto el proyecto tenga usuarios reales pagando, sumar un paso que copie `$DESTINO` afuera de la VPS (Backblaze B2, `rclone`, etc.).

**Si el proveedor es DonWeb**: activar igual el backup automático semanal + los 2 snapshots gratis del Cloud Server (nivel infraestructura, foto del disco completo, incluye los volúmenes Docker) — complementa, no reemplaza, el `pg_dump` de arriba.

---

## 10. Monitoreo básico

No hace falta nada elaborado al arrancar. Lo mínimo que vale la pena:

- Un servicio de uptime gratuito (ej. UptimeRobot) pegándole cada 5 minutos a `https://api.tudominio.com/health` (una vez que exista, ver sección 8) y a `https://app.tudominio.com`.
- `docker compose logs -f backend` (o `docker compose logs -f postgres`) como primer lugar para mirar si algo falla — reemplaza a `pm2 logs` del plan bare-metal.
- Un `healthcheck:` en el servicio `backend` del `docker-compose.yml` (una vez que exista `GET /health`) deja que el propio Docker marque el contenedor como `unhealthy` en vez de sólo "corriendo pero roto" — más preciso que sólo mirar `docker compose ps`.
- Revisar `df -h` de vez en cuando (espacio en disco) — con backups locales acumulándose (sección 9) e imágenes Docker viejas (`docker image prune` de tanto en tanto) es lo primero que se llena si nadie mira.

---

## 11. Checklist de deploy (primera vez, resumen ejecutable)

Ejecutado el 2026-09-13 contra `huella.site` / `149.34.225.152`. Lo que sigue es el registro de qué se hizo — útil como plantilla si se repite este proceso para otro proyecto en la misma VPS.

1. [x] Contratar la VPS (DonWeb, 4 vCPU/8GB/30GB, Ubuntu 24.04).
2. [x] DNS: `app.huella.site` y `api.huella.site` apuntando a la IP de la VPS.
3. [x] Sección 3: usuario `deploy`, firewall (`ufw` + firewall de red de DonWeb), Docker instalado, red `edge` creada, stack de Caddy "edge" levantado, `fail2ban` activo.
4. [x] Sección 5: repo clonado desde `main`, `.env` de raíz + `apps/backend/.env` armados, `docker compose build` + `up -d`, `db:migrate` + los 4 `db:seed*` corridos dentro del contenedor.
5. [x] Sección 7: Caddy detectó los labels, ambos dominios responden por HTTPS con certificado de Let's Encrypt.
6. [ ] Sección 8: checklist de endurecimiento — todo cerrado salvo error tracking y el build de mobile (JWT, SUPERADMIN_EMAILS, CORS, rate-limiting, health-check, BACKEND_PUBLIC_URL, backup probado y **Resend verificado**, los cuatro últimos el mismo 13/09).
7. [x] Sección 9: cron de backup corriendo, restore probado a mano contra un Postgres descartable.
8. [x] Entrar a `https://app.huella.site/admin` con `ridelernesto@gmail.com` y confirmar que el panel carga — hecho, cuenta creada vía `POST /auth/register` (no había ninguna todavía).
9. [ ] Correr el `Protocolo_Pruebas.md` — o al menos los bloques 0/1/8 — contra el ambiente real antes de mandarle el link a la primera clínica.

---

## 12. Deploys siguientes (una vez que ya está arriba)

```bash
cd /home/deploy/ecosistema
git pull
docker compose build
docker compose up -d
# Sólo si el pull trajo migraciones nuevas en db/migrations/ (ya generadas y
# committeadas en dev con `pnpm db:generate` — NUNCA correr `db:generate`
# acá: generaría un .sql suelto dentro del contenedor, no versionado, que
# `git pull` del próximo deploy no va a traer):
docker compose exec backend pnpm --filter backend db:migrate
```
`docker compose up -d` reemplaza sólo los contenedores cuya imagen cambió — no hace falta bajar todo el stack para un deploy normal. No hace falta tocar el stack "edge" salvo que cambien los dominios/labels.

Re-verificado el 2026-09-10: las 35 migraciones actuales (`0000`–`0034`) corren de punta a punta
contra un Postgres 16 limpio sin ningún error — incluida la extensión `pgcrypto` (best-effort,
no hace falta en PG13+), las columnas de la revisión anterior (`plataforma.pagos.estado`/
`comprobante_url`, `core.organizaciones.logo_url`) y la más nueva (`hce.vacunaciones.costo`).

---

## 13. Fuera de alcance de este plan (mejoras futuras, no bloqueantes para arrancar)

- **CI/CD** (buildear las imágenes en GitHub Actions, subirlas a un registry — GitHub Container Registry alcanza — y que el deploy sea sólo `docker compose pull && up -d`) — reduce lo que hace falta de RAM/CPU en el servidor para deployar, útil cuando los deploys se vuelvan frecuentes. Hoy no es necesario.
- **Storage externo para `uploads/`** (S3-compatible) en vez de un volumen Docker local — el disco local es una decisión de alcance ya tomada a propósito (ver `CLAUDE.md`), no una limitación técnica.
- **Staging separado de producción** — con una sola VPS chica no hay margen para un ambiente aparte; hoy el equivalente es probar en local con PGlite antes de deployar.
- **RLS de Postgres** como defensa en profundidad además del aislamiento multi-tenant a nivel de aplicación (ya mencionado como opcional en el Roadmap).
- **Réplica de base de datos / alta disponibilidad** — no tiene sentido antes de tener usuarios reales pagando.
- **Orquestación más allá de Docker Compose** (Swarm, Kubernetes) — sin sentido para una sola VPS con un puñado de proyectos; Compose alcanza hasta que eso deje de ser cierto.

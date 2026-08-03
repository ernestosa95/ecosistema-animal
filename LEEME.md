# 🔐 Backend del Portal del Dueño

Módulo NestJS que le da backend real al portal que ya tenés en la web. Endpoints:

- `GET  /portal/resumen`         → (dueño) sus mascotas con vacunas, turnos y consultas.
- `POST /portal/turnos`          → (dueño) solicita un turno (`canal: portal`, `solicitado`).
- `POST /portal/acceso/:personaId` → (staff) genera el enlace de acceso del dueño.

Acceso por **magic-link**: un token JWT con `scope: 'portal'` que viaja en el header
`X-Portal-Token`. No usa el login del staff. Reutiliza tu `JwtService` (mismo secreto),
así que **no hay dependencias nuevas que instalar**.

## Instalar

1. Descomprimí sobre la raíz del repo (`ecosistema/`). Agrega la carpeta
   `apps/backend/src/portal/` y sobrescribe `apps/backend/src/app.module.ts`
   (solo suma `PortalModule` a los imports).
2. Reiniciá el backend:
   ```bash
   cd apps/backend
   pnpm start:dev
   ```
   Debería compilar con `Found 0 errors` (ya lo verifiqué contra tu código).

## Probarlo de punta a punta

**1) Conseguí un token de staff y tu organización.** Lo más rápido: en el navegador,
con sesión iniciada, abrí la consola (F12) y mirá el localStorage:
```js
JSON.parse(localStorage.getItem('ecosistema.sesion'))
// → { token: '...', organizacionId: '...', rol: '...' }
```

**2) Elegí un dueño (persona) que tenga mascotas cargadas.** Su `id` lo ves en la
pestaña Dueños de la app, o con `GET /personas`.

**3) Generá el enlace de acceso del dueño:**
```bash
curl -X POST http://localhost:3000/portal/acceso/PERSONA_ID \
  -H "Authorization: Bearer TOKEN_DE_STAFF" \
  -H "X-Organizacion-Id: ORG_ID"
```
Devuelve:
```json
{ "token": "eyJ...", "portalUrl": "http://localhost:5173/?token=eyJ..." }
```

**4) Probá el endpoint del dueño directo (opcional):**
```bash
curl http://localhost:3000/portal/resumen -H "X-Portal-Token: eyJ..."
```

**5) Pasá el portal web a datos reales.** En `apps/web/src/api/portal.ts`:
```ts
export const USAR_MOCK = false;
```
Abrí el `portalUrl` del paso 3 → vas a ver las mascotas reales de ese dueño, y el botón
"Solicitar turno" va a crear un turno de verdad (aparecerá en la Agenda como `solicitado`
por canal `portal`).

## Notas de diseño

- **Aislamiento:** el dueño solo ve/gestiona lo suyo. `GET /resumen` filtra por su
  `personaId` + `organizacionId`; `POST /turnos` verifica que la mascota le pertenezca
  antes de crear.
- **Vigencia del token:** 30 días. Para producción conviene acortarla y regenerar el
  enlace on-demand (magic-link por email). El endpoint de acceso ya te deja hacer eso.
- **`PORTAL_BASE_URL`:** el `portalUrl` usa `http://localhost:5173` por defecto. En la VM
  poné `PORTAL_BASE_URL=https://tudominio` en el `.env` del backend.
- **Compatibilidad de datos:** el resumen ya viene con la forma exacta que espera el
  `mapResumen()` del front (vacuna `producto`→`nombre`, turno `fechaHora` partido en
  fecha/hora). No hay que tocar nada en la web salvo el `USAR_MOCK`.

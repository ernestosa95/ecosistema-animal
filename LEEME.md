# ✨ Pulido C — parte segura + snippets

Tu repo remoto quedó **atrás** respecto de lo que aplicaste localmente. Por eso este paquete
trae dos cosas:

1. **Archivos listos** (nuevos o de base estable, sin riesgo de pisarte nada).
2. **Snippets** para los cambios que tocan tus páginas (los aplicás vos, sin importar el
   estado exacto de tus archivos).

---

## 1. Archivos listos (descomprimir sobre la raíz del repo)

- `apps/backend/src/common/filters/db-error.filter.ts` — **404 en vez de 500** cuando se
  pasa un id inválido. Es un filtro **global**: no hay que tocar ningún controller.
- `apps/backend/src/main.ts` — registra ese filtro (una línea nueva). *(Si tu `main.ts`
  tiene cambios propios, copiá solo el bloque del `DbErrorFilter`.)*
- `apps/web/src/auth/permisos.ts` — helper `puede(rol, accion)` para ocultar botones.
- `docs/Estructura_Proyecto.md` y `docs/Roadmap_Ecosistema.md` — **documentación actualizada**.

Reiniciá el backend. Probá: `GET /animales/no-es-uuid/carnet.pdf` → ahora **404**, no 500.

---

## 2. Snippets (aplicar en tus páginas)

### a) Ocultar botones por rol

En cada página, agregá el import:
```ts
import { puede } from '../auth/permisos';
```

**Página de Animales** — envolvé el botón "+ Nuevo animal":
```tsx
{puede(sesion.rol, 'escribir_animales') && (
  <button className="btn" onClick={() => setMostrarForm((v) => !v)}>
    {mostrarForm ? 'Cerrar' : '+ Nuevo animal'}
  </button>
)}
```

**Página de Dueños** — el botón "+ Nuevo dueño":
```tsx
{puede(sesion.rol, 'escribir_duenos') && ( /* …tu botón… */ )}
```

**Ficha del animal (PacienteDetallePage)** — el botón "+ Nueva consulta" (clínico):
```tsx
{puede(sesion.rol, 'clinico') && (
  <button className="btn" onClick={() => setMostrarConsulta((v) => !v)}>
    {mostrarConsulta ? 'Cerrar' : '+ Nueva consulta'}
  </button>
)}
```

### b) Botón "Descargar carnet" (ficha del animal)

Dentro del componente `PacienteDetallePage`, agregá la función:
```tsx
async function descargarCarnet() {
  const res = await fetch(`${API_BASE}/animales/${animal.id}/carnet.pdf`, {
    headers: {
      Authorization: `Bearer ${sesion.token}`,
      'X-Organizacion-Id': sesion.organizacionId,
    },
  });
  if (!res.ok) { alert('No se pudo generar el carnet'); return; }
  window.open(URL.createObjectURL(await res.blob()));
}
```
Y el botón, en la barra de acciones de la ficha (junto a "Editar"):
```tsx
<button className="btn-ghost" onClick={descargarCarnet}>Descargar carnet</button>
```
*(`API_BASE` = `import.meta.env.VITE_API_URL ?? 'http://localhost:3000'` si no lo tenés ya.)*

### c) Rename PacientesPage → AnimalesPage (cosmético)
```bash
cd apps/web/src/pages
git mv PacientesPage.tsx AnimalesPage.tsx    # o mv, si no está en git aún
```
Renombrá la función `PacientesPage` → `AnimalesPage` dentro del archivo, y actualizá el
import en `App.tsx`.

---

## 3. Importante: sincronizá tu repo (evita esta divergencia)

Tu remoto no tiene lo que fuiste aplicando local (admin, solicitudes, permisos, etc.).
Cuando quieras, subí todo:
```bash
git add -A
git commit -m "Huella completa + admin + auto-registro + ciclo de vida + pulido"
git push
```
Con el remoto al día, puedo clonar tu estado real y hacer los próximos cambios (refresh
tokens, Tropera, móvil) con precisión, sin snippets.

## Falta de C (próximo)
- **Refresh tokens** — es el único ítem de C que queda y toca auth; lo hacemos como paso
  aparte y enfocado.

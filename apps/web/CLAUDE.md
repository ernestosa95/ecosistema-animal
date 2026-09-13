# apps/web — Design System Rules (for Figma MCP)

Scoped guidance for translating Figma designs into this codebase, and vice versa. Read the repo-root `CLAUDE.md` first for product/architecture context — this file only covers the design-system side: tokens, components, assets, icons, styling. Everything here describes `apps/web` (React + Vite). There is no separate design-system package — `apps/mobile` maintains its **own** hand-mirrored copy of the same tokens (see the bottom section) rather than importing from here.

There is **no component library, no CSS framework, no design-token build pipeline**. Every token is a raw CSS custom property in one file, every component is a plain function returning JSX with hand-written className strings. Treat any Figma variable/style you map against this codebase as mapping to a CSS custom property or a literal value in `styles.css` — not to a component-library theme object.

## 1. Token Definitions

**Single source of truth: `apps/web/src/styles.css`, the `:root` block at the very top (lines 1–34).** No JSON/YAML token files, no Style Dictionary, no Tailwind config — tokens are plain CSS custom properties, referenced everywhere as `var(--name)`.

```css
:root {
  /* Brand */
  --verde: #0e7c6b;
  --verde-dark: #0a5c4f;
  --tierra: #8b5a2b;      /* Tropera-only, do not touch for Huella work */
  --celeste: #4f8fc0;     /* Tropera-only */
  --tropera-bg: #fdf4eb;  /* Tropera-only */
  --huella-bg: #e5f2ef;

  /* Neutrals ("papel" — warm off-white, never clinical white or OS gray) */
  --text: #1e2a23;
  --muted: #6c6650;
  --border: #e2dfd6;
  --bg: #f6f5f1;
  --card: #ffffff;
  --hover-bg: #edebe4;

  /* Semantic */
  --danger: #b91c1c;
  --danger-bg: #fef2f2;
  --advertencia: #a13d2b;      /* "pending/attention", NOT an error color */
  --advertencia-bg: #f5e6df;

  /* Elevation */
  --sombra-suave: 0 1px 2px rgba(30, 42, 35, 0.05), 0 1px 3px rgba(30, 42, 35, 0.07);
  --sombra-flotante: 0 10px 25px -5px rgba(30, 42, 35, 0.14), 0 8px 10px -6px rgba(30, 42, 35, 0.09);
}
```

**No spacing/font-size/radius scale tokens exist** — those are literal `rem`/`px` values repeated inline (see §6). If you introduce Figma variables for spacing or radii, they should be treated as *documentation of the de-facto scale*, not as real CSS variables to generate — do not invent `--space-*` tokens that don't exist in the file.

**Product-line split**: two brand families share this file. "Huella" (HCE/clinical — `--verde*`, `--huella-bg`) is the actively-evolving brand (kit de marca Huella, `docs/Kit_Marca_Huella.html`, redesigned 2026-09-10). "Tropera" (livestock — `--tierra`, `--celeste`, `--tropera-bg`) follows a separate, older identity doc (`Identidad_Visual_Tropera.pdf`) and is **not** part of the current redesign — don't reflow Tropera-scoped screens onto Huella tokens unless explicitly asked.

**No token transformation/build system** — `styles.css` is loaded once, globally, via `main.tsx` → `import './styles.css'`, and consumed as-is by both the authenticated app shell and the public pages (portal, landing, login all reuse the same `:root` variables). There's no per-component scoping, no CSS Modules, no CSS-in-JS.

## 2. Component Library

No Storybook, no MDX docs, no isolated component-dev environment. Components live inline in two flat directories, organized by **page**, not by atomic-design tier:

- `apps/web/src/pages/*.tsx` — one file per route/section (e.g. `PacienteDetallePage.tsx`, `TurnosPage.tsx`, `AdminPage.tsx`). Large pages often define small local sub-components (e.g. a `Field` helper) inline at the bottom of the same file rather than extracting them — check the bottom of a page file before assuming a shared component exists.
- `apps/web/src/components/*.tsx` — the actually-reusable, cross-page pieces: `SelectorBusqueda.tsx` (closed-list search-as-you-type `<select>` replacement), `BuscadorSenasa.tsx` / `BuscadorCatalogoVacunas.tsx` / `BuscadorCatalogoDiagnosticos.tsx` (free-text field + filtered suggestion list, same shape, three data sources), `DrawerTabla.tsx` (KPI drill-down slide-over), `SeleccionarAnimalModal.tsx`, `VentaRapidaModal.tsx`, `NuevoTurnoRapidoModal.tsx`, `MensajesBanner.tsx`, `TutorialGuiado.tsx` (react-joyride wrapper), `FormAltaMiembro.tsx`, `WizardConfiguracionRapida.tsx`, `TerminosModal.tsx`, `InfoRoles.tsx`, `IngresoStockForm.tsx` / `IngresoStockModal.tsx`, `CamposEspecie.tsx` (renders a per-species field catalog, see `config/especieDatos.ts`), `Omnibox.tsx`.

**Component architecture**: plain function components, no `React.memo`/context-heavy abstraction beyond session (`useSesion`) and sync callbacks. Props are typed inline or via a local `interface`/`type` at the top of the file — no shared `props.ts`. Styling is 100% via `className` referencing selectors in the single global `styles.css`; no `styled-components`, no CSS Modules, no inline `style={{}}` except for a few one-off dynamic values (e.g. a computed width/percentage).

**Recurring un-named "patterns" to recognize when mapping a Figma component** (documented in the root `CLAUDE.md`, worth restating here for design mapping):
- **List → detail**: a page renders a list; selecting a row swaps the *entire* view for a detail panel (no nested router). Used by `PacientesPage.tsx`/`PacienteDetallePage.tsx`, `TroperaPage.tsx`, `FarmaciaPage.tsx`.
- **Quick-create sentinel**: a `<select>` of existing related records gets one extra `'__nuevo__'` option that reveals inline create fields beneath it, instead of a modal.
- **Direct-correction vs. tracked-movement duality**: some numeric fields (Tropera existencias, Farmacia stock) can be edited two ways — a direct `PATCH` (unaudited) or a `movimientos` POST (ledgered, with history). Both UIs typically appear side-by-side; don't merge them into one control when implementing a Figma frame that shows both.
- **`Field`-like wrapper**: label + input helper components must be a `<div>`, never a `<label>`, if they can contain more than one interactive child (e.g. an input plus a suggestions dropdown) — a `<label>` steals clicks meant for descendant buttons/list items. Default to `<div>`.

## 3. Frameworks & Libraries

- **UI framework**: React 18 (`react` / `react-dom` ^18.3.1), function components + hooks only, no class components.
- **Routing**: none — `apps/web/src/main.tsx` does manual `window.location`-based branching (see root `CLAUDE.md`'s "web architecture" section for the exact routes: `/admin`, `?token=`, `/c/:codigo` or `?c=`, `?resetToken=`, everything else → `App.tsx`, which itself branches `/login` vs. the main shell). No `react-router`.
- **State**: local `useState`/`useEffect` per page; the one cross-cutting piece of state is session (`useSesion` hook, localStorage-persisted, instantiated once in `App.tsx` and pushed down explicitly — not React Context).
- **Styling**: plain global CSS, one file (`src/styles.css`, ~2200 lines). No Tailwind, no CSS-in-JS, no CSS Modules, no PostCSS plugins beyond what Vite ships by default.
- **Only third-party UI dependency**: `react-joyride` (^3.2.0), used solely by `components/TutorialGuiado.tsx` for the guided-tour overlay. That's it — check `apps/web/package.json` before assuming any other library (icon sets, component kits, animation libs) is available; none currently are.
- **Build/bundler**: Vite 5 (`@vitejs/plugin-react`). `pnpm --filter web dev` (port 5173) / `pnpm --filter web build`. No custom Vite config beyond the default React plugin (check `apps/web/vite.config.ts` if one exists before assuming).
- **Backend PDFs are a separate rendering stack** — `@react-pdf/renderer` on the NestJS backend (`hce/carnet`) — irrelevant to the web app's own design system but worth knowing if a Figma frame turns out to be a print/PDF layout (carnet CR80 card, ficha A4 sheet) rather than a web screen.

## 4. Asset Management

- **Static public assets**: `apps/web/public/` — currently just `favicon.svg`. Anything dropped here is served at the site root as-is (Vite convention) and referenced by absolute path (`/favicon.svg`, as in `index.html`).
- **No image/logo asset pipeline in `apps/web`** at present — no `/src/assets` image directory, no SVG-as-React-component setup (no `vite-plugin-svgr` or similar), no optimized-image loader. If Figma export brings in raster/vector brand assets (e.g. a Huella logo mark), the established place to add them is `apps/web/public/` (served verbatim, referenced by root-relative URL) unless the component needs to inline the SVG for CSS-controlled coloring — there's no existing convention for the latter yet, so pick one deliberately rather than assuming.
- **No CDN** — Vite build output is static; deployment story is the Docker-based plan in `docs/Plan_Despliegue.md`, not asset-CDN-backed.
- **Fonts are the one actively-used external asset pipeline**: Google Fonts, loaded via `<link>` tags in `index.html` (see §6) — not self-hosted, not bundled through Vite.
- **User-uploaded images** (pet photos) are a *backend* concern, not part of this design system — see root `CLAUDE.md`'s `portal/` section (`uploads/animales/`, served via `app.useStaticAssets()`, client-compressed before upload). Don't conflate that upload pipeline with Figma-sourced static assets.
- **Mobile assets** (`apps/mobile/assets/images/*`) are a completely separate tree (Expo app-icon/splash conventions) — not shared with or referenced by `apps/web`.

## 5. Icon System

**There is no icon library, icon font, or SVG icon set.** Icons across the web app are:
1. **Emoji literals**, inline in JSX/TSX string form — e.g. `'🩺'`, `'💉'`, `'📅'`, `'🐾'`, `'🐕'`/`'🐈'`/`'🐎'`/`'🐄'`/`'🦜'`/`'🐖'`/`'🐑'`/`'🐐'` (species icons in `TurnosPage.tsx`), `'⚙ Agendas'`, `'❓ Ayuda'` (topbar help button), `'★ Mis turnos'`.
2. A small number of hand-drawn **CSS shapes** for brand marks — e.g. `.brand-dot` (a plain `border-radius: 50%` div with `background: var(--verde)`), not SVG.

**Implication for Figma → code**: any icon in a Figma design maps either to (a) the closest matching emoji glyph — check existing usage first (`TurnosPage.tsx` line ~20 for the species set, `LandingPage.tsx` for feature icons) so a new icon doesn't introduce a visually inconsistent style next to emoji, or (b) if the design genuinely needs a custom vector icon (not expressible as emoji), this codebase has **no established pattern yet** — introducing an icon library or an SVG-sprite system would be a new architectural decision, not a drop-in. Flag this explicitly rather than silently picking a library.

**Naming convention**: none beyond "the emoji used inline at the call site" — there is no `icons/` directory, no `<Icon name="..." />` component, no icon registry to keep in sync with Figma icon components.

## 6. Styling Approach

**Methodology**: global CSS with BEM-ish flat class names (e.g. `.hu-field`, `.rc-badge`, `.pd-*` for portal pages), one file, cascade-based — no scoping mechanism at all, so class names must stay globally unique by convention (prefixing by page/feature, e.g. `hu-` for `HuellaHomeSection.tsx`, `pd-` for the two `Portal*Page.tsx` files via the shared `pages/portalEstilos.ts` constant).

**Global styles**: `apps/web/src/styles.css` is loaded once for the entire SPA (imported in `main.tsx`), including public pages (login, landing, portal) — there is no per-page stylesheet. `pages/portalEstilos.ts` is the one exception-that-proves-the-rule: a JS string of CSS injected via a `<style>` tag by the two portal pages, but it still consumes the same `var(--*)` tokens from the global sheet rather than defining its own palette.

**Typography**:
- Headings (`h1`, `h2`) use **Sora** (500/600/700 weights loaded).
- Body text uses **Work Sans** (400/500/600/700).
- A monospace face, **IBM Plex Mono** (500/600), is loaded too — used for codes/IDs (e.g. the carnet's código legible), check call sites before assuming where.
- Loaded via Google Fonts `<link>` in `apps/web/index.html`:
  ```html
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    href="https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700&family=Work+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap"
    rel="stylesheet"
  />
  ```
  If a Figma design uses a different weight of any of these three families, add it to this `<link>`'s query string rather than introducing a new `<link>` tag or a fourth family without checking with the user first — this is a deliberate, recently-revised brand decision (Sora replaced Zilla Slab on 2026-09-10 specifically because a slab serif read "too vintage" on screen).
- Body font stack: `'Work Sans', system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif`.

**De-facto spacing/sizing scale** (no tokens — these are the values actually in use, worth treating as an informal scale when translating Figma spacing):
- Padding/gap steps seen repeatedly: `0.4rem`, `0.5rem`, `0.55rem`, `0.7rem`, `0.85rem`, `1rem`, `1.1rem`, `1.25rem`, `1.5rem`.
- Border-radius steps, by frequency: `999px` (pills/badges — most common), `9px` (buttons, `.btn`/`.btn-ghost`/`.btn-danger`), `12px` (nav rail buttons, some cards), `14px` (`.card`, the base card radius), `10px`, `8px`, `50%` (circular, e.g. `.brand-dot`), with `6px`/`16px`/`18px`/`20px` as rarer one-offs. When mapping a Figma corner-radius value, snap to `9px` for button-shaped elements and `14px` for card-shaped elements unless the design clearly intends a pill (`999px`).

**Core primitives** (the closest thing to a component library — copy these shapes rather than inventing new ones):
```css
.btn {            /* primary action */
  padding: 0.55rem 1.05rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: #fff;
  background: var(--verde);
  border-radius: 9px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
}
.btn-ghost {       /* secondary action */
  padding: 0.4rem 0.85rem;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text);
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 9px;
}
.btn-danger {       /* destructive action — same molde as .btn, --danger instead of --verde */
  background: var(--danger);
  /* rest identical to .btn */
}
.card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 1.1rem 1.25rem;
  box-shadow: var(--sombra-suave);
  overflow-x: auto;   /* wide content (tables) scrolls inside the card, never the page */
}
```
Elevation only ever uses the two shadow tokens (`--sombra-suave` for resting cards, `--sombra-flotante` for floating/modal elements) — don't invent a third shadow value.

**Layout system**: no CSS grid/flex utility framework (no Tailwind). Two reusable global layout classes carry most of the app:
- `.app` / `.app-rail` — the authenticated shell: `height: 100%`, `overflow: hidden`, with exactly **one** scrolling region (`.contenido`, `overflow-y: auto`) below a fixed nav rail and breadcrumb. This is a hard rule stated in the root `CLAUDE.md`: any new page content that can grow long must scroll inside `.contenido`, never trigger page-level/document scroll. Public pages (login/admin/portal/landing) don't use `.app` and scroll normally.
- `.layout-2col` / `.layout-main` / `.layout-side` — a reusable ¾/¼ grid (`grid-template-columns: 3fr 1fr`, `align-items: stretch`), collapsing to a single column under 900px. A `.layout-side` child that depends on the desktop stretch-to-fill needs an explicit mobile override (see the `@media (max-width: 900px)` block right after `.layout-2col`) or it collapses to zero height when the grid goes single-column.

**Responsive breakpoints in use** (only 5 media queries in the whole file, all `max-width`, no `min-width`/desktop-first mixing): `900px` (the primary mobile breakpoint — collapses `.layout-2col`, hides/reflows nav), `720px`, `640px`. Treat `900px` as the canonical "mobile" cutoff when translating a Figma mobile frame; the two narrower ones handle specific component reflows (check the surrounding rule before assuming which).

## 7. Project Structure

```
apps/web/
├── index.html                # font links, favicon, #root mount
├── public/
│   └── favicon.svg
└── src/
    ├── main.tsx               # manual URL-based routing (no router lib)
    ├── App.tsx                # session owner, main-shell branching, role→home routing
    ├── styles.css              # THE design system — tokens + every class, ~2200 lines
    ├── api/                    # one file per backend resource (client.ts, turnos.ts, admin.ts, ...)
    │   └── types.ts            # shared response/DTO shapes
    ├── components/             # cross-page reusable pieces (see §2)
    ├── pages/                  # one file per route/section, list→detail pattern common
    │   ├── portalEstilos.ts    # shared CSS string for the two public Portal*Page files
    │   └── turnos/             # sub-directory for TurnosPage's own split-out pieces
    ├── config/                 # frontend-only catalogs, e.g. especieDatos.ts (per-species form fields)
    ├── tutorial/                # tours.ts — react-joyride step definitions per role
    └── utils/                  # helpers, e.g. columnasTabla.ts, comprimirImagen.ts
```

Organized **by page/route**, not by atomic-design layer (no `atoms/molecules/organisms`) and not by feature-module (unlike the backend, which groups by DB schema). A Figma page/frame named after a product screen (e.g. "Turnero", "Ficha de paciente") maps directly to one file in `pages/`; a Figma component used across multiple frames maps to `components/` only if it's genuinely reused in the codebase today — check with `grep` before assuming a one-off Figma "component" deserves extraction, since this codebase's default is to keep page-local UI inline in the page file until a second consumer actually shows up.

## 8. Cross-platform note (apps/mobile)

`apps/mobile` (Expo/React Native) is **not** part of this web design system but deliberately mirrors its palette by hand: `apps/mobile/src/constants/theme.ts` hardcodes the same hex values as `styles.css`'s `:root` (kept in sync manually — there's no shared token package), plus `Radii` (`card: 14`, `btn: 9`, `pill: 999`, matching the CSS `border-radius` values above) and `Shadows.suave`/`Shadows.flotante` translated to RN's `shadow*`/`elevation` props. If a Figma token changes, update **both** files — there is no single source that propagates automatically. Mobile's own component/icon conventions are documented separately in `apps/mobile/AGENTS.md` (its `CLAUDE.md` redirects there) and are out of scope here.

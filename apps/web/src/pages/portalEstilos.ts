// apps/web/src/pages/portalEstilos.ts
// CSS compartido por PortalDuenoPage.tsx y PortalAccesoPage.tsx — antes cada
// una definía su propio bloque casi idéntico con colores hardcodeados
// (#0E7C6B, etc.), distintos de los tokens reales de la app (`--verde` en
// styles.css). Unificado acá: mismos colores/tokens que el resto de la app,
// import único (`main.tsx` ya carga `styles.css` globalmente, así que las
// variables `--*` están disponibles en cualquier página, portal incluido),
// layout propio (`pd-*`) porque la disposición mobile-first en una sola
// columna no tiene equivalente en el shell de la app interna (`.app`/`.layout-2col`).
export const CSS_PORTAL = `
.pd-page { min-height: 100vh; background: var(--bg); color: var(--text); display: flex; flex-direction: column; }
.pd-top { background: var(--verde); color: #fff; padding: .9rem 1.1rem; display: flex; align-items: baseline; gap: .6rem; }
.pd-logo { font-weight: 800; font-size: 1.1rem; }
.pd-logo-img { height: 28px; max-width: 140px; object-fit: contain; border-radius: 4px; background: #fff; padding: 2px 4px; }
.pd-top-sub { font-size: .8rem; opacity: .85; }
.pd-main { flex: 1; width: 100%; max-width: 640px; margin: 0 auto; padding: 1rem; box-sizing: border-box; }
.pd-foot { text-align: center; font-size: .75rem; color: var(--muted); padding: 1rem; }
.pd-empty { text-align: center; color: var(--muted); padding: 3rem 1rem; }
.pd-err { color: var(--danger); }
.pd-card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 1rem; margin-bottom: 1rem; box-shadow: var(--sombra-suave); }
.pd-hero { display: flex; gap: 1rem; align-items: center; }
.pd-avatar { width: 56px; height: 56px; border-radius: 14px; background: var(--huella-bg); display: flex; align-items: center; justify-content: center; font-size: 1.8rem; flex-shrink: 0; overflow: hidden; }
.pd-avatar img { width: 100%; height: 100%; object-fit: cover; }
.pd-name { font-size: 1.3rem; font-weight: 800; }
.pd-sub { color: var(--muted); font-size: .9rem; }
.pd-meta { display: flex; gap: .6rem; align-items: center; flex-wrap: wrap; margin-top: .3rem; font-size: .8rem; color: var(--muted); }
.pd-code { font-family: ui-monospace, monospace; background: var(--hover-bg); padding: .1rem .4rem; border-radius: 6px; }
.pd-micro { font-size: .78rem; color: var(--muted); margin-top: .2rem; font-family: ui-monospace, monospace; }
.pd-dueno { font-size: .82rem; color: var(--muted); margin-top: .4rem; }
.pd-h3 { font-size: .95rem; margin: 1.2rem .2rem .5rem; }
.pd-h4 { font-size: .82rem; text-transform: uppercase; letter-spacing: .03em; color: var(--muted); margin: 1rem 0 .4rem; }
.pd-badge { font-size: .72rem; font-weight: 700; border: 1px solid; border-radius: 999px; padding: .12rem .55rem; white-space: nowrap; }
.pd-row { display: flex; justify-content: space-between; align-items: center; gap: .75rem; padding: .5rem 0; border-top: 1px solid var(--border); }
.pd-row:first-child { border-top: none; }
.pd-row-main { display: flex; flex-direction: column; min-width: 0; }
.pd-muted { color: var(--muted); font-size: .82rem; }
.pd-tag { font-size: .72rem; background: var(--huella-bg); color: var(--verde-dark); padding: .15rem .5rem; border-radius: 999px; text-transform: capitalize; white-space: nowrap; }
.pd-consulta { display: flex; gap: .8rem; padding: .55rem 0; border-top: 1px solid var(--border); }
.pd-consulta:first-child { border-top: none; }
.pd-consulta-fecha { font-size: .78rem; color: var(--muted); width: 5.2rem; flex-shrink: 0; }
.pd-consulta-cuerpo { min-width: 0; }
.pd-turno-accion { margin-top: 1rem; padding-top: .75rem; border-top: 1px solid var(--border); display: flex; gap: .5rem; flex-wrap: wrap; }
.pd-btn { border: none; background: var(--verde); color: #fff; font-weight: 700; font-size: .85rem; padding: .55rem 1rem; border-radius: 8px; cursor: pointer; }
.pd-btn:hover { background: var(--verde-dark); }
.pd-btn:disabled { opacity: .6; cursor: default; }
.pd-btn-ghost { background: transparent; color: var(--verde-dark); border: 1px solid var(--border); }
.pd-turno-form { margin-top: .75rem; display: flex; flex-direction: column; gap: .6rem; }
.pd-turno-form label { font-size: .8rem; color: var(--muted); display: block; }
.pd-turno-form input { display: block; width: 100%; margin-top: .25rem; padding: .5rem .6rem; border: 1px solid var(--border); border-radius: 8px; font-size: .9rem; box-sizing: border-box; }
.pd-turno-ok { margin-top: .75rem; font-size: .88rem; color: var(--verde-dark); background: var(--huella-bg); border: 1px solid var(--border); border-radius: 8px; padding: .75rem; }
.pd-err-inline { color: var(--danger); font-size: .82rem; }
`;

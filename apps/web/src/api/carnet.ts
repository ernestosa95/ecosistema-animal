// apps/web/src/api/carnet.ts
// Descarga el carnet PDF del paciente pasando el token + la organización.
// (El <a href> directo no sirve: el endpoint exige headers de sesión.)

const BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000';

// ★ La MISMA clave con la que useSesion guarda la sesión en localStorage.
// Si tu useSesion usa otra clave o guarda el token aparte, ajustá acá.
const SESION_KEY = 'huella.sesion';

function auth(): { token?: string; organizacionId?: string } {
  try {
    const raw = localStorage.getItem(SESION_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Pide el carnet PDF y lo abre en una pestaña nueva. */
export async function abrirCarnet(animalId: string): Promise<void> {
  const { token, organizacionId } = auth();
  const res = await fetch(`${BASE}/animales/${animalId}/carnet.pdf`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(organizacionId ? { 'X-Organizacion-Id': organizacionId } : {}),
    },
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(msg || `No se pudo generar el carnet (Error ${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  // liberar el objeto tras un rato (ya se abrió la pestaña)
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

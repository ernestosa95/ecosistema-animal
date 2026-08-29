/** Minusculas + sin acentos, para comparar sin importar tildes/mayusculas. */
function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Distancia de edicion (Levenshtein), acotada — strings de busqueda son cortos. */
function distancia(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const fila = new Array(n + 1);
  for (let j = 0; j <= n; j++) fila[j] = j;
  for (let i = 1; i <= m; i++) {
    let anterior = fila[0];
    fila[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = fila[j];
      fila[j] = a[i - 1] === b[j - 1]
        ? anterior
        : 1 + Math.min(anterior, fila[j], fila[j - 1]);
      anterior = temp;
    }
  }
  return fila[n];
}

/**
 * Puntua que tan bien `query` matchea `texto` (0 = no matchea). Prioriza
 * substring exacto (mas alto cuanto mas al principio), y como fallback
 * tolera errores tipograficos via distancia de edicion acotada.
 */
export function puntuarCoincidencia(query: string, texto: string | null | undefined): number {
  if (!texto) return 0;
  const q = normalizar(query.trim());
  const t = normalizar(texto);
  if (!q) return 0;

  const idx = t.indexOf(q);
  if (idx === 0) return 100;
  if (idx > 0) return 70 - Math.min(idx, 20);

  // Fuzzy: solo si son de longitud comparable (evita falsos positivos en textos largos).
  if (q.length >= 3 && t.length <= q.length + 4) {
    const d = distancia(q, t);
    const tolerancia = Math.max(1, Math.floor(q.length / 4));
    if (d <= tolerancia) return 40 - d * 5;
  }
  return 0;
}

/** Maximo puntaje entre varios campos (nombre, dni, telefono, etc.). */
export function puntuarMultiple(query: string, campos: (string | null | undefined)[]): number {
  return Math.max(0, ...campos.map((c) => puntuarCoincidencia(query, c)));
}

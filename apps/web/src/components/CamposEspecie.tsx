// apps/web/src/components/CamposEspecie.tsx
// Renderiza los inputs de "datos específicos" según la especie elegida.
// Usa las clases del form-grid existente (label, form-titulo, span-2).
import type { Especie } from '../api/types';
import { camposDeEspecie } from '../config/especieDatos';

export function CamposEspecie({
  especie,
  valores,
  onChange,
}: {
  especie?: Especie | null;
  valores: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const campos = camposDeEspecie(especie);
  if (campos.length === 0) return null;

  const set = (clave: string, valor: unknown) => onChange({ ...valores, [clave]: valor });

  return (
    <>
      <div className="form-titulo span-2">Datos de {especie?.nombre ?? 'la especie'}</div>
      {campos.map((c) => {
        const v = valores[c.clave];

        if (c.tipo === 'checkbox') {
          return (
            <label
              key={c.clave}
              style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <input
                type="checkbox"
                checked={!!v}
                onChange={(e) => set(c.clave, e.target.checked)}
                style={{ width: 'auto' }}
              />
              {c.etiqueta}
            </label>
          );
        }

        if (c.tipo === 'select') {
          return (
            <label key={c.clave}>
              {c.etiqueta}
              <select value={(v as string) ?? ''} onChange={(e) => set(c.clave, e.target.value)}>
                <option value="">—</option>
                {c.opciones?.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </label>
          );
        }

        return (
          <label key={c.clave}>
            {c.etiqueta}
            <input
              type={c.tipo === 'number' ? 'number' : 'text'}
              value={(v as string | number) ?? ''}
              placeholder={c.placeholder}
              onChange={(e) =>
                set(c.clave, c.tipo === 'number'
                  ? (e.target.value === '' ? '' : Number(e.target.value))
                  : e.target.value)
              }
            />
          </label>
        );
      })}
    </>
  );
}

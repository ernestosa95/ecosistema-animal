import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { IngresoStockForm } from './IngresoStockForm';
import type { Sesion, Producto } from '../api/types';

/** Acceso rápido del Home: mismo flujo "+ Ingresos" de `FarmaciaPage.tsx`, envuelto como modal — ver `IngresoStockForm`. */
export function IngresoStockModal({
  sesion,
  onCancelar,
  onCompletado,
}: {
  sesion: Sesion;
  onCancelar: () => void;
  onCompletado: () => void;
}) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [ok, setOk] = useState(false);
  const [cajaAbiertaAhora, setCajaAbiertaAhora] = useState(false);

  useEffect(() => {
    api.productos(sesion).then(setProductos).catch(() => {});
  }, [sesion]);

  return (
    <div className="modal-overlay" onClick={onCancelar}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <span>Ingreso de stock (compra a proveedor)</span>
          <button className="link" onClick={onCancelar}>
            Cerrar ✕
          </button>
        </div>

        {ok ? (
          <>
            <p className="muted">Ingreso registrado ✓</p>
            {cajaAbiertaAhora && <p className="muted">🔓 Se abrió la caja del día automáticamente.</p>}
          </>
        ) : productos.length === 0 ? (
          <p className="muted">Cargando productos…</p>
        ) : (
          <div style={{ marginTop: '0.75rem' }}>
            <IngresoStockForm
              sesion={sesion}
              productos={productos}
              onProductoCreado={(p) => setProductos((prev) => [...prev, p])}
              onCreado={(abierta) => {
                setCajaAbiertaAhora(!!abierta);
                setOk(true);
                setTimeout(onCompletado, 900);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

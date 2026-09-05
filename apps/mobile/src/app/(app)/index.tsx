import { Redirect } from 'expo-router';
import { useSesionContext } from '@/auth/SesionContext';

/**
 * `index.tsx` es el archivo que expo-router resuelve por defecto para la
 * URL vacía "/" — como `(app)` es un grupo (no aporta segmento a la URL),
 * esto aplica tanto al arrancar la app en frío como a cualquier
 * `router.replace('/(app)')`, sin importar el `initialRouteName` que se le
 * pase a `<Tabs>` (ese prop no gana contra esta resolución por nombre de
 * archivo). Por eso la elección de pestaña por defecto (home vs.
 * establecimientos, según huellaActiva) vive acá como redirect en vez de en
 * el `<Tabs initialRouteName>` de `_layout.tsx` — ahí nunca se llegaba a
 * aplicar en un arranque en frío, quedaba siempre en Establecimientos.
 */
export default function IndiceApp() {
  const { sesion } = useSesionContext();
  if (!sesion) return null;
  return <Redirect href={sesion.huellaActiva ? '/(app)/home' : '/(app)/establecimientos'} />;
}

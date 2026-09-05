import { useMemo, useState } from 'react';
import { Modal, View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/db/database';
import { uuid } from '@/db/uuid';
import { useObservedQuery } from '@/db/useQuery';
import { useSesionContext } from '@/auth/SesionContext';
import { Producto } from '@/db/models/Producto';
import { MovimientoStock } from '@/db/models/MovimientoStock';
import { altaProductoOffline } from '@/db/altaProducto';
import { api } from '@/api/client';
import { puntuarMultiple } from '@/utils/fuzzy';
import { Colors, Radii, Shadows } from '@/constants/theme';
import { Field } from './Field';
import { Button } from './Button';
import { Alerta } from './Alerta';
import { EmptyState } from './EmptyState';

/**
 * Acceso rápido "Venta común" del Home: busca entre los productos de
 * Farmacia ya sincronizados en este dispositivo, cantidad + precio
 * (prellenado desde `producto.precio`, editable) y crea un
 * `movimientos_stock` tipo 'venta' offline — mismo comportamiento que
 * `VentaRapidaModal.tsx` de la web, adaptado a offline: el descuento real
 * de `stock` lo aplica el hook `afterCreate` del backend recién al
 * sincronizar (igual que ya pasa con los movimientos de Tropera), no acá.
 */
export function VentaRapida({ onCancelar, onCompletada }: { onCancelar: () => void; onCompletada: () => void }) {
  const { sesion } = useSesionContext();
  const productos = useObservedQuery(
    () =>
      database
        .get<Producto>('productos')
        .query(Q.where('organizacion_id', sesion?.organizacionId ?? '__none__'), Q.where('activo', true)),
    [sesion?.organizacionId],
  );

  const [query, setQuery] = useState('');
  const [producto, setProducto] = useState<Producto | null>(null);
  const [cantidad, setCantidad] = useState('1');
  const [precio, setPrecio] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [ok, setOk] = useState(false);

  // Opción secundaria del buscador: crear un producto que todavía no existe
  // en el catálogo — mismo patrón que crear un dueño/paciente nuevo sobre la
  // marcha en otros buscadores del mobile.
  const [modoCrear, setModoCrear] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [creandoProducto, setCreandoProducto] = useState(false);

  async function crearProducto() {
    if (!sesion || !nombreNuevo.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    setError(null);
    setCreandoProducto(true);
    try {
      const nuevo = await altaProductoOffline(sesion, nombreNuevo);
      setModoCrear(false);
      setNombreNuevo('');
      elegir(nuevo);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear el producto');
    } finally {
      setCreandoProducto(false);
    }
  }

  const resultados = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return productos
      .map((p) => ({ producto: p, score: puntuarMultiple(q, [p.nombre, p.categoria]) }))
      .filter((r) => r.score > 0)
      .sort((x, y) => y.score - x.score)
      .slice(0, 8);
  }, [query, productos]);

  function elegir(p: Producto) {
    setProducto(p);
    setPrecio(p.precio != null ? String(p.precio) : '');
  }

  async function confirmar() {
    if (!sesion || !producto) return;
    const n = Number(cantidad);
    if (!n || n <= 0) {
      setError('Cantidad inválida');
      return;
    }
    setError(null);
    setGuardando(true);
    try {
      await database.write(async () => {
        await database.get<MovimientoStock>('movimientos_stock').create((m) => {
          m._raw.id = uuid();
          m.organizacionId = sesion.organizacionId;
          m.productoId = producto.id;
          m.tipo = 'venta';
          m.cantidad = n;
          m.fecha = new Date().toISOString().slice(0, 10);
          m.observaciones = null;
          m.consultaId = null;
          m.usuarioId = null;
        });
        const precioNuevo = precio.trim() ? Number(precio) : null;
        if (precioNuevo != null && precioNuevo !== producto.precio) {
          await producto.update((p) => {
            p.precio = precioNuevo;
          });
        }
      });
      api.registrarEvento(sesion, 'accion', 'stock-venta');
      setOk(true);
      setTimeout(onCompletada, 700);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar la venta');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal visible animationType="slide" onRequestClose={onCancelar}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={styles.titulo}>Venta común</Text>
          <Pressable onPress={onCancelar} hitSlop={10}>
            <Text style={styles.cerrar}>Cerrar ✕</Text>
          </Pressable>
        </View>

        {ok ? (
          <Text style={styles.ok}>Venta registrada ✓</Text>
        ) : !producto ? (
          <View style={styles.contenido}>
            {modoCrear ? (
              <>
                <Field
                  label="Nombre del producto nuevo"
                  autoFocus
                  value={nombreNuevo}
                  onChangeText={setNombreNuevo}
                />
                {error && <Alerta mensaje={error} />}
                <View style={styles.accionesCrear}>
                  <View style={styles.accionesCrearItem}>
                    <Button
                      title="Volver a buscar"
                      variant="ghost"
                      onPress={() => setModoCrear(false)}
                      disabled={creandoProducto}
                    />
                  </View>
                  <View style={styles.accionesCrearItem}>
                    <Button
                      title={creandoProducto ? 'Creando…' : 'Crear y continuar'}
                      onPress={crearProducto}
                      disabled={creandoProducto}
                    />
                  </View>
                </View>
              </>
            ) : (
              <>
                <Field
                  label="Buscar producto"
                  autoFocus
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Nombre o categoría…"
                />
                {query.trim() && resultados.length === 0 && <EmptyState mensaje="Sin resultados." />}
                <FlatList
                  data={resultados}
                  keyExtractor={({ producto: p }) => p.id}
                  style={styles.lista}
                  renderItem={({ item: { producto: p } }) => (
                    <Pressable style={styles.resultado} onPress={() => elegir(p)}>
                      <Text style={styles.resultadoNombre}>{p.nombre}</Text>
                      <Text style={styles.resultadoSub}>
                        {p.categoria ?? '—'}
                        {p.precio != null ? ` · $${p.precio}` : ''}
                      </Text>
                    </Pressable>
                  )}
                />
                <Pressable
                  style={styles.linkCrear}
                  onPress={() => {
                    setNombreNuevo(query.trim());
                    setError(null);
                    setModoCrear(true);
                  }}
                >
                  <Text style={styles.cerrar}>＋ No aparece: crear producto nuevo</Text>
                </Pressable>
              </>
            )}
          </View>
        ) : (
          <View style={styles.contenido}>
            <Text style={styles.productoElegido}>
              Producto: <Text style={styles.productoElegidoNombre}>{producto.nombre}</Text>{' '}
              <Text style={styles.cambiar} onPress={() => setProducto(null)}>
                cambiar
              </Text>
            </Text>
            <Field label="Cantidad" value={cantidad} onChangeText={setCantidad} keyboardType="numeric" />
            <Field label="Precio unitario" value={precio} onChangeText={setPrecio} keyboardType="numeric" />

            {error && <Alerta mensaje={error} />}
            <View style={styles.boton}>
              <Button title={guardando ? 'Guardando…' : 'Confirmar venta'} onPress={confirmar} disabled={guardando} />
            </View>
            <Text style={styles.hint}>El stock puede tardar un momento en actualizarse.</Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  titulo: { fontSize: 18, fontWeight: '700', color: Colors.text },
  cerrar: { color: Colors.verdeDark, fontWeight: '600' },
  contenido: { flex: 1, padding: 16 },
  lista: { flex: 1, marginTop: 8 },
  linkCrear: { marginTop: 12, paddingVertical: 8 },
  accionesCrear: { flexDirection: 'row', gap: 10, marginTop: 16 },
  accionesCrearItem: { flex: 1 },
  resultado: {
    padding: 12,
    marginBottom: 8,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.card,
    ...Shadows.suave,
  },
  resultadoNombre: { fontSize: 15, fontWeight: '600', color: Colors.text },
  resultadoSub: { fontSize: 13, color: Colors.muted, marginTop: 2 },
  productoElegido: { fontSize: 14, color: Colors.muted },
  productoElegidoNombre: { fontWeight: '700', color: Colors.text },
  cambiar: { color: Colors.verdeDark, fontWeight: '600' },
  boton: { marginTop: 16 },
  hint: { color: Colors.muted, fontSize: 13, marginTop: 10 },
  ok: { color: Colors.verdeDark, fontSize: 15, padding: 16 },
});

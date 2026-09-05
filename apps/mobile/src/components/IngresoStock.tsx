import { useMemo, useState } from 'react';
import { Modal, View, Text, FlatList, Pressable, ScrollView, StyleSheet } from 'react-native';
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
 * Acceso rápido "Ingreso de stock" del Home: cubre el caso del viajante que
 * trae mercadería y hay que cargarla ahí mismo mientras la bajan del auto.
 * Mismo criterio que `components/IngresoStockForm.tsx` de la web (bultos ×
 * contenido por bulto para no hacer la cuenta a mano, precio de compra y de
 * venta) pero sin el egreso automático en Caja — acá no hay Caja offline
 * todavía, así que ese paso queda para cuando se sincronice y alguien lo
 * cargue a mano si hace falta.
 */
export function IngresoStock({ onCancelar, onCompletada }: { onCancelar: () => void; onCompletada: () => void }) {
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
  const [cantidad, setCantidad] = useState('');
  const [bultos, setBultos] = useState('');
  const [contenidoPorBulto, setContenidoPorBulto] = useState('');
  const [precioCompra, setPrecioCompra] = useState('');
  const [precioVenta, setPrecioVenta] = useState('');
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

  const totalCalculado = bultos && contenidoPorBulto ? Number(bultos) * Number(contenidoPorBulto) : null;

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
    setPrecioVenta(p.precio != null ? String(p.precio) : '');
    setPrecioCompra(p.precioCompra != null ? String(p.precioCompra) : '');
  }

  async function confirmar() {
    if (!sesion || !producto) return;
    const n = Number(cantidad);
    if (!n || n <= 0) {
      setError('Ingresá una cantidad mayor a 0');
      return;
    }
    if (!precioVenta.trim()) {
      setError('El precio de venta al cliente es obligatorio');
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
          m.tipo = 'compra';
          m.cantidad = n;
          m.fecha = new Date().toISOString().slice(0, 10);
          m.observaciones = null;
          m.consultaId = null;
          m.usuarioId = null;
        });
        await producto.update((p) => {
          p.precio = Number(precioVenta);
          if (precioCompra.trim()) p.precioCompra = Number(precioCompra);
        });
      });
      api.registrarEvento(sesion, 'accion', 'stock-ingreso');
      setOk(true);
      setTimeout(onCompletada, 700);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar el ingreso');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal visible animationType="slide" onRequestClose={onCancelar}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={styles.titulo}>Ingreso de stock</Text>
          <Pressable onPress={onCancelar} hitSlop={10}>
            <Text style={styles.cerrar}>Cerrar ✕</Text>
          </Pressable>
        </View>

        {ok ? (
          <Text style={styles.ok}>Ingreso registrado ✓</Text>
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
          <ScrollView style={styles.contenido}>
            <Text style={styles.productoElegido}>
              Producto: <Text style={styles.productoElegidoNombre}>{producto.nombre}</Text>{' '}
              <Text style={styles.cambiar} onPress={() => setProducto(null)}>
                cambiar
              </Text>
            </Text>

            <Field
              label={`Cantidad${producto.unidad ? ` (${producto.unidad})` : ''}`}
              value={cantidad}
              onChangeText={setCantidad}
              keyboardType="numeric"
            />

            <Text style={styles.subtitulo}>¿Entró en bultos? Calculá el total en vez de hacer la cuenta a mano</Text>
            <Field label="Bultos recibidos" value={bultos} onChangeText={setBultos} keyboardType="numeric" placeholder="Ej: 4" />
            <Field
              label={`Contenido por bulto${producto.unidad ? ` (${producto.unidad})` : ''}`}
              value={contenidoPorBulto}
              onChangeText={setContenidoPorBulto}
              keyboardType="numeric"
              placeholder="Ej: 25"
            />
            {totalCalculado !== null && (
              <Pressable onPress={() => setCantidad(String(totalCalculado))} style={styles.sugerencia}>
                <Text style={styles.sugerenciaTexto}>
                  Total: <Text style={styles.sugerenciaTotal}>{totalCalculado}{producto.unidad ? ` ${producto.unidad}` : ''}</Text>
                  {'  '}
                  <Text style={styles.link}>Usar esta cantidad</Text>
                </Text>
              </Pressable>
            )}

            <Field
              label={`Precio de compra al proveedor (opcional)${producto.unidad ? ` — por ${producto.unidad}` : ''}`}
              value={precioCompra}
              onChangeText={setPrecioCompra}
              keyboardType="numeric"
              placeholder="Ej: 1000"
            />
            <Field
              label={`Precio de venta al cliente${producto.unidad ? ` (por ${producto.unidad})` : ''}`}
              value={precioVenta}
              onChangeText={setPrecioVenta}
              keyboardType="numeric"
              placeholder="Ej: 1500"
            />

            {error && <Alerta mensaje={error} />}
            <View style={styles.boton}>
              <Button title={guardando ? 'Guardando…' : 'Registrar ingreso'} onPress={confirmar} disabled={guardando} />
            </View>
            <Text style={styles.hint}>El stock puede tardar un momento en actualizarse.</Text>
          </ScrollView>
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
  subtitulo: { fontSize: 13, color: Colors.muted, marginTop: 14, marginBottom: 2 },
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
  sugerencia: { marginTop: 6, padding: 10, backgroundColor: Colors.card, borderRadius: Radii.card },
  sugerenciaTexto: { fontSize: 13, color: Colors.muted },
  sugerenciaTotal: { fontWeight: '700', color: Colors.text },
  link: { color: Colors.verdeDark, fontWeight: '600' },
  boton: { marginTop: 16 },
  hint: { color: Colors.muted, fontSize: 13, marginTop: 10, marginBottom: 32 },
  ok: { color: Colors.verdeDark, fontSize: 15, padding: 16 },
});

import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSesionContext } from '@/auth/SesionContext';
import { tieneAlguno, ROLES_CLINICO, ROLES_CAJA, ROLES_TURNERO } from '@/nav/roles';
import { Colors } from '@/constants/theme';
import { api } from '@/api/client';
import { OperacionButton } from '@/components/OperacionButton';
import { SeleccionarAnimalModal } from '@/components/SeleccionarAnimalModal';
import { NuevoTurnoRapido } from '@/components/NuevoTurnoRapido';
import { VentaRapida } from '@/components/VentaRapida';
import { IngresoStock } from '@/components/IngresoStock';

type AccesoRapido = 'consulta' | 'vacuna' | 'venta' | 'turno' | 'ingreso' | null;

/**
 * Home ("Centro de operaciones") — pensado para que un veterinario sin
 * computadora resuelva el mostrador entero desde el celular. Mismo criterio
 * de accesos rápidos que `HuellaHomeSection.tsx` en la web: elegir/crear el
 * paciente primero, después el formulario específico — gateado por rol.
 * "Animales" (búsqueda/listado) no tiene gate propio, igual que la vieja
 * pestaña "Pacientes" que reemplaza — sólo depende de llegar al Home.
 */
export default function HomeScreen() {
  const { sesion } = useSesionContext();
  const router = useRouter();
  const [acceso, setAcceso] = useState<AccesoRapido>(null);

  if (!sesion) return null;

  const puedeClinico = tieneAlguno(sesion.roles, ROLES_CLINICO);
  const puedeVender = tieneAlguno(sesion.roles, ROLES_CAJA);
  const puedeAgendar = tieneAlguno(sesion.roles, ROLES_TURNERO);

  function seleccionoPaciente(animalId: string) {
    const seccion = acceso === 'consulta' ? 'consulta' : 'vacunacion';
    setAcceso(null);
    router.push(`/paciente/${animalId}?seccion=${seccion}`);
  }

  function abrirAcceso(a: Exclude<AccesoRapido, null>) {
    if (sesion) api.registrarEvento(sesion, 'accion', `home-${a}`);
    setAcceso(a);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home</Text>
      <Text style={styles.sub}>Centro de operaciones</Text>

      <View style={styles.grid}>
        <OperacionButton
          icono="🐾"
          titulo="Animales"
          subtitulo="Buscá en el listado de pacientes."
          onPress={() => {
            api.registrarEvento(sesion, 'accion', 'home-animales');
            router.push('/animales');
          }}
        />
        {puedeClinico && (
          <OperacionButton
            icono="🩺"
            titulo="Nueva consulta"
            subtitulo="Elegí (o creá) el paciente y cargá la consulta."
            onPress={() => abrirAcceso('consulta')}
          />
        )}
        {puedeClinico && (
          <OperacionButton
            icono="💉"
            titulo="Registro de vacuna"
            subtitulo="Elegí (o creá) el paciente y registrá la aplicación."
            onPress={() => abrirAcceso('vacuna')}
          />
        )}
        {puedeVender && (
          <OperacionButton
            icono="🛒"
            titulo="Venta común"
            subtitulo="Vendé un producto del stock de Farmacia."
            onPress={() => abrirAcceso('venta')}
          />
        )}
        {puedeClinico && (
          <OperacionButton
            icono="📦"
            titulo="Ingreso de stock"
            subtitulo="Cargá lo que trajo el proveedor mientras lo bajan."
            onPress={() => abrirAcceso('ingreso')}
          />
        )}
        {puedeAgendar && (
          <OperacionButton
            icono="📅"
            titulo="Nuevo turno"
            subtitulo="Elegí (o creá) el paciente y sacá el turno."
            onPress={() => abrirAcceso('turno')}
          />
        )}
      </View>

      {(acceso === 'consulta' || acceso === 'vacuna') && (
        <SeleccionarAnimalModal
          titulo={acceso === 'consulta' ? 'Nueva consulta — elegir paciente' : 'Registro de vacuna — elegir paciente'}
          subtitulo="Al elegir o crear el paciente, te lleva directo a su ficha con el formulario listo para completar."
          onCancelar={() => setAcceso(null)}
          onSeleccionar={seleccionoPaciente}
        />
      )}

      {acceso === 'venta' && <VentaRapida onCancelar={() => setAcceso(null)} onCompletada={() => setAcceso(null)} />}

      {acceso === 'ingreso' && <IngresoStock onCancelar={() => setAcceso(null)} onCompletada={() => setAcceso(null)} />}

      {acceso === 'turno' && <NuevoTurnoRapido onCancelar={() => setAcceso(null)} onCreado={() => setAcceso(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: Colors.bg },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text },
  sub: { fontSize: 14, color: Colors.muted, marginBottom: 14, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});
